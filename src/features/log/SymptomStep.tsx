import type { Symptom } from '../../domain/types'
import { SeverityScale } from './SeverityScale'
import { YesNoChoice } from './YesNoChoice'
import styles from './SymptomStep.module.css'

interface Props {
  symptom: Symptom
  /** The value on the open day, if any. */
  value: number | undefined
  /** The value on the day before the open day, if the symptom was logged then. `label` names that day ("yesterday"). */
  previous?: { value: number; label: string }
  onPick(value: number): void
  /** Deletes the value on the open day; the button shows only when there is one. */
  onClear(): void
}

const valueText = (symptom: Symptom, value: number) => (symptom.type === 'yesno' ? (value === 1 ? 'Yes' : 'No') : String(value))

/**
 * One symptom: its name and the control for its type. When the previous day has a value, that value is
 * marked on the control and a "Same as" button saves it through `onPick`, like any other choice.
 * Does not know the date.
 */
export function SymptomStep({ symptom, value, previous, onPick, onClear }: Props) {
  return (
    <section className={styles.step}>
      <h3 className={styles.name}>{symptom.name}</h3>
      {previous && value !== previous.value && (
        <button type="button" className={styles.same} onClick={() => onPick(previous.value)}>
          Same as {previous.label}: {valueText(symptom, previous.value)}
        </button>
      )}
      {symptom.type === 'strength' ? (
        <SeverityScale name={symptom.name} value={value} previous={previous} onPick={onPick} />
      ) : (
        <YesNoChoice name={symptom.name} value={value} previous={previous?.value} onPick={onPick} />
      )}
      {value !== undefined && (
        <button type="button" className={styles.same} onClick={onClear}>
          Clear value
        </button>
      )}
    </section>
  )
}
