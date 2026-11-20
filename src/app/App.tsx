import { idbCredentialStore } from '../data/idbCredentialStore'
import { idbRepository } from '../data/idbRepository'
import type { CredentialStore } from '../data/CredentialStore'
import type { DiaryRepository } from '../data/DiaryRepository'
import { Screens } from './Screens'
import { ClockProvider } from '../state/ClockProvider'
import { DiaryProvider } from '../state/DiaryProvider'
import { SessionProvider } from '../state/SessionProvider'
import { AppShell } from './AppShell'
import { LockGate } from './LockGate'
import { InstallButton } from '../pwa/InstallButton'

// Created on first use, so importing this file (as a test does, without IndexedDB) opens no database.
let defaultCredentials: CredentialStore | undefined
let defaultRepository: DiaryRepository | undefined

interface Props {
  credentials?: CredentialStore
  repository?: DiaryRepository
  /** PBKDF2 iterations for a new account; only tests lower it. */
  iterations?: number
  now?: () => Date
}

/**
 * Providers and the lock gate. The defaults are the only place the app names the IndexedDB stores
 * (design §5.1); tests pass in-memory ones. `DiaryProvider` sits inside `LockGate`, so the diary is not
 * read from the phone until the user has unlocked.
 */
export function App({ credentials, repository, iterations, now = () => new Date() }: Props) {
  credentials ??= defaultCredentials ??= idbCredentialStore()
  repository ??= defaultRepository ??= idbRepository()
  return (
    <SessionProvider store={credentials} iterations={iterations}>
      <ClockProvider now={now}>
        <InstallButton />
        <LockGate>
          <DiaryProvider repository={repository}>
            <AppShell>
              <Screens />
            </AppShell>
          </DiaryProvider>
        </LockGate>
      </ClockProvider>
    </SessionProvider>
  )
}
