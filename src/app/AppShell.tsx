import type { ReactNode } from 'react'
import '../ui/tokens.css'
import styles from './AppShell.module.css'

/** The page frame: the app name, then the screen passed as `children`. */
export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <main className={styles.shell}>
      <h1 className={styles.word}>Symmie</h1>
      {children ?? <p className={styles.tagline}>Symptom diary</p>}
    </main>
  )
}
