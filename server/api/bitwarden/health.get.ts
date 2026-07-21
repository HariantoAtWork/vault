import { getServerConfigFromBody, bitwardenFetch } from '../../utils/bitwarden'
import { classifyFetchError } from '../../utils/errors'

async function probePrelogin(apiUrl: string, identityUrl: string) {
  const body = JSON.stringify({ email: 'health-check@invalid.local' })
  const urls = [
    `${identityUrl}/accounts/prelogin`,
    `${apiUrl}/accounts/prelogin`,
  ]

  for (const url of urls) {
    const response = await bitwardenFetch(url, {
      method: 'POST',
      body,
    })

    if (response.status !== 404) {
      return response
    }
  }

  return null
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  let server
  try {
    server = getServerConfigFromBody({
      preset: query.preset as string,
      selfHostUrl: query.selfHostUrl as string,
    })
  }
  catch (err) {
    const details = classifyFetchError(err)
    return {
      ok: false,
      server: null,
      ...details,
    }
  }

  if (server.preset === 'self' && !server.apiUrl) {
    return {
      ok: false,
      server,
      code: 'invalid_url' as const,
      message: 'Enter a valid self-hosted server address.',
    }
  }

  try {
    const response = await probePrelogin(server.apiUrl, server.identityUrl)

    if (!response) {
      return {
        ok: false,
        server,
        code: 'not_found' as const,
        message: 'Bitwarden API was not found at this address.',
      }
    }

    if (response.status === 404) {
      return {
        ok: false,
        server,
        code: 'not_found' as const,
        message: 'Bitwarden API was not found at this address.',
      }
    }

    return {
      ok: true,
      server,
      code: 'ok' as const,
      message: `Connected to ${server.label}`,
      status: response.status,
    }
  }
  catch (err) {
    const details = classifyFetchError(err)
    return {
      ok: false,
      server,
      ...details,
    }
  }
})
