import { getServerConfigFromBody, bitwardenFetch } from '../../utils/bitwarden'
import { classifyFetchError, throwBitwardenError } from '../../utils/errors'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string, preset?: string, selfHostUrl?: string }>(event)

  let server
  try {
    server = getServerConfigFromBody(body)
  }
  catch (err) {
    const details = classifyFetchError(err)
    throwBitwardenError(400, details)
  }

  try {
    const response = await bitwardenFetch(`${server.apiUrl}/accounts/prelogin`, {
      method: 'POST',
      body: JSON.stringify({ email: body.email }),
    })

    if (!response.ok) {
      const error = await response.text()
      throwBitwardenError(response.status, {
        code: 'prelogin_failed',
        message: error || 'Prelogin failed. Check your server address and email.',
        cause: error,
      })
    }

    const data = await response.json()
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
