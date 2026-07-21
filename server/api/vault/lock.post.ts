import { vaultMessage } from '../../services/bitwarden/vault-response'

export default defineEventHandler(() => {
  return vaultMessage('Your vault is locked.')
})
