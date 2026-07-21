import type { ServerConfig, ServerPreset } from '../../app/types/bitwarden'

export interface ResolvedServerUrls {
  baseUrl: string
  apiUrl: string
  identityUrl: string
  label: string
}

export const SERVER_PRESETS: Record<'us' | 'eu', Omit<ServerConfig, 'preset'>> = {
  us: {
    apiUrl: 'https://api.bitwarden.com',
    identityUrl: 'https://identity.bitwarden.com',
    label: 'bitwarden.com',
  },
  eu: {
    apiUrl: 'https://api.bitwarden.eu',
    identityUrl: 'https://identity.bitwarden.eu',
    label: 'bitwarden.eu',
  },
}

/** Strip trailing /api, /identity, and slashes from a self-host input URL. */
export function stripServerPathSuffixes(input: string): string {
  let url = input.trim().replace(/\/+$/, '')
  url = url.replace(/\/(api|identity)\/?$/i, '')
  return url.replace(/\/+$/, '')
}

export function resolveServerUrls(input: string): ResolvedServerUrls {
  const stripped = stripServerPathSuffixes(input)

  if (!stripped) {
    throw new Error('invalid_url')
  }

  let base = stripped
  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    base = `https://${base}`
  }

  try {
    const parsed = new URL(base)
    if (!parsed.hostname) {
      throw new Error('invalid_url')
    }
    base = `${parsed.protocol}//${parsed.host}`
  }
  catch {
    throw new Error('invalid_url')
  }

  return {
    baseUrl: base,
    apiUrl: `${base}/api`,
    identityUrl: `${base}/identity`,
    label: base.replace(/^https?:\/\//, ''),
  }
}

export function resolveServerConfig(
  preset: ServerPreset,
  selfHostUrl?: string,
): ServerConfig {
  if (preset === 'self') {
    const trimmed = (selfHostUrl || '').trim()
    if (!trimmed) {
      return {
        preset: 'self',
        apiUrl: '',
        identityUrl: '',
        label: 'your server',
      }
    }

    try {
      const urls = resolveServerUrls(trimmed)
      return {
        preset: 'self',
        apiUrl: urls.apiUrl,
        identityUrl: urls.identityUrl,
        label: urls.label,
      }
    }
    catch {
      // Allow partial URLs while the user is still typing.
      return {
        preset: 'self',
        apiUrl: '',
        identityUrl: '',
        label: trimmed.replace(/^https?:\/\//, ''),
      }
    }
  }

  const config = SERVER_PRESETS[preset]
  return { preset, ...config }
}

export function resolveServerConfigStrict(
  preset: ServerPreset,
  selfHostUrl?: string,
): ServerConfig {
  if (preset === 'self') {
    const urls = resolveServerUrls(selfHostUrl || '')
    return {
      preset: 'self',
      apiUrl: urls.apiUrl,
      identityUrl: urls.identityUrl,
      label: urls.label,
    }
  }

  return resolveServerConfig(preset, selfHostUrl)
}

export function getServerConfigFromBody(body: {
  preset?: string
  selfHostUrl?: string
  apiUrl?: string
  identityUrl?: string
}): ServerConfig {
  if (body.apiUrl && body.identityUrl) {
    const base = stripServerPathSuffixes(body.apiUrl.replace(/\/api\/?$/i, ''))
    return {
      preset: 'self',
      apiUrl: body.apiUrl.replace(/\/+$/, ''),
      identityUrl: body.identityUrl.replace(/\/+$/, ''),
      label: base.replace(/^https?:\/\//, '') || body.apiUrl,
    }
  }

  const preset = (body.preset || 'us') as ServerPreset
  if (preset === 'self') {
    if (!(body.selfHostUrl || '').trim()) {
      throw new Error('invalid_url')
    }
    return resolveServerConfigStrict('self', body.selfHostUrl)
  }

  return resolveServerConfigStrict(preset)
}
