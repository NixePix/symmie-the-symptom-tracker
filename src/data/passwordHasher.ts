/**
 * Password hashing for the local lock (design §1, §8 slice 3): PBKDF2-SHA256 through Web Crypto with a
 * random 16-byte salt. The iteration count is stored with the hash, so raising `PBKDF2_ITERATIONS`
 * later does not lock out existing accounts: `verifyPassword` uses the stored count.
 */

/** The OWASP figure for PBKDF2-HMAC-SHA256. */
export const PBKDF2_ITERATIONS = 600_000

/** What is stored on the phone. `salt` and `hash` are base64. The password itself is never stored. */
export interface PasswordHash {
  salt: string
  hash: string
  iterations: number
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0))

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return new Uint8Array(bits)
}

/** Hashes `password` with a new random salt. `iterations` is a parameter so tests can use a low count. */
export async function hashPassword(password: string, iterations = PBKDF2_ITERATIONS): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { salt: toBase64(salt), hash: toBase64(await derive(password, salt, iterations)), iterations }
}

/** True when `password` hashes to `stored` with the stored salt and iteration count. */
export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const derived = await derive(password, fromBase64(stored.salt) as Uint8Array<ArrayBuffer>, stored.iterations)
  const expected = fromBase64(stored.hash)
  if (derived.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i]
  return diff === 0
}
