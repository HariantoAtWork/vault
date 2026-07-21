import { argon2id } from 'hash-wasm'
import type { PreloginResponse } from '~/types/bitwarden'

function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Derive the 32-byte master key from the master password.
 * Bitwarden: PBKDF2-SHA256(password, email) or Argon2id(password, email).
 */
export async function deriveMasterKeyBytes(
  password: string,
  email: string,
  prelogin: PreloginResponse,
): Promise<Uint8Array> {
  const salt = new TextEncoder().encode(email.trim().toLowerCase())

  // Argon2id (kdf === 1)
  if (prelogin.kdf === 1) {
    // Bitwarden kdfMemory is MiB; hash-wasm memorySize is KiB.
    const memoryMiB = prelogin.kdfMemory ?? 64
    const hash = await argon2id({
      password,
      salt,
      parallelism: prelogin.kdfParallelism ?? 4,
      iterations: prelogin.kdfIterations,
      memorySize: memoryMiB * 1024,
      hashLength: 32,
      outputType: 'binary',
    })
    return new Uint8Array(hash)
  }

  // PBKDF2-SHA256 (kdf === 0)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: prelogin.kdfIterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )

  return new Uint8Array(bits)
}

/**
 * Master password hash sent to the identity server.
 * Bitwarden: PBKDF2-SHA256(masterKey, password, 1 iteration) → base64.
 */
export async function hashMasterPassword(
  password: string,
  email: string,
  prelogin: PreloginResponse,
): Promise<string> {
  const masterKeyBytes = await deriveMasterKeyBytes(password, email, prelogin)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    masterKeyBytes,
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const hashBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(password),
      iterations: 1,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )

  return toBase64(hashBits)
}

export async function makeMasterKey(
  password: string,
  email: string,
  prelogin: PreloginResponse,
): Promise<CryptoKey> {
  const masterKeyBytes = await deriveMasterKeyBytes(password, email, prelogin)

  return crypto.subtle.importKey(
    'raw',
    masterKeyBytes,
    { name: 'AES-CBC', length: 256 },
    true,
    ['decrypt', 'encrypt'],
  )
}

async function decryptAesCbc(
  encKey: CryptoKey,
  iv: Uint8Array,
  data: Uint8Array,
): Promise<Uint8Array> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    encKey,
    data,
  )
  return new Uint8Array(decrypted)
}

function fastConcat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

async function hmacSha256(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const sig = await crypto.subtle.sign('HMAC', key, data)
  return new Uint8Array(sig)
}

async function stretchKey(masterKey: CryptoKey): Promise<CryptoKey> {
  const rawKey = await crypto.subtle.exportKey('raw', masterKey)
  const encKeyBytes = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const encBits = await crypto.subtle.sign('HMAC', encKeyBytes, new TextEncoder().encode('enc'))

  return crypto.subtle.importKey(
    'raw',
    encBits.slice(0, 32),
    { name: 'AES-CBC', length: 256 },
    false,
    ['decrypt', 'encrypt'],
  )
}

async function resolveMacKey(masterKey: CryptoKey): Promise<CryptoKey> {
  const macKeyMaterial = await crypto.subtle.exportKey('raw', masterKey)
  const macKeyImport = await crypto.subtle.importKey(
    'raw',
    macKeyMaterial,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const macKeyBytes = await crypto.subtle.sign(
    'HMAC',
    macKeyImport,
    new TextEncoder().encode('mac'),
  )
  return crypto.subtle.importKey(
    'raw',
    macKeyBytes.slice(0, 32),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

/** Decrypt an EncString to raw bytes (used for keys and UTF-8 payloads). */
export async function decryptToBytes(
  encString: string,
  masterKey: CryptoKey,
): Promise<Uint8Array | null> {
  if (!encString) return null
  if (!encString.includes('.')) {
    return new TextEncoder().encode(encString)
  }

  const encType = encString.charAt(0)
  if (encType === '0') {
    const payload = encString.substring(2) || encString
    return fromBase64(payload)
  }

  if (encType !== '2') return null

  try {
    const encData = encString.substring(2).split('|')
    if (encData.length < 2) return null

    const iv = fromBase64(encData[0]!)
    const data = fromBase64(encData[1]!)
    const encKey = await stretchKey(masterKey)

    if (encData.length >= 3 && encData[2]) {
      const macKeyFinal = await resolveMacKey(masterKey)
      const macData = fastConcat([iv, data])
      const computedMac = await hmacSha256(macKeyFinal, macData)
      const expectedMac = fromBase64(encData[2])

      const match = computedMac.every((b, i) => b === expectedMac[i])
      if (!match) return null
    }

    const decrypted = await decryptAesCbc(encKey, iv, data)
    const paddingLen = decrypted[decrypted.length - 1]!
    if (paddingLen > 16 || paddingLen < 1) return null
    return decrypted.slice(0, decrypted.length - paddingLen)
  }
  catch {
    return null
  }
}

export async function decryptString(
  encString: string,
  masterKey: CryptoKey,
): Promise<string | null> {
  if (!encString) return null
  if (!encString.includes('.')) return encString

  const encType = encString.charAt(0)
  if (encType === '0') {
    return encString.substring(2) || encString
  }

  const bytes = await decryptToBytes(encString, masterKey)
  if (!bytes) return null

  try {
    return new TextDecoder().decode(bytes)
  }
  catch {
    return null
  }
}

/**
 * Unwrap the account encryption key from the login `Key` field.
 * Plaintext is either raw key bytes (32/64) or a legacy UTF-8 base64 string of those bytes.
 */
export async function decryptUserKey(
  encryptedKey: string,
  masterKey: CryptoKey,
): Promise<CryptoKey | null> {
  const keyBytes = await decryptToBytes(encryptedKey, masterKey)
  if (!keyBytes?.length) return null

  let raw = keyBytes
  try {
    const asText = new TextDecoder('utf-8', { fatal: true }).decode(keyBytes)
    if (/^[A-Za-z0-9+/]+=*$/.test(asText) && asText.length >= 22) {
      raw = fromBase64(asText)
    }
  }
  catch {
    // Binary key material — use as-is
  }

  try {
    // 64-byte Bitwarden SymmetricCryptoKey: enc (32) + mac (32). AES uses the enc half.
    if (raw.length >= 64) {
      return importAesKey(raw.subarray(0, 32))
    }
    if (raw.length === 32 || raw.length === 16) {
      return importAesKey(raw)
    }
  }
  catch {
    return null
  }

  return null
}

/** Export a CryptoKey to base64 for tab-scoped sessionStorage. */
export async function exportKeyBase64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return toBase64(raw)
}

export async function importAesKey(raw: Uint8Array | string): Promise<CryptoKey> {
  const keyBytes = typeof raw === 'string' ? fromBase64(raw) : raw
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC', length: 256 },
    true,
    ['decrypt', 'encrypt'],
  )
}
