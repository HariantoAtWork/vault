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
