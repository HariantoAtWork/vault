export type ServerPreset = 'us' | 'eu' | 'self'

export interface ServerConfig {
  preset: ServerPreset
  apiUrl: string
  identityUrl: string
  label: string
}

export interface PreloginResponse {
  kdf: number
  kdfIterations: number
  kdfMemory?: number
  kdfParallelism?: number
}

export interface TokenResponse {
  access_token: string
  expires_in: number
  refresh_token: string
  token_type: string
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  key: string
  privateKey?: string
  kdf: number
  kdfIterations: number
  kdfMemory?: number
  kdfParallelism?: number
}

export interface VaultContext {
  id: string | null
  name: string
  type: 'personal' | 'organization'
}

export interface CipherLogin {
  username?: string
  password?: string
  uris?: Array<{ uri?: string, match?: number }>
  totp?: string
}

export interface CipherItem {
  id: string
  type: number
  name: string
  notes?: string
  favorite: boolean
  organizationId?: string | null
  folderId?: string | null
  collectionIds?: string[]
  login?: CipherLogin
  revisionDate: string
}

export interface Organization {
  id: string
  name: string
  identifier: string
  status: number
}

export interface SyncProfile {
  id: string
  email: string
  name?: string
}

export type TwoFactorProviderType =
  | 0 // Authenticator (TOTP)
  | 1 // Email
  | 2 // Duo
  | 3 // Yubikey
  | 5 // Remember
  | 6 // OrganizationDuo
  | 7 // WebAuthn
  | 8 // RecoveryCode

export interface TwoFactorChallenge {
  twoFactorRequired: true
  twoFactorProviders: TwoFactorProviderType[]
  twoFactorProviders2: Record<string, Record<string, string>>
  email?: string
}

export const TWO_FACTOR_LABELS: Record<number, string> = {
  0: 'Authenticator app',
  1: 'Email',
  2: 'Duo',
  3: 'YubiKey',
  5: 'Remembered device',
  6: 'Organisation Duo',
  7: 'Passkey / WebAuthn',
  8: 'Recovery code',
}

export interface SyncResponse {
  profile?: SyncProfile
  organizations?: Organization[]
  ciphers?: CipherItem[]
  folders?: Array<{ id: string, name: string }>
  collections?: Array<{ id: string, name: string, organizationId: string }>
}

export interface BwApiResponse<T = unknown> {
  success: boolean
  data: T
}
