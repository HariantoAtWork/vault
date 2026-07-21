import { bitwardenFetch, type VaultRequestContext } from './bitwarden'

export async function fetchSyncData(ctx: VaultRequestContext) {
  const response = await bitwardenFetch(`${ctx.server.apiUrl}/sync`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw createError({
      statusCode: response.status,
      statusMessage: error || 'Sync failed',
    })
  }

  return response.json() as Promise<{
    profile?: Record<string, unknown>
    folders?: Array<Record<string, unknown>>
    ciphers?: Array<Record<string, unknown>>
    organizations?: Array<Record<string, unknown>>
    collections?: Array<Record<string, unknown>>
  }>
}

export async function fetchCipher(ctx: VaultRequestContext, id: string) {
  const response = await bitwardenFetch(`${ctx.server.apiUrl}/ciphers/${id}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
    },
  })

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: 'Item not found',
    })
  }

  return response.json() as Promise<Record<string, unknown>>
}

export function filterCiphers(
  ciphers: Array<Record<string, unknown>>,
  query: Record<string, unknown>,
) {
  let result = [...ciphers]

  if (query.organizationId) {
    result = result.filter(c => c.organizationId === query.organizationId)
  }

  if (query.folderid) {
    result = result.filter(c => c.folderId === query.folderid)
  }

  if (query.search) {
    const term = String(query.search).toLowerCase()
    result = result.filter(c => String(c.name ?? '').toLowerCase().includes(term))
  }

  if (query.trash !== undefined) {
    result = result.filter(c => Boolean(c.deletedDate))
  }
  else {
    result = result.filter(c => !c.deletedDate)
  }

  return result
}

export function extractCipherField(
  cipher: Record<string, unknown>,
  field: 'username' | 'password' | 'uri' | 'totp' | 'notes',
): string {
  if (field === 'notes') {
    return String(cipher.notes ?? '')
  }

  const login = cipher.login as Record<string, unknown> | undefined
  if (!login) {
    throw createError({ statusCode: 404, statusMessage: 'Field not found on this item' })
  }

  if (field === 'username') {
    return String(login.username ?? '')
  }

  if (field === 'password') {
    return String(login.password ?? '')
  }

  if (field === 'totp') {
    return String(login.totp ?? '')
  }

  if (field === 'uri') {
    const uris = login.uris as Array<{ uri?: string }> | undefined
    return String(uris?.[0]?.uri ?? '')
  }

  throw createError({ statusCode: 400, statusMessage: 'Unknown field' })
}
