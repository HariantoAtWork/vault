import { readVaultContext } from '../../utils/bitwarden'
import { fetchSyncData } from '../../utils/vault-sync'
import { vaultSuccess } from '../../services/bitwarden/vault-response'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    accessToken?: string
    preset?: string
    selfHostUrl?: string
    apiUrl?: string
    identityUrl?: string
    force?: boolean
  }>(event)

  const ctx = readVaultContext(event, body)
  const data = await fetchSyncData(ctx)

  return vaultSuccess({
    ...data,
    message: {
      noColor: false,
      object: 'message',
      title: 'Syncing complete.',
      message: null,
    },
  })
})
