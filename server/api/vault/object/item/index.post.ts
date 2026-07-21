import { readVaultContext, bitwardenFetch } from '../../../../utils/bitwarden'
import { vaultSuccess } from '../../../../services/bitwarden/vault-response'

export default defineEventHandler(async (event) => {
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

  const response = await bitwardenFetch(`${ctx.server.apiUrl}/ciphers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
    },
    body: JSON.stringify(cipherBody),
  })

  if (!response.ok) {
    const error = await response.text()
    throw createError({ statusCode: response.status, statusMessage: error || 'Failed to create item' })
  }

  const data = await response.json()
  return vaultSuccess(data)
})
