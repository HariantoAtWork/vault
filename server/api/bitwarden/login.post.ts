import { getServerConfigFromBody, bitwardenFetch } from '../../utils/bitwarden'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email: string
    masterPasswordHash: string
    preset?: string
    selfHostUrl?: string
    deviceIdentifier?: string
    deviceName?: string
  }>(event)

  const server = getServerConfigFromBody(body)
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
    throw createError({
      statusCode: response.status,
      statusMessage: data.error_description || data.error || 'Login failed',
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
})
