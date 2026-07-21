/**
 * Maps Vault Management API adapter routes to Bitwarden client REST endpoints.
 * @see docs/architecture.md
 */
export const VAULT_ADAPTER_ROUTES = {
  status: { method: 'GET', vaultPath: '/status', bitwardenPath: null },
  sync: { method: 'POST', vaultPath: '/sync', bitwardenPath: '/sync' },
  lock: { method: 'POST', vaultPath: '/lock', bitwardenPath: null },
  listItems: { method: 'GET', vaultPath: '/list/object/items', bitwardenPath: '/sync' },
  listFolders: { method: 'GET', vaultPath: '/list/object/folders', bitwardenPath: '/sync' },
  getCipher: { method: 'GET', vaultPath: '/object/item/{id}', bitwardenPath: '/ciphers/{id}' },
  createCipher: { method: 'POST', vaultPath: '/object/item', bitwardenPath: '/ciphers' },
  updateCipher: { method: 'PUT', vaultPath: '/object/item/{id}', bitwardenPath: '/ciphers/{id}' },
  deleteCipher: { method: 'DELETE', vaultPath: '/object/item/{id}', bitwardenPath: '/ciphers/{id}' },
  createFolder: { method: 'POST', vaultPath: '/object/folder', bitwardenPath: '/folders' },
  updateFolder: { method: 'PUT', vaultPath: '/object/folder/{id}', bitwardenPath: '/folders/{id}' },
  deleteFolder: { method: 'DELETE', vaultPath: '/object/folder/{id}', bitwardenPath: '/folders/{id}' },
  generate: { method: 'GET', vaultPath: '/generate', bitwardenPath: null },
} as const

/**
 * Maps Public / Organisation Management API routes to Bitwarden server paths.
 */
export const ORG_PUBLIC_ROUTES = {
  members: '/public/members',
  member: '/public/members/{id}',
  memberReinvite: '/public/members/{id}/reinvite',
  memberRevoke: '/public/members/{id}/revoke',
  memberRestore: '/public/members/{id}/restore',
  memberGroupIds: '/public/members/{id}/group-ids',
  collections: '/public/collections',
  collection: '/public/collections/{id}',
  groups: '/public/groups',
  group: '/public/groups/{id}',
  groupMemberIds: '/public/groups/{id}/member-ids',
  events: '/public/events',
  policies: '/public/policies',
  policy: '/public/policies/{type}',
  orgSubscription: '/public/organization/subscription',
  orgImport: '/public/organization/import',
} as const

export function resolveBitwardenPath(
  template: string,
  params: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? '')
}
