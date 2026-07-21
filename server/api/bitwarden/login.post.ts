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

  const params = new URLSearchParams({
    grant_type: 'password',
    scope: 'api offline_access',
    client_id: 'web',
    username: body.email,
    password: body.masterPasswordHash,
    device_type: '9',
    device_identifier: deviceId,
    device_name: deviceName,
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

    const data = await response.json()

    if (!response.ok) {
      throwBitwardenError(response.status, {
        code: 'auth_failed',
        message: data.error_description || data.error || 'Login failed. Check your email and master password.',
        cause: JSON.stringify(data),
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
