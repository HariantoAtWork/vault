export type BitwardenErrorCode =
  | 'invalid_url'
  | 'tls'
  | 'unreachable'
  | 'not_found'
  | 'auth_failed'
  | 'prelogin_failed'
  | 'unknown'

export interface BitwardenErrorDetails {
  code: BitwardenErrorCode
  message: string
  cause?: string
}

export interface HealthCheckResult {
  ok: boolean
  code: string
  message: string
  server?: {
    preset: string
    apiUrl: string
    identityUrl: string
    label: string
  }
}
