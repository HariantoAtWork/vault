import { readVaultContext } from '../../../../utils/bitwarden'
import { fetchSyncData } from '../../../../utils/vault-sync'
import { vaultList } from '../../../../services/bitwarden/vault-response'

export default defineEventHandler(async (event) => {
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

  const sync = await fetchSyncData(ctx)
  return vaultList(sync.folders ?? [])
})
