import type {
  BwVaultFolder,
  BwVaultItem,
  BwVaultResponse,
  BwVaultStatus,
  BwVaultString,
  VaultSessionPayload,
} from '~/types/vault-management-api'

function buildSessionPayload(session: {
  accessToken: string
  server: {
    preset: string
    apiUrl: string
    identityUrl: string
    label: string
  }
}): VaultSessionPayload {
  return {
    accessToken: session.accessToken,
    preset: session.server.preset,
    apiUrl: session.server.apiUrl,
    identityUrl: session.server.identityUrl,
    selfHostUrl: session.server.preset === 'self' ? session.server.label : undefined,
  }
}

export function useVaultApi() {
  const { session } = useBitwardenAuth()
  const lastSync = useState<string | null>('bw-last-sync', () => null)

  function requireSession() {
    if (!session.value?.accessToken) {
      throw new Error('Vault is locked')
    }
    return session.value
  }

  function authPayload() {
    return buildSessionPayload(requireSession())
  }

  async function getStatus() {
    const current = requireSession()
    return $fetch<BwVaultResponse<{ object: string, template: BwVaultStatus['template'] }>>('/api/vault/status', {
      method: 'GET',
      headers: { Authorization: `Bearer ${current.accessToken}` },
      query: {
        ...authPayload(),
        email: current.email,
        lastSync: lastSync.value,
        userId: current.profile?.id,
        status: 'unlocked',
      },
    })
  }

  async function sync() {
    const payload = authPayload()
    const result = await $fetch<BwVaultResponse<{ title: string }>>('/api/vault/sync', {
      method: 'POST',
      body: payload,
      headers: { Authorization: `Bearer ${payload.accessToken}` },
    })
    lastSync.value = new Date().toISOString()
    return result
  }

  async function listItems(query: Record<string, string | undefined> = {}) {
    const payload = authPayload()
    return $fetch<BwVaultResponse<{ object: 'list', data: BwVaultItem[] }>>('/api/vault/list/object/items', {
      method: 'GET',
      headers: { Authorization: `Bearer ${payload.accessToken}` },
      query: { ...payload, ...query },
    })
  }

  async function listFolders() {
    const payload = authPayload()
    return $fetch<BwVaultResponse<{ object: 'list', data: BwVaultFolder[] }>>('/api/vault/list/object/folders', {
      method: 'GET',
      headers: { Authorization: `Bearer ${payload.accessToken}` },
      query: payload,
    })
  }

  async function getField(id: string, field: 'username' | 'password' | 'uri' | 'totp' | 'notes') {
    const payload = authPayload()
    const result = await $fetch<BwVaultResponse<BwVaultString>>(`/api/vault/object/${field}/${id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${payload.accessToken}` },
      query: payload,
    })
    return result.data.data
  }

  async function generatePassword(options: {
    length?: number
    passphrase?: boolean
    words?: number
    special?: boolean
  } = {}) {
    return $fetch<BwVaultResponse<BwVaultString>>('/api/vault/generate', {
      query: {
        length: options.length ?? 14,
        passphrase: options.passphrase ? 'true' : undefined,
        words: options.words ?? 6,
        special: options.special ? 'true' : undefined,
      },
    })
  }

  async function createItem(item: Record<string, unknown>) {
    const payload = authPayload()
    return $fetch(`/api/vault/object/item`, {
      method: 'POST',
      body: { ...payload, ...item },
      headers: { Authorization: `Bearer ${payload.accessToken}` },
    })
  }

  async function updateItem(id: string, item: Record<string, unknown>) {
    const payload = authPayload()
    return $fetch(`/api/vault/object/item/${id}`, {
      method: 'PUT',
      body: { ...payload, ...item },
      headers: { Authorization: `Bearer ${payload.accessToken}` },
    })
  }

  async function deleteItem(id: string) {
    const payload = authPayload()
    return $fetch(`/api/vault/object/item/${id}`, {
      method: 'DELETE',
      body: payload,
      headers: { Authorization: `Bearer ${payload.accessToken}` },
    })
  }

  async function createFolder(folder: Record<string, unknown>) {
    const payload = authPayload()
    return $fetch(`/api/vault/object/folder`, {
      method: 'POST',
      body: { ...payload, ...folder },
      headers: { Authorization: `Bearer ${payload.accessToken}` },
    })
  }

  return {
    lastSync,
    getStatus,
    sync,
    listItems,
    listFolders,
    getField,
    generatePassword,
    createItem,
    updateItem,
    deleteItem,
    createFolder,
    authPayload,
  }
}
