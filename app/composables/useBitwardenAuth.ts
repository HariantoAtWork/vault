import type {
  PreloginResponse,
  ServerConfig,
  ServerPreset,
  SyncProfile,
  TwoFactorChallenge,
  TwoFactorProviderType,
} from '~/types/bitwarden'
import type { BitwardenErrorDetails } from '~/types/bitwarden-errors'
import { resolveServerConfig, getStoredSelfHostUrl, setStoredSelfHostUrl } from '~/utils/servers'
import { hashMasterPassword, makeMasterKey, decryptUserKey } from '~/utils/crypto'

const AUTH_STORAGE_KEY = 'bw-auth-session'
const DEVICE_ID_KEY = 'bw-device-identifier'

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

interface LoginSuccess {
  accessToken: string
  refreshToken: string
  key: string
  privateKey?: string
  server: ServerConfig
  deviceIdentifier: string
}

type LoginResponse = LoginSuccess | TwoFactorChallenge

function extractErrorMessage(err: unknown): string {
  const fetchErr = err as {
    data?: BitwardenErrorDetails & { statusMessage?: string, message?: string, twoFactorRequired?: boolean }
    statusMessage?: string
  }

  return fetchErr?.data?.message
    || fetchErr?.data?.statusMessage
    || fetchErr?.statusMessage
    || (err instanceof Error ? err.message : 'Login failed')
}

function isTwoFactorChallenge(value: unknown): value is TwoFactorChallenge {
  return Boolean(value && typeof value === 'object' && (value as TwoFactorChallenge).twoFactorRequired)
}

