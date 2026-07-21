/** Public / Organisation Management API types (api.bitwarden.com/public/*). */

export interface OrgApiCredentials {
  clientId: string
  clientSecret: string
  organizationId?: string
  label?: string
}

export interface PublicMember {
  id: string
  userId?: string | null
  name?: string
  email: string
  type: number
  status: number
  externalId?: string | null
  resetPasswordEnrolled?: boolean
  collections?: Array<{ id: string, readOnly: boolean, hidePasswords: boolean, manage: boolean }>
}

export interface PublicCollection {
  id: string
  organizationId: string
  name: string
  externalId?: string | null
  groups?: Array<{ id: string, readOnly: boolean, hidePasswords: boolean, manage: boolean }>
}

export interface PublicGroup {
  id: string
  organizationId: string
  name: string
  externalId?: string | null
  collections?: Array<{ id: string, readOnly: boolean, hidePasswords: boolean, manage: boolean }>
}

export interface PublicPolicy {
  type: number
  enabled: boolean
  data?: Record<string, unknown>
}

export interface PublicEvent {
  type: number
  itemId?: string | null
  date: string
  actingUserId?: string | null
  cipherId?: string | null
  collectionId?: string | null
  groupId?: string | null
  organizationId?: string | null
  policyId?: string | null
  memberId?: string | null
  actingUserName?: string | null
  device?: number | null
  ipAddress?: string | null
}

export interface PublicListResponse<T> {
  data: T[]
  object?: string
  continuationToken?: string | null
}

export interface OrgApiRequestPayload extends OrgApiCredentials {
  preset?: string
  selfHostUrl?: string
  apiUrl?: string
  identityUrl?: string
}
