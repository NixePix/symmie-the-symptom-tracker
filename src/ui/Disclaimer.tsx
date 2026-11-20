import type { ReactNode } from 'react'
import styles from './Disclaimer.module.css'

interface Props {
  /** Accessible name of the note. */
  label?: string
  children: ReactNode
}

/** A boxed notice for text the user must see but may not act on, such as "not medical advice". */
export function Disclaimer({ label, children }: Props) {
  return (
    <aside role="note" aria-label={label} className={styles.box}>
      {children}
    </aside>
  )
}
