import { useId, type ReactNode } from 'react'
import styles from './Card.module.css'

interface Props {
  /** Shown as the card's heading; also names the card as a region. */
  title?: string
  children: ReactNode
}

/** A rounded surface that groups related content. With a `title` it is a labelled region. */
export function Card({ title, children }: Props) {
  const titleId = useId()
  return (
    <section className={styles.card} aria-labelledby={title ? titleId : undefined}>
      {title && (
        <h3 id={titleId} className={styles.title}>
          {title}
        </h3>
      )}
      {children}
    </section>
  )
}
