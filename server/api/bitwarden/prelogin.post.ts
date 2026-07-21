import { getServerConfigFromBody, bitwardenFetch } from '../../utils/bitwarden'
import { classifyFetchError, throwBitwardenError } from '../../utils/errors'

/**
 * Official Bitwarden hosts prelogin on the identity service.
 * Vaultwarden also accepts it on /api — try identity first, then api.
 */
async function fetchPrelogin(apiUrl: string, identityUrl: string, email: string) {
  const body = JSON.stringify({ email })
  const urls = [
    `${identityUrl}/accounts/prelogin`,
    `${apiUrl}/accounts/prelogin`,
  ]

  let lastError = ''
  let lastStatus = 502

  for (const url of urls) {
    const response = await bitwardenFetch(url, {
      method: 'POST',
      body,
    })

    if (response.ok) {
      return response.json()
    }

    lastStatus = response.status
    lastError = await response.text()

    // Try the next candidate on 404; other errors are definitive.
    if (response.status !== 404) {
      break
    }
  }

  throwBitwardenError(lastStatus, {
    code: 'prelogin_failed',
    message: lastError || 'Prelogin failed. Check your server address and email.',
    cause: lastError,
  })
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string, preset?: string, selfHostUrl?: string }>(event)

  if (!body.email?.trim()) {
    throwBitwardenError(400, {
      code: 'prelogin_failed',
      message: 'Email is required.',
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

  try {
    const data = await fetchPrelogin(server.apiUrl, server.identityUrl, body.email.trim())
    return {
      kdf: data.kdf,
      kdfIterations: data.kdfIterations,
      kdfMemory: data.kdfMemory,
      kdfParallelism: data.kdfParallelism,
      server,
    }
  }
  catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err
    }
    const details = classifyFetchError(err)
    throwBitwardenError(502, {
      code: 'prelogin_failed',
      message: details.message,
      cause: details.cause,
    })
  }
})
