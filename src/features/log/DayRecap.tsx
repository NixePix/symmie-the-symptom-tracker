import { severityColor } from '../../domain/severity'
import type { DayKey, Symptom } from '../../domain/types'
import { DayNoteField } from './DayNoteField'
import styles from './DayRecap.module.css'

interface Props {
  symptoms: Symptom[]
  /** Symptom id to value, for the open day. */
  values: Record<string, number>
  day: DayKey
  /** The stored note for the open day, if any. */
  note: string | undefined
  onOpen(step: number): void
  onSaveNote(day: DayKey, text: string): void
}

const show = (s: Symptom, v: number | undefined) => (v === undefined ? '–' : s.type === 'yesno' ? (v ? 'Yes' : 'No') : String(v))

/** The last step: the day as one tile per symptom. Tapping a tile returns to that symptom. */
export function DayRecap({ symptoms, values, day, note, onOpen, onSaveNote }: Props) {
  return (
    <section aria-label="Overview">
      <div className={styles.recap}>
      {symptoms.map((s, i) => {
        const v = values[s.id]
        const colour = v === undefined ? '#2a2548' : s.type === 'yesno' ? (v ? severityColor(10) : '#3b3660') : severityColor(v)
        return (
          <button key={s.id} type="button" className={styles.tile} style={{ '--c': colour } as React.CSSProperties} onClick={() => onOpen(i)}>
            <small>{s.name}</small>
            <b>{show(s, v)}</b>
          </button>
        )
      })}
      </div>
      <DayNoteField key={day} day={day} saved={note} onSave={onSaveNote} />
    </section>
  )
}
