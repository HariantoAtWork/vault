import type { CipherItem } from '~/types/bitwarden'

export function filterCiphers(
  ciphers: CipherItem[],
  options: {
    organizationId: string | null
    search: string
    typeFilter?: number | null
  },
): CipherItem[] {
  const query = options.search.trim().toLowerCase()

  return ciphers.filter((cipher) => {
    const inVault = options.organizationId === null
      ? !cipher.organizationId
      : cipher.organizationId === options.organizationId

    if (!inVault) return false

    if (options.typeFilter != null && cipher.type !== options.typeFilter) {
      return false
    }

    if (!query) return true

    const haystack = [
      cipher.name,
      cipher.notes,
      cipher.login?.username,
      cipher.login?.uris?.map(u => u.uri).join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(query)
  })
}

export function getCipherTypeLabel(type: number): string {
  switch (type) {
    case 1: return 'Login'
    case 2: return 'Secure note'
    case 3: return 'Card'
    case 4: return 'Identity'
    default: return 'Item'
  }
}

export function getCipherInitial(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}
