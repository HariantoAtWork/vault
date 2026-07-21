import { orgPublicFetch } from '../../utils/org-auth'

function resolveOrgPath(segments: string[]): string {
  const [resource, id, action] = segments

  if (resource === 'members') {
    if (!id) return '/public/members'
    if (action === 'reinvite') return `/public/members/${id}/reinvite`
    if (action === 'revoke') return `/public/members/${id}/revoke`
    if (action === 'restore') return `/public/members/${id}/restore`
    if (action === 'group-ids') return `/public/members/${id}/group-ids`
    return `/public/members/${id}`
  }

  if (resource === 'collections') {
    return id ? `/public/collections/${id}` : '/public/collections'
  }

  if (resource === 'groups') {
    if (id && action === 'member-ids') return `/public/groups/${id}/member-ids`
    return id ? `/public/groups/${id}` : '/public/groups'
  }

  if (resource === 'events') return '/public/events'
  if (resource === 'policies') return id ? `/public/policies/${id}` : '/public/policies'

  throw createError({ statusCode: 404, statusMessage: `Unknown org route: ${segments.join('/')}` })
}

export default defineEventHandler(async (event) => {
  const method = event.method
  const pathParam = getRouterParam(event, 'path')
  const segments = pathParam ? pathParam.split('/').filter(Boolean) : []

  if (!segments.length) {
    throw createError({ statusCode: 404, statusMessage: 'Organisation API path required' })
  }

  const apiPath = resolveOrgPath(segments)
  const body = method === 'GET' ? {} : await readBody(event)
  const query = getQuery(event) as Record<string, string | undefined>

  const clientId = String((body as Record<string, unknown>).clientId ?? query.clientId ?? '')
  const clientSecret = String((body as Record<string, unknown>).clientSecret ?? query.clientSecret ?? '')

  if (!clientId || !clientSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Organisation API credentials required' })
  }

  const { clientId: _c, clientSecret: _s, preset, selfHostUrl, apiUrl, identityUrl, ...requestBody } = body as Record<string, unknown>

  return orgPublicFetch(apiPath, {
    clientId,
    clientSecret,
    preset: String(preset ?? query.preset ?? 'us'),
    selfHostUrl: String(selfHostUrl ?? query.selfHostUrl ?? ''),
    apiUrl: apiUrl ? String(apiUrl) : query.apiUrl ? String(query.apiUrl) : undefined,
    identityUrl: identityUrl ? String(identityUrl) : query.identityUrl ? String(query.identityUrl) : undefined,
    method,
    body: method === 'GET' ? undefined : requestBody,
    query: method === 'GET' ? query : undefined,
  })
})
