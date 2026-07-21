import { readVaultContext, bitwardenFetch } from '../../../../utils/bitwarden'
import { vaultSuccess } from '../../../../services/bitwarden/vault-response'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing folder id' })
  }

  const body = await readBody<{
    accessToken?: string
    preset?: string
    selfHostUrl?: string
    apiUrl?: string
    identityUrl?: string
  }>(event)

  const ctx = readVaultContext(event, body)

  const response = await bitwardenFetch(`${ctx.server.apiUrl}/folders/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw createError({ statusCode: response.status, statusMessage: error || 'Failed to delete folder' })
  }

  return vaultSuccess({ id })
})
