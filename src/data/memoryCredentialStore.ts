import type { Account, CredentialStore } from './CredentialStore'

/** In-memory `CredentialStore` for tests. */
export function memoryCredentialStore(): CredentialStore {
  let account: Account | null = null
  return {
    async load() {
      return account && { ...account }
    },
    async save(a) {
      account = { ...a }
    },
    async clear() {
      account = null
    },
  }
}
