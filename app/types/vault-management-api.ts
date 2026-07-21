/** Vault Management API response envelope (bw serve contract). */

export interface BwVaultResponse<T = unknown> {
  success: boolean
  data: T
}

export interface BwVaultList<T = unknown> {
  object: 'list'
  data: T[]
}

export interface BwVaultString {
  object: 'string'
  data: string
}

export interface BwVaultMessage {
  noColor?: boolean
  object: 'message'
  title: string
  message: string | null
}

export interface BwVaultStatus {
  object: 'template'
  template: {
    serverUrl: string
    lastSync: string | null
    userEmail: string | null
    userId: string | null
    status: 'locked' | 'unlocked' | string
  }
}

export interface BwVaultItem {
  id: string
  organizationId?: string | null
  folderId?: string | null
  type: number
  name: string
  notes?: string
  favorite?: boolean
  login?: {
    username?: string
    password?: string
    totp?: string
    uris?: Array<{ uri?: string, match?: number | null }>
  }
  card?: Record<string, unknown>
  identity?: Record<string, unknown>
  secureNote?: Record<string, unknown>
  collectionIds?: string[]
  revisionDate?: string
  deletedDate?: string | null
}

export interface BwVaultFolder {
  id: string
  name: string
  revisionDate?: string
}

export type BwCipherField = 'username' | 'password' | 'uri' | 'totp' | 'notes'

export interface VaultSessionPayload {
  accessToken: string
  preset?: string
  selfHostUrl?: string
  apiUrl?: string
  identityUrl?: string
}
