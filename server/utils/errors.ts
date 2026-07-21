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

export function classifyFetchError(err: unknown): BitwardenErrorDetails {
  const message = err instanceof Error ? err.message : String(err)
  const cause = err instanceof Error && 'cause' in err
    ? String((err as Error & { cause?: unknown }).cause)
    : undefined

  const combined = `${message} ${cause ?? ''}`.toLowerCase()

  if (combined.includes('invalid_url') || combined.includes('invalid url')) {
    return {
      code: 'invalid_url',
      message: 'Enter a valid server address, for example vault.example.com.',
      cause: message,
    }
  }

  if (
    combined.includes('certificate')
    || combined.includes('cert')
    || combined.includes('self signed')
    || combined.includes('unable to verify')
    || combined.includes('ssl')
    || combined.includes('tls')
  ) {
    return {
      code: 'tls',
      message: 'Could not verify the server certificate. If this is a self-hosted server with a self-signed certificate, enable BITWARDEN_ALLOW_INSECURE_TLS for local development.',
      cause: message,
    }
  }

  if (
    combined.includes('fetch failed')
    || combined.includes('econnrefused')
    || combined.includes('enotfound')
    || combined.includes('network')
    || combined.includes('timeout')
    || combined.includes('timed out')
  ) {
    return {
      code: 'unreachable',
      message: 'Could not reach the server. Check the address and your network connection.',
      cause: message,
    }
  }

  if (combined.includes('404') || combined.includes('not found')) {
    return {
      code: 'not_found',
      message: 'Server responded but the Bitwarden API was not found at this address.',
      cause: message,
    }
  }

  return {
    code: 'unknown',
    message: message || 'Request failed',
    cause,
  }
}

export function throwBitwardenError(
  statusCode: number,
  details: BitwardenErrorDetails,
) {
  throw createError({
    statusCode,
    statusMessage: details.message,
    data: details,
  })
}
