export interface BwVaultResponse<T = unknown> {
  success: boolean
  data: T
}

export function vaultSuccess<T>(data: T): BwVaultResponse<T> {
  return { success: true, data }
}

export function vaultList<T>(items: T[]) {
  return vaultSuccess({
    object: 'list',
    data: items,
  })
}

export function vaultString(value: string) {
  return vaultSuccess({
    object: 'string',
    data: value,
  })
}

export function vaultMessage(title: string, message: string | null = null) {
  return vaultSuccess({
    noColor: false,
    object: 'message',
    title,
    message,
  })
}
