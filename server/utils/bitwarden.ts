import type { ServerConfig } from '~/types/bitwarden'

export function getServerConfigFromBody(body: {
  preset?: string
  selfHostUrl?: string
  apiUrl?: string
  identityUrl?: string
}): ServerConfig {
  if (body.apiUrl && body.identityUrl) {
    return {
      preset: 'self',
      apiUrl: body.apiUrl,
      identityUrl: body.identityUrl,
      label: body.apiUrl,
    }
  }

  const preset = (body.preset || 'us') as 'us' | 'eu' | 'self'
  if (preset === 'self') {
    const base = (body.selfHostUrl || '').trim().replace(/\/+$/, '')
    const url = base.startsWith('http') ? base : `https://${base}`
    return {
      preset: 'self',
      apiUrl: `${url}/api`,
      identityUrl: `${url}/identity`,
      label: url.replace(/^https?:\/\//, ''),
    }
  }

  const presets = {
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

  return { preset, ...presets[preset] }
}

export async function bitwardenFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  })
}
