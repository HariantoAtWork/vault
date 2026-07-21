import { bitwardenFetch, readServerFromRequest } from './bitwarden'

interface OrgTokenCache {
  token: string
  expiresAt: number
}

const tokenCache = new Map<string, OrgTokenCache>()

export async function getOrgAccessToken(options: {
  clientId: string
  clientSecret: string
  preset?: string
  selfHostUrl?: string
  apiUrl?: string
  identityUrl?: string
}): Promise<string> {
  const server = readServerFromRequest(options)
  const cacheKey = `${server.identityUrl}:${options.clientId}`
  const cached = tokenCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.token
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'api.organization',
    client_id: options.clientId,
    client_secret: options.clientSecret,
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
      statusMessage: data.error_description || data.error || 'Organisation API authentication failed',
    })
  }

  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  })

  return data.access_token
}

export async function orgPublicFetch(
  path: string,
  options: {
    clientId: string
    clientSecret: string
    preset?: string
    selfHostUrl?: string
    apiUrl?: string
    identityUrl?: string
    method?: string
    body?: unknown
    query?: Record<string, string | undefined>
  },
) {
  const server = readServerFromRequest(options)
  const token = await getOrgAccessToken(options)

  const searchParams = new URLSearchParams()
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) searchParams.set(key, value)
    }
  }

  const qs = searchParams.toString()
  const url = `${server.apiUrl}${path}${qs ? `?${qs}` : ''}`

  const response = await bitwardenFetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const text = await response.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  }
  catch {
    data = text
  }

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: typeof data === 'object' && data && 'message' in data
        ? String((data as { message: string }).message)
        : text || 'Organisation API request failed',
    })
  }

  return data
}
