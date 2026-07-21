import { getServerConfigFromBody, bitwardenFetch } from '../../utils/bitwarden'
import { classifyFetchError } from '../../utils/errors'

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

  try {
    const response = await bitwardenFetch(`${server.apiUrl}/accounts/prelogin`, {
      method: 'POST',
      body: JSON.stringify({ email: 'health-check@invalid.local' }),
    })

    // Any HTTP response means the server is reachable; 400/404 still confirms API presence.
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
