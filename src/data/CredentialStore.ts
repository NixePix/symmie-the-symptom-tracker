import type { PasswordHash } from './passwordHasher'

/** The one account on this phone: the username and the salted password hash. Never the password. */
export interface Account extends PasswordHash {
  username: string
}

/** Where the account is kept on the phone. `idbCredentialStore` in the app, `memoryCredentialStore` in tests. */
export interface CredentialStore {
  /** The stored account, or `null` on first run. */
  load(): Promise<Account | null>
  /** Stores the account, replacing any earlier one. */
  save(account: Account): Promise<void>
  /** Deletes the account, so the next launch is a first run. */
  clear(): Promise<void>
}
