import { readVaultContext } from '../../utils/bitwarden'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const body = await readBody<{
    accessToken?: string
    preset?: string
    selfHostUrl?: string
    apiUrl?: string
    identityUrl?: string
    email?: string
    lastSync?: string
    userId?: string
    status?: string
  }>(event).catch(() => ({}))

  const ctx = readVaultContext(event, {
    ...body,
    preset: (body.preset ?? query.preset) as string,
    selfHostUrl: (body.selfHostUrl ?? query.selfHostUrl) as string,
    apiUrl: (body.apiUrl ?? query.apiUrl) as string,
    identityUrl: (body.identityUrl ?? query.identityUrl) as string,
  })

  const serverUrl = ctx.server.preset === 'self'
    ? ctx.server.apiUrl.replace(/\/api\/?$/, '')
    : `https://${ctx.server.label}`

  return {
    success: true,
    data: {
      object: 'template',
      template: {
        serverUrl,
        lastSync: body.lastSync ?? null,
        userEmail: body.email ?? null,
        userId: body.userId ?? null,
        status: body.status ?? 'unlocked',
      },
    },
  }
})
