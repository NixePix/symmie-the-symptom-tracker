import type { Symptom } from '../../domain/types'
import styles from './StepProgress.module.css'

interface Props {
  symptoms: Symptom[]
  /** Symptom ids that have a value on the open day. */
  logged: ReadonlySet<string>
  step: number
  onSelect(step: number): void
}

/** The overview segment first, then one per symptom. Tapping a segment jumps to that step. */
export function StepProgress({ symptoms, logged, step, onSelect }: Props) {
  const segment = (i: number, name: string, done: boolean, overview = false) => (
    <button
      key={i}
      type="button"
      aria-label={name}
      aria-current={i === step ? 'step' : undefined}
      className={[styles.seg, done && styles.done, i === step && styles.cur, overview && styles.overview].filter(Boolean).join(' ')}
      onClick={() => onSelect(i)}
    />
  )
  return (
    <div className={styles.bar}>
      {segment(0, 'Overview', false, true)}
      {symptoms.map((s, i) => segment(i + 1, s.name, logged.has(s.id)))}
    </div>
  )
}
