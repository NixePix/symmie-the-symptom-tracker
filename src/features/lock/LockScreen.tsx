import { SetupForm } from './SetupForm'
import { UnlockForm } from './UnlockForm'
import styles from './LockScreen.module.css'

export function LockScreen({ mode }: { mode: 'setup' | 'unlock' }) {
  return (
    <main className={styles.lock}>
      <h1 className={styles.word}>Symmie</h1>
      <p className={styles.tagline}>
        {mode === 'setup' ? 'Your private symptom diary. Pick a name and password.' : 'Welcome back. Unlock your diary.'}
      </p>
      {mode === 'setup' ? <SetupForm /> : <UnlockForm />}
      <p className={styles.note}>🔒 Stored on this phone only. Nothing is sent over the network.</p>
    </main>
  )
}
