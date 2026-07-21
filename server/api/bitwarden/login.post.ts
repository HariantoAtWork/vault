import { getServerConfigFromBody } from '#shared/utils/servers'
import { bitwardenFetch } from '../../utils/bitwarden'
import { classifyFetchError, throwBitwardenError } from '../../utils/errors'
import { BITWARDEN_DEVICE_TYPE } from '../../utils/client-headers'

export interface TwoFactorChallenge {
  twoFactorRequired: true
  twoFactorProviders: number[]
  twoFactorProviders2: Record<string, Record<string, string>>
  email?: string
}

function isTwoFactorRequired(data: Record<string, unknown>): boolean {
  const description = String(data.error_description || data.message || '').toLowerCase()
  const hasProviders = Array.isArray(data.TwoFactorProviders) || Boolean(data.TwoFactorProviders2)
  return hasProviders || description.includes('two factor')
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email: string
    masterPasswordHash: string
    preset?: string
    selfHostUrl?: string
    deviceIdentifier?: string
    deviceName?: string
    twoFactorToken?: string
    twoFactorProvider?: number
    twoFactorRemember?: boolean
  }>(event)

  if (!body.email?.trim() || !body.masterPasswordHash) {
    throwBitwardenError(400, {
      code: 'auth_failed',
      message: 'Email and master password hash are required.',
    })
  }

  let server
  try {
    server = getServerConfigFromBody(body)
  }
  catch (err) {
    const details = classifyFetchError(err)
    throwBitwardenError(400, details)
  }

  const deviceId = body.deviceIdentifier || crypto.randomUUID()
  const deviceName = body.deviceName || 'Vault Web'
  const email = body.email.trim()

  const params = new URLSearchParams({
    grant_type: 'password',
    scope: 'api offline_access',
    client_id: 'web',
    username: email,
    password: body.masterPasswordHash,
    deviceType: BITWARDEN_DEVICE_TYPE,
    deviceIdentifier: deviceId,
    deviceName,
  })

  if (body.twoFactorToken && body.twoFactorProvider != null) {
    params.set('twoFactorToken', body.twoFactorToken)
    params.set('twoFactorProvider', String(body.twoFactorProvider))
    params.set('twoFactorRemember', body.twoFactorRemember ? '1' : '0')
  }

  try {
    const response = await bitwardenFetch(`${server.identityUrl}/connect/token`, {
      method: 'POST',
      email,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        Accept: 'application/json',
      },
      body: params.toString(),
    })

    const text = await response.text()
    let data: Record<string, unknown>
    try {
      data = text ? JSON.parse(text) as Record<string, unknown> : {}
    }
    catch {
      data = { error: text }
    }

    if (!response.ok) {
      if (isTwoFactorRequired(data)) {
        const providersRaw = data.TwoFactorProviders
        const providers2 = (data.TwoFactorProviders2 as Record<string, Record<string, string>>) || {}
        const providers = Array.isArray(providersRaw)
          ? providersRaw.map(Number)
          : Object.keys(providers2).map(Number)

        setResponseStatus(event, 400)
        return {
          twoFactorRequired: true,
          twoFactorProviders: providers,
          twoFactorProviders2: providers2,
          email: (data.Email as string) || email,
        } satisfies TwoFactorChallenge
      }

      const errorModel = data.ErrorModel as { Message?: string } | undefined
      const description = String(
        data.error_description
        || errorModel?.Message
        || data.message
        || data.error
        || 'Login failed. Check your email and master password.',
      )

      throwBitwardenError(response.status, {
        code: 'auth_failed',
        message: description,
        cause: text,
      })
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      key: data.Key,
      privateKey: data.PrivateKey,
      server,
      deviceIdentifier: deviceId,
    }
  }
  catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err
    }
    const details = classifyFetchError(err)
    throwBitwardenError(502, {
      code: 'auth_failed',
      message: details.message,
      cause: details.cause,
    })
  }
})
