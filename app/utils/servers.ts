import type { ServerConfig, ServerPreset } from '~/types/bitwarden'
import {
  resolveServerUrls,
  resolveServerConfig,
  stripServerPathSuffixes,
  getServerConfigFromBody,
  SERVER_PRESETS,
} from '#shared/utils/servers'

export {
  SERVER_PRESETS,
  resolveServerConfig,
  resolveServerUrls,
  stripServerPathSuffixes,
  getServerConfigFromBody,
}

export function normaliseSelfHostUrl(input: string): string {
  try {
    return resolveServerUrls(input).baseUrl
  }
  catch {
    let url = stripServerPathSuffixes(input)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }
    return url.replace(/\/+$/, '')
  }
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

export type { ServerConfig, ServerPreset }
