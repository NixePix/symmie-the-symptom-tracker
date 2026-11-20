import type { ReactNode } from 'react'
import { LockScreen } from '../features/lock/LockScreen'
import { useSession } from '../state/SessionProvider'

/** Renders `children` only while the session is unlocked; otherwise the lock screen (nothing while loading). */
export function LockGate({ children }: { children: ReactNode }) {
  const { status } = useSession()
  if (status === 'loading') return null
  if (status === 'unlocked') return children
  return <LockScreen mode={status === 'first-run' ? 'setup' : 'unlock'} />
}
