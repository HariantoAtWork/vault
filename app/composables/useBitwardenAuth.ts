import type {
  PreloginResponse,
  ServerConfig,
  ServerPreset,
  SyncProfile,
} from '~/types/bitwarden'
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
      const fetchErr = err as { data?: { statusMessage?: string, message?: string }, statusMessage?: string }
      const message = fetchErr?.data?.statusMessage
        || fetchErr?.data?.message
        || fetchErr?.statusMessage
        || (err instanceof Error ? err.message : 'Login failed')
      error.value = message
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  function logout() {
    clearSession()
    navigateTo('/login')
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
    login,
    logout,
    clearSession,
  }
}
