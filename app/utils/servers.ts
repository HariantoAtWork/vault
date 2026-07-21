import type { ServerConfig, ServerPreset } from '~/types/bitwarden'

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

export function normaliseSelfHostUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '')
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }
  return url
}

export function resolveServerConfig(
  preset: ServerPreset,
  selfHostUrl?: string,
): ServerConfig {
  if (preset === 'self') {
    const base = normaliseSelfHostUrl(selfHostUrl || '')
    return {
      preset: 'self',
      apiUrl: `${base}/api`,
      identityUrl: `${base}/identity`,
      label: base.replace(/^https?:\/\//, ''),
    }
  }

  const config = SERVER_PRESETS[preset]
  return { preset, ...config }
}

export function getStoredSelfHostUrl(): string {
  if (import.meta.client) {
    return localStorage.getItem('bw-self-host-url') || ''
  }
  return ''
}

export function setStoredSelfHostUrl(url: string) {
  if (import.meta.client) {
    localStorage.setItem('bw-self-host-url', url)
  }
}
