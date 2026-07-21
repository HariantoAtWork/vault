import type { OrgApiCredentials, OrgApiRequestPayload, PublicListResponse, PublicMember } from '~/types/public-api'

const ORG_CREDS_KEY = 'bw-org-api-credentials'

export function useOrgApi() {
  const { serverPreset, selfHostUrl, serverConfig } = useBitwardenAuth()
  const credentials = useState<OrgApiCredentials[]>('bw-org-credentials', () => [])

  function restoreCredentials() {
    if (!import.meta.client) return
    const raw = localStorage.getItem(ORG_CREDS_KEY)
    if (raw) {
      try {
        credentials.value = JSON.parse(raw) as OrgApiCredentials[]
      }
      catch {
        localStorage.removeItem(ORG_CREDS_KEY)
      }
    }
  }

  function saveCredentials(creds: OrgApiCredentials[]) {
    credentials.value = creds
    if (import.meta.client) {
      localStorage.setItem(ORG_CREDS_KEY, JSON.stringify(creds))
    }
  }

  function addCredentials(cred: OrgApiCredentials) {
    const next = [...credentials.value.filter(c => c.clientId !== cred.clientId), cred]
    saveCredentials(next)
  }

  function removeCredentials(clientId: string) {
    saveCredentials(credentials.value.filter(c => c.clientId !== clientId))
  }

  function basePayload(cred: OrgApiCredentials): OrgApiRequestPayload {
    return {
      clientId: cred.clientId,
      clientSecret: cred.clientSecret,
      preset: serverPreset.value,
      selfHostUrl: selfHostUrl.value,
      apiUrl: serverConfig.value.apiUrl,
      identityUrl: serverConfig.value.identityUrl,
    }
  }

  async function fetchOrg<T>(path: string, cred: OrgApiCredentials, options: {
    method?: string
    body?: Record<string, unknown>
    query?: Record<string, string | undefined>
  } = {}) {
    return $fetch<T>(`/api/org/${path}`, {
      method: (options.method ?? 'GET') as 'GET' | 'POST' | 'PUT' | 'DELETE',
      query: options.method === 'GET' ? { ...basePayload(cred), ...options.query } : undefined,
      body: options.method !== 'GET' ? { ...basePayload(cred), ...options.body } : undefined,
    })
  }

  async function listMembers(cred: OrgApiCredentials) {
    return fetchOrg<PublicListResponse<PublicMember>>('members', cred)
  }

  async function listCollections(cred: OrgApiCredentials) {
    return fetchOrg<PublicListResponse<Record<string, unknown>>>('collections', cred)
  }

  async function listGroups(cred: OrgApiCredentials) {
    return fetchOrg<PublicListResponse<Record<string, unknown>>>('groups', cred)
  }

  async function listEvents(cred: OrgApiCredentials, query?: Record<string, string | undefined>) {
    return fetchOrg<PublicListResponse<Record<string, unknown>>>('events', cred, { query })
  }

  async function listPolicies(cred: OrgApiCredentials) {
    return fetchOrg<PublicListResponse<Record<string, unknown>>>('policies', cred)
  }

  return {
    credentials,
    restoreCredentials,
    saveCredentials,
    addCredentials,
    removeCredentials,
    listMembers,
    listCollections,
    listGroups,
    listEvents,
    listPolicies,
    fetchOrg,
  }
}
