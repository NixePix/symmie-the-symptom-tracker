import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { idbCredentialStore } from './idbCredentialStore'
import { memoryCredentialStore } from './memoryCredentialStore'
import type { CredentialStore } from './CredentialStore'

const account = { username: 'anna', salt: 'c2FsdA==', hash: 'aGFzaA==', iterations: 1000 }

function describeStore(name: string, make: () => CredentialStore) {
  describe(name, () => {
    it('loads null before an account is saved', async () => {
      expect(await make().load()).toBeNull()
    })

    it('loads what was saved', async () => {
      const store = make()
      await store.save(account)
      expect(await store.load()).toEqual(account)
    })

    it('erases the account on clear', async () => {
      const store = make()
      await store.save(account)
      await store.clear()
      expect(await store.load()).toBeNull()
    })
  })
}

describeStore('memoryCredentialStore', () => memoryCredentialStore())

describe('idbCredentialStore', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
  })
  describeStore('behaviour', () => idbCredentialStore('test-account'))

  it('persists across instances: a second store on the same database sees the account', async () => {
    await idbCredentialStore('test-account').save(account)
    expect(await idbCredentialStore('test-account').load()).toEqual(account)
  })
})
