import type { CipherItem, Organization, VaultContext } from '~/types/bitwarden'
import { decryptString } from '~/utils/crypto'
import { filterCiphers } from '~/utils/cipher-filter'

export function useVaultContext() {
  const { session, userKey, masterKey } = useBitwardenAuth()
  const vaultApi = useVaultApi()

  const organizations = useState<Organization[]>('bw-organizations', () => [])
  const ciphers = useState<CipherItem[]>('bw-ciphers', () => [])
  const folders = useState<Array<{ id: string, name: string }>>('bw-folders', () => [])
  const isSyncing = useState('bw-syncing', () => false)
  const syncError = useState<string | null>('bw-sync-error', () => null)
  const activeVaultId = useState<string | null>('bw-active-vault', () => null)
  const searchQuery = useState('bw-search', () => '')
  const typeFilter = useState<number | null>('bw-type-filter', () => null)

  const vaultContexts = computed<VaultContext[]>(() => {
    const personal: VaultContext = {
      id: null,
      name: 'My Vault',
      type: 'personal',
    }

    const orgs = organizations.value.map(org => ({
      id: org.id,
      name: org.name,
      type: 'organization' as const,
    }))

    return [personal, ...orgs]
  })

  const activeVault = computed(() =>
    vaultContexts.value.find(v => v.id === activeVaultId.value)
    ?? vaultContexts.value[0],
  )

  const filteredCiphers = computed(() =>
    filterCiphers(ciphers.value, {
      organizationId: activeVaultId.value,
      search: searchQuery.value,
      typeFilter: typeFilter.value,
    }),
  )

  const cipherCount = computed(() => filteredCiphers.value.length)

  async function decryptField(value: string | undefined): Promise<string | undefined> {
    if (!value) return value
    if (!value.startsWith('2.')) return value

    const key = userKey.value ?? masterKey.value
    if (!key) return undefined

    const decrypted = await decryptString(value, key)
    return decrypted ?? undefined
  }

  async function decryptCipher(raw: Record<string, unknown>): Promise<CipherItem | null> {
    const name = await decryptField(raw.name as string)
    if (!name) return null

    const notes = await decryptField(raw.notes as string | undefined)
    const loginRaw = raw.login as Record<string, unknown> | undefined

    let login: CipherItem['login']
    if (loginRaw) {
      login = {
        username: await decryptField(loginRaw.username as string | undefined),
        password: await decryptField(loginRaw.password as string | undefined),
        totp: await decryptField(loginRaw.totp as string | undefined),
        uris: loginRaw.uris as CipherItem['login'] extends infer L
          ? L extends { uris?: infer U } ? U : never
          : never,
      }

      if (login.uris?.length) {
        login.uris = await Promise.all(
          login.uris.map(async (uri) => ({
            ...uri,
            uri: uri.uri?.startsWith('2.')
              ? await decryptField(uri.uri)
              : uri.uri,
          })),
        )
      }
    }

    return {
      id: raw.id as string,
      type: raw.type as number,
      name,
      notes,
      favorite: Boolean(raw.favorite),
      organizationId: (raw.organizationId as string | null) ?? null,
      folderId: (raw.folderId as string | null) ?? null,
      collectionIds: raw.collectionIds as string[] | undefined,
      login,
      revisionDate: raw.revisionDate as string,
    }
  }

  async function processSyncData(data: {
    profile?: Record<string, unknown>
    organizations?: Array<Record<string, unknown>>
    ciphers?: Array<Record<string, unknown>>
    folders?: Array<Record<string, unknown>>
  }) {
    if (data.profile && session.value) {
      session.value.profile = {
        id: data.profile.id as string,
        email: data.profile.email as string,
        name: data.profile.name as string | undefined,
      }
    }

    const decryptedOrgs: Organization[] = []
    for (const org of data.organizations ?? []) {
      const name = await decryptField(org.name as string)
      if (name) {
        decryptedOrgs.push({
          id: org.id as string,
          name,
          identifier: (org.identifier as string) || name,
          status: org.status as number,
        })
      }
    }
    organizations.value = decryptedOrgs

    const decryptedCiphers: CipherItem[] = []
    for (const cipher of data.ciphers ?? []) {
      const decrypted = await decryptCipher(cipher)
      if (decrypted) decryptedCiphers.push(decrypted)
    }
    ciphers.value = decryptedCiphers

    const decryptedFolders: Array<{ id: string, name: string }> = []
    for (const folder of data.folders ?? []) {
      const name = await decryptField(folder.name as string)
      if (name) {
        decryptedFolders.push({ id: folder.id as string, name })
      }
    }
    folders.value = decryptedFolders
  }

  async function syncVault() {
    if (!session.value?.accessToken) return

    isSyncing.value = true
    syncError.value = null

    try {
      const payload = vaultApi.authPayload()
      const result = await $fetch<{
        success: boolean
        data: {
          profile?: Record<string, unknown>
          organizations?: Array<Record<string, unknown>>
          ciphers?: Array<Record<string, unknown>>
          folders?: Array<Record<string, unknown>>
        }
      }>('/api/vault/sync', {
        method: 'POST',
        body: payload,
        headers: { Authorization: `Bearer ${payload.accessToken}` },
      })

      vaultApi.lastSync.value = new Date().toISOString()
      await processSyncData(result.data)
    }
    catch (err: unknown) {
      syncError.value = err instanceof Error ? err.message : 'Failed to sync vault'
      throw err
    }
    finally {
      isSyncing.value = false
    }
  }

  function selectVault(vaultId: string | null) {
    activeVaultId.value = vaultId
  }

  function clearDecryptedData() {
    ciphers.value = []
    organizations.value = []
    folders.value = []
    syncError.value = null
  }

  return {
    organizations,
    ciphers,
    folders,
    isSyncing,
    syncError,
    activeVaultId,
    activeVault,
    vaultContexts,
    searchQuery,
    typeFilter,
    filteredCiphers,
    cipherCount,
    syncVault,
    selectVault,
    clearDecryptedData,
  }
}
