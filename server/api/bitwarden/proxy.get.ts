import { getServerConfigFromBody, bitwardenFetch } from '../../utils/bitwarden'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const server = getServerConfigFromBody({
    preset: query.preset as string,
    selfHostUrl: query.selfHostUrl as string,
    apiUrl: query.apiUrl as string,
    identityUrl: query.identityUrl as string,
  })

  const headers: Record<string, string> = {}
  const auth = getHeader(event, 'authorization')
  if (auth) headers.Authorization = auth

  const path = (query.path as string) || ''
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (!['preset', 'selfHostUrl', 'apiUrl', 'identityUrl', 'path'].includes(key) && value) {
      searchParams.set(key, String(value))
    }
  }

  const qs = searchParams.toString()
  const url = `${server.apiUrl}${path}${qs ? `?${qs}` : ''}`

  const response = await bitwardenFetch(url, { headers })
  const text = await response.text()

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: text || 'Request failed',
    })
  }

  try {
    return JSON.parse(text)
  }
  catch {
    return text
  }
})
