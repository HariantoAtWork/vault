/** Client identity headers required by Bitwarden identity/API. */

export const BITWARDEN_CLIENT_NAME = 'web'
export const BITWARDEN_CLIENT_VERSION = '2025.6.1'
/** ChromeBrowser — matches official web vault device type. */
export const BITWARDEN_DEVICE_TYPE = '9'

export function bitwardenClientHeaders(email?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Bitwarden-Client-Name': BITWARDEN_CLIENT_NAME,
    'Bitwarden-Client-Version': BITWARDEN_CLIENT_VERSION,
    'Device-Type': BITWARDEN_DEVICE_TYPE,
  }

  if (email?.trim()) {
    headers['Auth-Email'] = Buffer.from(email.trim().toLowerCase()).toString('base64')
  }

  return headers
}
