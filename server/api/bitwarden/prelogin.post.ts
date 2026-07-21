import { getServerConfigFromBody, bitwardenFetch } from '../../utils/bitwarden'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string, preset?: string, selfHostUrl?: string }>(event)
  const server = getServerConfigFromBody(body)

  const response = await bitwardenFetch(`${server.apiUrl}/accounts/prelogin`, {
    method: 'POST',
    body: JSON.stringify({ email: body.email }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw createError({
      statusCode: response.status,
      statusMessage: error || 'Prelogin failed',
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
})
