import { readVaultContext, bitwardenFetch } from '../../../../utils/bitwarden'
import { vaultSuccess } from '../../../../services/bitwarden/vault-response'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing item id' })
  }

  const body = await readBody<{
    accessToken?: string
    preset?: string
    selfHostUrl?: string
    apiUrl?: string
    identityUrl?: string
    [key: string]: unknown
  }>(event)

  const ctx = readVaultContext(event, body)
  const { accessToken, preset, selfHostUrl, apiUrl, identityUrl, ...cipherBody } = body

  const response = await bitwardenFetch(`${ctx.server.apiUrl}/ciphers/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
    },
    body: JSON.stringify(cipherBody),
  })

  if (!response.ok) {
    const error = await response.text()
    throw createError({ statusCode: response.status, statusMessage: error || 'Failed to update item' })
  }

  const data = await response.json()
  return vaultSuccess(data)
})
