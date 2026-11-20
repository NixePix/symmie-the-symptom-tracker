/**
 * The lock state of the app (design §4): `loading` while the stored account is read, `first-run` when
 * there is none, `locked` when there is one, `unlocked` once the user has proved the password. The
 * state is held in memory only, so closing the app locks it. `LockGate` and the settings "Lock now"
 * button both read it.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CredentialStore } from '../data/CredentialStore'
import { PBKDF2_ITERATIONS, hashPassword, verifyPassword } from '../data/passwordHasher'

export type SessionStatus = 'loading' | 'first-run' | 'locked' | 'unlocked'

export interface Session {
  status: SessionStatus
  /** Stores a new account (salted hash only) and unlocks. */
  createAccount(username: string, password: string): Promise<void>
  /** Unlocks and returns true if both match the stored account; otherwise stays locked and returns false. */
  unlock(username: string, password: string): Promise<boolean>
  /** Locks again; the next unlock needs the password. */
  lock(): void
}

const SessionContext = createContext<Session | null>(null)

interface Props {
  store: CredentialStore
  /** PBKDF2 iterations for new accounts. Only tests set this, to keep them fast. */
  iterations?: number
  children: ReactNode
}

export function SessionProvider({ store, iterations = PBKDF2_ITERATIONS, children }: Props) {
  const [status, setStatus] = useState<SessionStatus>('loading')

  useEffect(() => {
    let cancelled = false
    store.load().then((account) => {
      if (!cancelled) setStatus(account ? 'locked' : 'first-run')
    })
    return () => {
      cancelled = true
    }
  }, [store])

  const session = useMemo<Session>(
    () => ({
      status,
      async createAccount(username, password) {
        await store.save({ username: username.trim(), ...(await hashPassword(password, iterations)) })
        setStatus('unlocked')
      },
      async unlock(username, password) {
        const account = await store.load()
        if (!account) return false
        // Hash even when the username is wrong, so both mistakes take the same time.
        const passwordOk = await verifyPassword(password, account)
        if (!passwordOk || account.username !== username.trim()) return false
        setStatus('unlocked')
        return true
      },
      lock() {
        setStatus('locked')
      },
    }),
    [status, store, iterations],
  )

  return <SessionContext value={session}>{children}</SessionContext>
}

export function useSession(): Session {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession must be used inside SessionProvider')
  return session
}
