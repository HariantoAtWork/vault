import { getServerConfigFromBody } from '#shared/utils/servers'
import { bitwardenFetch } from '../../../utils/bitwarden'
import { classifyFetchError, throwBitwardenError } from '../../../utils/errors'

/**
 * Triggers Bitwarden/Vaultwarden to email a login 2FA code.
 * Proxies POST {apiUrl}/two-factor/send-email-login
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email: string
    masterPasswordHash: string
    deviceIdentifier?: string
    preset?: string
    selfHostUrl?: string
    ssoEmail2FaSessionToken?: string
  }>(event)

  if (!body.email?.trim() || !body.masterPasswordHash) {
    throwBitwardenError(400, {
      code: 'auth_failed',
      message: 'Email and master password hash are required to send a two-factor email.',
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

  const email = body.email.trim()
  const payload: Record<string, string> = {
    email,
    masterPasswordHash: body.masterPasswordHash,
    // Vaultwarden historically required this; official Bitwarden tolerates it.
    deviceIdentifier: body.deviceIdentifier || crypto.randomUUID(),
  }

  if (body.ssoEmail2FaSessionToken) {
    payload.ssoEmail2FaSessionToken = body.ssoEmail2FaSessionToken
  }

  try {
    const response = await bitwardenFetch(`${server.apiUrl}/two-factor/send-email-login`, {
      method: 'POST',
      email,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      let message = 'Could not send the two-factor email.'
      try {
        const data = JSON.parse(text) as { message?: string, Message?: string, error_description?: string }
        message = data.message || data.Message || data.error_description || message
      }
      catch {
        if (text) message = text
      }

      throwBitwardenError(response.status, {
        code: 'auth_failed',
        message,
        cause: text,
      })
    }

    return { ok: true, message: 'Two-factor email sent.' }
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