function getDeviceIdentifier(): string {
  if (!import.meta.client) return crypto.randomUUID()
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
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

  const pendingEmail = useState<string>('bw-pending-email', () => '')
  const pendingPassword = useState<string>('bw-pending-password', () => '')
  const pendingMasterHash = useState<string>('bw-pending-hash', () => '')
  const twoFactorChallenge = useState<TwoFactorChallenge | null>('bw-2fa-challenge', () => null)
  const twoFactorProvider = useState<TwoFactorProviderType | null>('bw-2fa-provider', () => null)

  const serverConfig = computed(() =>
    resolveServerConfig(serverPreset.value, selfHostUrl.value),
  )

  const isAuthenticated = computed(() => Boolean(session.value?.accessToken))
  const needsTwoFactor = computed(() => Boolean(twoFactorChallenge.value))

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

  function clearPendingLogin() {
    pendingEmail.value = ''
    pendingPassword.value = ''
    pendingMasterHash.value = ''
    twoFactorChallenge.value = null
    twoFactorProvider.value = null
  }

  function clearSession() {
    session.value = null
    masterKey.value = null
    userKey.value = null
    clearPendingLogin()
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

  async function completeLogin(loginResult: LoginSuccess, password: string, email: string, prelogin: PreloginResponse) {
    const mk = await makeMasterKey(password, email, prelogin)
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

    clearPendingLogin()
    return loginResult
  }

  async function requestToken(options: {
    email: string
    masterPasswordHash: string
    twoFactorToken?: string
    twoFactorProvider?: number
    twoFactorRemember?: boolean
  }): Promise<LoginResponse> {
    try {
      return await $fetch<LoginResponse>('/api/bitwarden/login', {
        method: 'POST',
        body: {
          email: options.email,
          masterPasswordHash: options.masterPasswordHash,
          preset: serverPreset.value,
          selfHostUrl: selfHostUrl.value,
          deviceIdentifier: getDeviceIdentifier(),
          twoFactorToken: options.twoFactorToken,
          twoFactorProvider: options.twoFactorProvider,
          twoFactorRemember: options.twoFactorRemember,
        },
      })
    }
    catch (err: unknown) {
      const fetchErr = err as { data?: LoginResponse & { message?: string } }
      if (isTwoFactorChallenge(fetchErr?.data)) {
        return fetchErr.data
      }
      throw err
    }
  }

  async function login(email: string, password: string) {
    isLoading.value = true
    error.value = null
    clearPendingLogin()

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
      const result = await requestToken({ email, masterPasswordHash })

      if (isTwoFactorChallenge(result)) {
        pendingEmail.value = email
        pendingPassword.value = password
        pendingMasterHash.value = masterPasswordHash
        twoFactorChallenge.value = result
        // Prefer authenticator when available; otherwise email, then recovery.
        const preferred = result.twoFactorProviders.find(p => p === 0)
          ?? result.twoFactorProviders.find(p => p === 1)
          ?? result.twoFactorProviders.find(p => p === 8)
          ?? result.twoFactorProviders[0]
          ?? 0
        twoFactorProvider.value = preferred as TwoFactorProviderType
        if (import.meta.client) {
          sessionStorage.setItem('bw-pending-prelogin', JSON.stringify(prelogin))
        }

        // Email codes are not sent by the token challenge — call send-email-login.
        if (twoFactorProvider.value === 1) {
          try {
            await sendTwoFactorEmail()
          }
          catch {
            // Keep the 2FA screen; error is already set for the user.
          }
        }

        return result
      }

      return completeLogin(result, password, email, prelogin)
    }
    catch (err: unknown) {
      error.value = extractErrorMessage(err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Ask the server to email a login OTP (Bitwarden: POST /two-factor/send-email-login).
   * Required for email 2FA — the identity token challenge alone does not send mail.
   */
  async function sendTwoFactorEmail() {
    if (!pendingEmail.value || !pendingMasterHash.value) {
      error.value = 'Start sign-in again before requesting a two-factor email.'
      throw new Error(error.value)
    }

    try {
      await $fetch('/api/bitwarden/two-factor/send-email', {
        method: 'POST',
        body: {
          email: pendingEmail.value,
          masterPasswordHash: pendingMasterHash.value,
          deviceIdentifier: getDeviceIdentifier(),
          preset: serverPreset.value,
          selfHostUrl: selfHostUrl.value,
        },
      })
      error.value = null
    }
    catch (err: unknown) {
      error.value = extractErrorMessage(err)
      throw err
    }
  }

  async function completeTwoFactor(token: string, remember = false) {
    if (!pendingEmail.value || !pendingMasterHash.value || twoFactorProvider.value == null) {
      error.value = 'Start sign-in again before entering a two-factor code.'
      throw new Error(error.value)
    }

    isLoading.value = true
    error.value = null

    try {
      const result = await requestToken({
        email: pendingEmail.value,
        masterPasswordHash: pendingMasterHash.value,
        twoFactorToken: token.trim(),
        twoFactorProvider: twoFactorProvider.value,
        twoFactorRemember: remember,
      })

      if (isTwoFactorChallenge(result)) {
        error.value = 'Invalid two-factor code. Try again.'
        throw new Error(error.value)
      }

      let prelogin: PreloginResponse = {
        kdf: 0,
        kdfIterations: 600000,
      }
      if (import.meta.client) {
        const raw = sessionStorage.getItem('bw-pending-prelogin')
        if (raw) {
          prelogin = JSON.parse(raw) as PreloginResponse
          sessionStorage.removeItem('bw-pending-prelogin')
        }
      }

      return completeLogin(result, pendingPassword.value, pendingEmail.value, prelogin)
    }
    catch (err: unknown) {
      if (!error.value) error.value = extractErrorMessage(err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  function cancelTwoFactor() {
    clearPendingLogin()
    if (import.meta.client) {
      sessionStorage.removeItem('bw-pending-prelogin')
    }
    error.value = null
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
    needsTwoFactor,
    twoFactorChallenge,
    twoFactorProvider,
    restoreSession,
    testConnection,
    login,
    completeTwoFactor,
    sendTwoFactorEmail,
    cancelTwoFactor,
    logout,
    clearSession,
  }
}
