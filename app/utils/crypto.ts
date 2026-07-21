import { argon2id } from 'hash-wasm'
import type { PreloginResponse } from '~/types/bitwarden'

/** Bitwarden SymmetricCryptoKey: 32-byte enc + 32-byte mac. */
export interface SymmetricCryptoKey {
  encKey: CryptoKey
  macKey: CryptoKey
  /** Full 64-byte raw material (for sessionStorage). */
  raw: Uint8Array
}

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

/** Copy into a standalone ArrayBuffer (avoids SharedArrayBuffer / offset issues). */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
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
  // SubtleCrypto AES-CBC already strips PKCS#7 padding.
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: toArrayBuffer(iv) },
    encKey,
    toArrayBuffer(data),
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
  const sig = await crypto.subtle.sign('HMAC', key, toArrayBuffer(data))
  return new Uint8Array(sig)
}

/**
 * HKDF-Expand (RFC 5869) as used by Bitwarden for master-key stretch.
 * For 32-byte output: HMAC(PRK, info || 0x01).
 */
async function hkdfExpand(
  prk: ArrayBuffer | Uint8Array,
  info: string,
  size: number,
): Promise<Uint8Array> {
  const prkBytes = prk instanceof Uint8Array ? prk : new Uint8Array(prk)
  const infoBytes = new TextEncoder().encode(info)
  const importedKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(prkBytes),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const hashLen = 32
  const okm = new Uint8Array(size)
  let previousT = new Uint8Array(0)
  const n = Math.ceil(size / hashLen)

  for (let i = 0; i < n; i++) {
    const t = new Uint8Array(previousT.length + infoBytes.length + 1)
    t.set(previousT)
    t.set(infoBytes, previousT.length)
    t.set([i + 1], t.length - 1)
    previousT = new Uint8Array(await crypto.subtle.sign('HMAC', importedKey, toArrayBuffer(t)))
    okm.set(previousT.subarray(0, Math.min(hashLen, size - i * hashLen)), i * hashLen)
  }

  return okm
}

/** Stretch a 32-byte master key into a 64-byte SymmetricCryptoKey (enc + mac). */
export async function stretchMasterKey(masterKey: CryptoKey): Promise<SymmetricCryptoKey> {
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', masterKey))
  const enc = await hkdfExpand(raw, 'enc', 32)
  const mac = await hkdfExpand(raw, 'mac', 32)
  const full = new Uint8Array(64)
  full.set(enc, 0)
  full.set(mac, 32)
  return importSymmetricKey(full)
}

export async function importSymmetricKey(raw: Uint8Array | string): Promise<SymmetricCryptoKey> {
  const keyBytes = typeof raw === 'string' ? fromBase64(raw) : raw
  if (keyBytes.length < 64) {
    throw new Error('SymmetricCryptoKey must be 64 bytes')
  }

  const material = keyBytes.subarray(0, 64)
  const encKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(material.subarray(0, 32)),
    { name: 'AES-CBC', length: 256 },
    true,
    ['decrypt', 'encrypt'],
  )
  const macKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(material.subarray(32, 64)),
    { name: 'HMAC', hash: 'SHA-256' },
    true,
    ['sign'],
  )

  return {
    encKey,
    macKey,
    raw: new Uint8Array(material),
  }
}

/** Decrypt an EncString to raw bytes (used for keys and UTF-8 payloads). */
export async function decryptToBytes(
  encString: string,
  key: SymmetricCryptoKey,
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

  // AesCbc256_HmacSha256_B64
  if (encType !== '2') return null

  try {
    const encData = encString.substring(2).split('|')
    if (encData.length < 2) return null

    const iv = fromBase64(encData[0]!)
    const data = fromBase64(encData[1]!)

    if (encData.length >= 3 && encData[2]) {
      const macData = fastConcat([iv, data])
      const computedMac = await hmacSha256(key.macKey, macData)
      const expectedMac = fromBase64(encData[2])

      if (computedMac.length !== expectedMac.length) return null
      const match = computedMac.every((b, i) => b === expectedMac[i])
      if (!match) return null
    }

    return await decryptAesCbc(key.encKey, iv, data)
  }
  catch {
    return null
  }
}

export async function decryptString(
  encString: string,
  key: SymmetricCryptoKey,
): Promise<string | null> {
  if (!encString) return null
  if (!encString.includes('.')) return encString

  const encType = encString.charAt(0)
  if (encType === '0') {
    return encString.substring(2) || encString
  }

  const bytes = await decryptToBytes(encString, key)
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
 * Plaintext is a 64-byte SymmetricCryptoKey (enc + mac).
 */
export async function decryptUserKey(
  encryptedKey: string,
  masterKey: CryptoKey,
): Promise<SymmetricCryptoKey | null> {
  const stretched = await stretchMasterKey(masterKey)
  const keyBytes = await decryptToBytes(encryptedKey, stretched)
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

  if (raw.length >= 64) {
    return importSymmetricKey(raw.subarray(0, 64))
  }

  return null
}

/** Export a CryptoKey or SymmetricCryptoKey to base64 for tab-scoped sessionStorage. */
export async function exportKeyBase64(key: CryptoKey | SymmetricCryptoKey): Promise<string> {
  if ('raw' in key) {
    return toBase64(key.raw)
  }
  const raw = await crypto.subtle.exportKey('raw', key)
  return toBase64(raw)
}

export async function importAesKey(raw: Uint8Array | string): Promise<CryptoKey> {
  const keyBytes = typeof raw === 'string' ? fromBase64(raw) : raw
  return crypto.subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    { name: 'AES-CBC', length: 256 },
    true,
    ['decrypt', 'encrypt'],
  )
}

/** Encrypt plaintext with a SymmetricCryptoKey (type 2 EncString). For tests. */
export async function encryptString(
  plaintext: string,
  key: SymmetricCryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(16))
  const data = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: toArrayBuffer(iv) },
    key.encKey,
    data,
  )
  const ct = new Uint8Array(encrypted)
  const mac = await hmacSha256(key.macKey, fastConcat([iv, ct]))
  return `2.${toBase64(iv)}|${toBase64(ct)}|${toBase64(mac)}`
}
