import { Agent } from 'undici'
import type { ServerConfig } from '~/types/bitwarden'
import { getServerConfigFromBody } from '#shared/utils/servers'
import { classifyFetchError } from './errors'

export { getServerConfigFromBody, resolveServerConfig, resolveServerUrls } from '#shared/utils/servers'

let insecureAgent: Agent | undefined

function getInsecureAgent(): Agent {
  if (!insecureAgent) {
    insecureAgent = new Agent({
      connect: {
        rejectUnauthorized: false,
      },
    })
  }
  return insecureAgent
}

function allowInsecureTls(): boolean {
  return process.env.BITWARDEN_ALLOW_INSECURE_TLS === 'true'
}

export async function bitwardenFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (!headers['Content-Type'] && !headers['content-type']) {
    if (options.body && typeof options.body === 'string' && !options.body.startsWith('grant_type=')) {
      headers['Content-Type'] = 'application/json'
    }
  }

  const fetchOptions: RequestInit & { dispatcher?: Agent } = {
    ...options,
    headers,
  }

  if (allowInsecureTls() && url.startsWith('https://')) {
    fetchOptions.dispatcher = getInsecureAgent()
  }

  try {
    return await fetch(url, fetchOptions)
  }
  catch (err) {
    const details = classifyFetchError(err)
    throw createError({
      statusCode: 502,
      statusMessage: details.message,
      data: details,
    })
  }
}

export async function bitwardenJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<{ response: Response, data: T }> {
  const response = await bitwardenFetch(url, options)
  const text = await response.text()

  let data: T
  try {
    data = text ? JSON.parse(text) as T : {} as T
  }
  catch {
    data = text as T
  }

  return { response, data }
}

export interface VaultRequestContext {
  accessToken: string
  server: ServerConfig
}

export function readAccessToken(event: Parameters<typeof getHeader>[0], body?: { accessToken?: string }): string {
  const header = getHeader(event, 'authorization')
  if (header?.startsWith('Bearer ')) {
    return header.slice(7)
  }
  if (body?.accessToken) {
    return body.accessToken
  }
  throw createError({ statusCode: 401, statusMessage: 'Missing access token' })
}

export function readServerFromRequest(body: {
  preset?: string
  selfHostUrl?: string
  apiUrl?: string
  identityUrl?: string
}): ServerConfig {
  try {
    return getServerConfigFromBody(body)
  }
  catch (err) {
    const details = classifyFetchError(err)
    throw createError({
      statusCode: 400,
      statusMessage: details.message,
      data: details,
    })
  }
}

export function readVaultContext(
  event: Parameters<typeof getHeader>[0],
  body: {
    accessToken?: string
    preset?: string
    selfHostUrl?: string
    apiUrl?: string
    identityUrl?: string
  },
): VaultRequestContext {
  return {
    accessToken: readAccessToken(event, body),
    server: readServerFromRequest(body),
  }
}
