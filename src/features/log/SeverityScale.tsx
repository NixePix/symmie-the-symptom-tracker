import { severityColor } from '../../domain/severity'
import styles from './SymptomStep.module.css'

const BANDS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
const LABELS: Record<number, string> = { 1: 'barely there', 4: 'noticeable', 7: 'strong', 10: 'worst' }

interface Props {
  name: string
  value: number | undefined
  /** The previous day's value, marked on its band but not saved. */
  previous?: { value: number; label: string }
  onPick(value: number): void
}

/** Ten full-width bands, 10 at the top. */
export function SeverityScale({ name, value, previous, onPick }: Props) {
  return (
    <div role="group" aria-label={`${name} strength`} className={styles.scale}>
      {BANDS.map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={value === k}
          className={[styles.band, value === k && styles.on, previous?.value === k && styles.prev].filter(Boolean).join(' ')}
          style={{ '--c': severityColor(k) } as React.CSSProperties}
          onClick={() => onPick(k)}
        >
          <b>{k}</b>
          <span>{[LABELS[k], previous?.value === k && previous.label].filter(Boolean).join(' · ')}</span>
        </button>
      ))}
    </div>
  )
}
