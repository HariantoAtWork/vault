import { readVaultContext } from '../../../../utils/bitwarden'
import { fetchCipher, extractCipherField } from '../../../../utils/vault-sync'
import { vaultString } from '../../../../services/bitwarden/vault-response'

const VALID_FIELDS = ['username', 'password', 'uri', 'totp', 'notes'] as const

export default defineEventHandler(async (event) => {
  const field = getRouterParam(event, 'field')
  const id = getRouterParam(event, 'id')

  if (!field || !id || !VALID_FIELDS.includes(field as typeof VALID_FIELDS[number])) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid field' })
  }

  const query = getQuery(event)
  const body = await readBody<{
    accessToken?: string
    preset?: string
    selfHostUrl?: string
    apiUrl?: string
    identityUrl?: string
  }>(event).catch(() => ({}))

  const ctx = readVaultContext(event, {
    ...body,
    preset: (body.preset ?? query.preset) as string,
    selfHostUrl: (body.selfHostUrl ?? query.selfHostUrl) as string,
    apiUrl: (body.apiUrl ?? query.apiUrl) as string,
    identityUrl: (body.identityUrl ?? query.identityUrl) as string,
  })

  const cipher = await fetchCipher(ctx, id)
  const value = extractCipherField(cipher, field as typeof VALID_FIELDS[number])

  return vaultString(value)
})
