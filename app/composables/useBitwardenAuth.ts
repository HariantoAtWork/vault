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
import {
  hashMasterPassword,
  makeMasterKey,
  decryptUserKey,
  exportKeyBase64,
  importAesKey,
} from '~/utils/crypto'

const AUTH_STORAGE_KEY = 'bw-auth-session'
const CRYPTO_KEYS_STORAGE_KEY = 'bw-crypto-keys'
const DEVICE_ID_KEY = 'bw-device-identifier'

interface AuthSession {
  email: string
  accessToken: string
  refreshToken: string
  key: string
  /** Auth hash used to verify unlock without a full token round-trip. */
  masterPasswordHash?: string
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
  const isUnlocked = computed(() => Boolean(userKey.value || masterKey.value))
  const isLocked = computed(() => isAuthenticated.value && !isUnlocked.value)
  const needsTwoFactor = computed(() => Boolean(twoFactorChallenge.value))

  async function restoreSession() {
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

    await restoreCryptoKeys()
  }

  async function persistCryptoKeys() {
    if (!import.meta.client) return

    try {
      const payload: { userKey?: string, masterKey?: string } = {}
      if (userKey.value) {
        payload.userKey = await exportKeyBase64(userKey.value)
      }
      if (masterKey.value) {
        payload.masterKey = await exportKeyBase64(masterKey.value)
      }

      if (payload.userKey || payload.masterKey) {
        sessionStorage.setItem(CRYPTO_KEYS_STORAGE_KEY, JSON.stringify(payload))
      }
      else {
        sessionStorage.removeItem(CRYPTO_KEYS_STORAGE_KEY)
      }
    }
    catch {
      // Non-extractable keys or storage failure — vault will require unlock on refresh.
    }
  }

  async function restoreCryptoKeys() {
    if (!import.meta.client) return
    if (userKey.value || masterKey.value) return

    const raw = sessionStorage.getItem(CRYPTO_KEYS_STORAGE_KEY)
    if (!raw) return

    try {
      const payload = JSON.parse(raw) as { userKey?: string, masterKey?: string }
      if (payload.masterKey) {
        masterKey.value = await importAesKey(payload.masterKey)
      }
      if (payload.userKey) {
        userKey.value = await importAesKey(payload.userKey)
      }
    }
    catch {
      sessionStorage.removeItem(CRYPTO_KEYS_STORAGE_KEY)
      masterKey.value = null
      userKey.value = null
    }
  }

  function clearPersistedCryptoKeys() {
    if (import.meta.client) {
      sessionStorage.removeItem(CRYPTO_KEYS_STORAGE_KEY)
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
    clearPersistedCryptoKeys()
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

  async function completeLogin(
    loginResult: LoginSuccess,
    password: string,
    email: string,
    prelogin: PreloginResponse,
    masterPasswordHash?: string,
  ) {
    const mk = await makeMasterKey(password, email, prelogin)
    masterKey.value = mk
    if (loginResult.key) {
      try {
        userKey.value = await decryptUserKey(loginResult.key, mk)
      }
      catch {
        userKey.value = null
      }
    }

    const hash = masterPasswordHash
      ?? await hashMasterPassword(password, email, prelogin)

    persistSession({
      email,
      accessToken: loginResult.accessToken,
      refreshToken: loginResult.refreshToken,
      key: loginResult.key,
      masterPasswordHash: hash,
      server: loginResult.server,
      deviceIdentifier: loginResult.deviceIdentifier,
      rememberEmail: rememberEmail.value,
    })
    await persistCryptoKeys()

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

      return completeLogin(result, password, email, prelogin, masterPasswordHash)
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

      return completeLogin(
        result,
        pendingPassword.value,
        pendingEmail.value,
        prelogin,
        pendingMasterHash.value,
      )
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

  /**
   * Re-derive encryption keys after an explicit lock.
   * Password is verified against the hash stored at login (same check the
   * identity server uses), so unlock works even when Key unwrap is flaky.
   */
  async function unlock(password: string) {
    if (!session.value?.accessToken) {
      error.value = 'Session expired. Sign in again.'
      throw new Error(error.value)
    }

    isLoading.value = true
    error.value = null

    try {
      serverPreset.value = session.value.server.preset
      if (session.value.server.preset === 'self' && !selfHostUrl.value.trim()) {
        selfHostUrl.value = getStoredSelfHostUrl()
      }

      const prelogin = await $fetch<PreloginResponse & { server: ServerConfig }>(
        '/api/bitwarden/prelogin',
        {
          method: 'POST',
          body: {
            email: session.value.email,
            preset: serverPreset.value,
            selfHostUrl: selfHostUrl.value,
          },
        },
      )

      const hash = await hashMasterPassword(password, session.value.email, prelogin)

      if (session.value.masterPasswordHash) {
        if (hash !== session.value.masterPasswordHash) {
          error.value = 'Incorrect master password.'
          throw new Error(error.value)
        }
      }

      const mk = await makeMasterKey(password, session.value.email, prelogin)
      let uk: CryptoKey | null = null
      if (session.value.key) {
        try {
          uk = await decryptUserKey(session.value.key, mk)
        }
        catch {
          uk = null
        }
      }

      // Older sessions without a stored hash: require a successful key unwrap.
      if (!session.value.masterPasswordHash && session.value.key && !uk) {
        error.value = 'Could not unlock this session. Sign out and sign in once, then try Lock again.'
        throw new Error(error.value)
      }

      masterKey.value = mk
      userKey.value = uk

      if (!session.value.masterPasswordHash) {
        persistSession({
          ...session.value,
          masterPasswordHash: hash,
        })
      }

      await persistCryptoKeys()
    }
    catch (err: unknown) {
      if (!error.value) error.value = extractErrorMessage(err)
      masterKey.value = null
      userKey.value = null
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  function lockVault() {
    masterKey.value = null
    userKey.value = null
    clearPersistedCryptoKeys()
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
    isLocked,
    isUnlocked,
    needsTwoFactor,
    twoFactorChallenge,
    twoFactorProvider,
    restoreSession,
    testConnection,
    login,
    completeTwoFactor,
    sendTwoFactorEmail,
    cancelTwoFactor,
    unlock,
    lockVault,
    logout,
    clearSession,
  }
}
