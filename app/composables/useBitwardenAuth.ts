import type {
  PreloginResponse,
  ServerConfig,
  ServerPreset,
  SyncProfile,
} from '~/types/bitwarden'
import type { BitwardenErrorDetails } from '~/types/bitwarden-errors'
import { resolveServerConfig, getStoredSelfHostUrl, setStoredSelfHostUrl } from '~/utils/servers'
import { hashMasterPassword, makeMasterKey, decryptUserKey } from '~/utils/crypto'

const AUTH_STORAGE_KEY = 'bw-auth-session'

interface AuthSession {
  email: string
  accessToken: string
  refreshToken: string
  key: string
  server: ServerConfig
  deviceIdentifier: string
  rememberEmail: boolean
  profile?: SyncProfile
}

function extractErrorMessage(err: unknown): string {
  const fetchErr = err as {
    data?: BitwardenErrorDetails & { statusMessage?: string, message?: string }
    statusMessage?: string
  }

  return fetchErr?.data?.message
    || fetchErr?.data?.statusMessage
    || fetchErr?.statusMessage
    || (err instanceof Error ? err.message : 'Login failed')
}

export function useBitwardenAuth() {
  const session = useState<AuthSession | null>('bw-session', () => null)
  const masterKey = useState<CryptoKey | null>('bw-master-key', () => null)
  const userKey = useState<CryptoKey | null>('bw-user-key', () => null)
  const isLoading = useState('bw-auth-loading', () => false)
  const error = useState<string | null>('bw-auth-error', () => null)

  const serverPreset = useState<ServerPreset>('bw-server-preset', () => 'us')
  const selfHostUrl = useState('bw-self-host-url', () => getStoredSelfHostUrl())
  const rememberEmail = useState('bw-remember-email', () => true)
  const rememberedEmail = useState<string>('bw-remembered-email', () => '')

  const serverConfig = computed(() =>
    resolveServerConfig(serverPreset.value, selfHostUrl.value),
  )

  const isAuthenticated = computed(() => Boolean(session.value?.accessToken))

  function restoreSession() {
    if (!import.meta.client) return

    const storedEmail = localStorage.getItem('bw-remembered-email')
    if (storedEmail) rememberedEmail.value = storedEmail

    const storedPreset = localStorage.getItem('bw-server-preset') as ServerPreset | null
    if (storedPreset) serverPreset.value = storedPreset

    const storedSelfHost = localStorage.getItem('bw-self-host-url')
    if (storedSelfHost) selfHostUrl.value = storedSelfHost

    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (raw) {
      try {
        session.value = JSON.parse(raw) as AuthSession
      }
      catch {
        sessionStorage.removeItem(AUTH_STORAGE_KEY)
      }
    }
  }

  function persistSession(data: AuthSession) {
    session.value = data
    if (import.meta.client) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data))
      localStorage.setItem('bw-server-preset', data.server.preset)
      if (data.rememberEmail) {
        localStorage.setItem('bw-remembered-email', data.email)
      }
      else {
        localStorage.removeItem('bw-remembered-email')
      }
      if (data.server.preset === 'self') {
        setStoredSelfHostUrl(selfHostUrl.value)
      }
    }
  }

  function clearSession() {
    session.value = null
    masterKey.value = null
    userKey.value = null
    if (import.meta.client) {
      sessionStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }

  async function testConnection() {
    return $fetch<{
      ok: boolean
      code: string
      message: string
      server?: ServerConfig
    }>('/api/bitwarden/health', {
      query: {
        preset: serverPreset.value,
        selfHostUrl: selfHostUrl.value,
      },
    })
  }

  async function login(email: string, password: string) {
    isLoading.value = true
    error.value = null

    try {
      const prelogin = await $fetch<PreloginResponse & { server: ServerConfig }>(
        '/api/bitwarden/prelogin',
        {
          method: 'POST',
          body: {
            email,
            preset: serverPreset.value,
            selfHostUrl: selfHostUrl.value,
          },
        },
      )

      const masterPasswordHash = await hashMasterPassword(password, email, prelogin)
      const mk = await makeMasterKey(password, email, prelogin)

      const loginResult = await $fetch<{
        accessToken: string
        refreshToken: string
        key: string
        privateKey?: string
        server: ServerConfig
        deviceIdentifier: string
      }>('/api/bitwarden/login', {
        method: 'POST',
        body: {
          email,
          masterPasswordHash,
          preset: serverPreset.value,
          selfHostUrl: selfHostUrl.value,
        },
      })

      masterKey.value = mk
      if (loginResult.key) {
        userKey.value = await decryptUserKey(loginResult.key, mk)
      }

      persistSession({
        email,
        accessToken: loginResult.accessToken,
        refreshToken: loginResult.refreshToken,
        key: loginResult.key,
        server: loginResult.server,
        deviceIdentifier: loginResult.deviceIdentifier,
        rememberEmail: rememberEmail.value,
      })

      return loginResult
    }
    catch (err: unknown) {
      error.value = extractErrorMessage(err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  async function logout() {
    try {
      await $fetch('/api/vault/lock', { method: 'POST' })
    }
    catch {
      // lock endpoint is informational
    }
    clearSession()
    await navigateTo('/login')
  }

  return {
    session,
    masterKey,
    userKey,
    isLoading,
    error,
    serverPreset,
    selfHostUrl,
    rememberEmail,
    rememberedEmail,
    serverConfig,
    isAuthenticated,
    restoreSession,
    testConnection,
    login,
    logout,
    clearSession,
  }
}
