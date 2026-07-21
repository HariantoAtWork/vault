import { getServerConfigFromBody } from '#shared/utils/servers'
import { bitwardenFetch } from '../../utils/bitwarden'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    accessToken: string
    preset?: string
    selfHostUrl?: string
    apiUrl?: string
  }>(event)

  const server = getServerConfigFromBody(body)

  const response = await bitwardenFetch(`${server.apiUrl}/sync`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${body.accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw createError({
      statusCode: response.status,
      statusMessage: error || 'Sync failed',
    })
  }

  return response.json()
})
