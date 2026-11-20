/**
 * IndexedDB `CredentialStore`. It uses its own database (default `symmie-account`), apart from the
 * diary's, so a diary schema upgrade never touches the account and erasing one does not erase the other.
 */
import { openDB } from 'idb'
import type { CredentialStore } from './CredentialStore'

const STORE = 'account'
const KEY = 'account'

export function idbCredentialStore(name = 'symmie-account'): CredentialStore {
  const dbPromise = openDB(name, 1, {
    upgrade(db) {
      db.createObjectStore(STORE)
    },
  })
  return {
    async load() {
      return (await (await dbPromise).get(STORE, KEY)) ?? null
    },
    async save(account) {
      await (await dbPromise).put(STORE, account, KEY)
    },
    async clear() {
      await (await dbPromise).delete(STORE, KEY)
    },
  }
}
