import { generatePassphrase, generatePassword } from '../../utils/password-generator'
import { vaultString } from '../../services/bitwarden/vault-response'

export default defineEventHandler((event) => {
  const query = getQuery(event)

  const usePassphrase = query.passphrase === 'true' || query.passphrase === true

  if (usePassphrase) {
    const words = Number(query.words ?? 6)
    const separator = String(query.separator ?? '-')
    const capitalize = query.capitalize === 'true' || query.capitalize === true
    const password = generatePassphrase(words, separator, capitalize)
    return vaultString(password)
  }

  const password = generatePassword({
    length: Number(query.length ?? 14),
    uppercase: query.uppercase !== 'false',
    lowercase: query.lowercase !== 'false',
    number: query.number !== 'false',
    special: query.special === 'true',
  })

  return vaultString(password)
})
