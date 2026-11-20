import styles from './SymptomStep.module.css'

interface Props {
  name: string
  /** 0 for no, 1 for yes, undefined when not logged. */
  value: number | undefined
  /** The previous day's value, marked but not saved. */
  previous?: number
  onPick(value: number): void
}

export function YesNoChoice({ name, value, previous, onPick }: Props) {
  return (
    <div role="group" aria-label={`${name}, yes or no`} className={styles.yn}>
      <button type="button" aria-pressed={value === 0} className={[styles.half, styles.no, value === 0 && styles.on, previous === 0 && styles.prev].filter(Boolean).join(' ')} onClick={() => onPick(0)}>
        No
      </button>
      <button type="button" aria-pressed={value === 1} className={[styles.half, styles.yes, value === 1 && styles.on, previous === 1 && styles.prev].filter(Boolean).join(' ')} onClick={() => onPick(1)}>
        Yes
      </button>
    </div>
  )
}
