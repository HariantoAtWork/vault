import { getServerConfigFromBody, bitwardenFetch } from '../../utils/bitwarden'
import { classifyFetchError, throwBitwardenError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email: string
    masterPasswordHash: string
    preset?: string
    selfHostUrl?: string
    deviceIdentifier?: string
    deviceName?: string
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

  // Bitwarden Identity expects camelCase device fields (not snake_case).
  const params = new URLSearchParams({
    grant_type: 'password',
    scope: 'api offline_access',
    client_id: 'web',
    username: body.email.trim(),
    password: body.masterPasswordHash,
    deviceType: '9',
    deviceIdentifier: deviceId,
    deviceName,
  })

  try {
    const response = await bitwardenFetch(`${server.identityUrl}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
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
