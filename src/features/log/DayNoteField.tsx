import { useEffect, useRef, useState } from 'react'
import type { DayKey } from '../../domain/types'
import { Button } from '../../ui/Button'
import styles from './DayNoteField.module.css'

export const NOTE_SAVE_DELAY_MS = 400

interface Props {
  day: DayKey
  /** The stored note for `day`; read once, as the starting draft. Mount with `key={day}`. */
  saved: string | undefined
  onSave(day: DayKey, text: string): void
}

/**
 * The note for one day. Typing edits a local draft and `onSave` is called `NOTE_SAVE_DELAY_MS` after
 * the last keystroke, so each keystroke does not write to storage. A save still waiting when the field
 * unmounts (the day changed) is made then, so the text is not lost. Delete saves empty text at once.
 */
export function DayNoteField({ day, saved, onSave }: Props) {
  const [draft, setDraft] = useState(saved ?? '')
  const timer = useRef<number | undefined>(undefined)
  const pending = useRef<string | null>(null)
  const save = useRef(onSave)
  useEffect(() => {
    save.current = onSave
  })

  const flush = () => {
    window.clearTimeout(timer.current)
    if (pending.current !== null) save.current(day, pending.current)
    pending.current = null
  }
  useEffect(() => flush, []) // eslint-disable-line react-hooks/exhaustive-deps -- day is fixed for this mount

  const edit = (text: string) => {
    setDraft(text)
    pending.current = text
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, NOTE_SAVE_DELAY_MS)
  }

  const remove = () => {
    setDraft('')
    pending.current = ''
    flush()
  }

  return (
    <div className={styles.note}>
      <label htmlFor={`note-${day}`} className={styles.label}>
        Day note
      </label>
      <textarea
        id={`note-${day}`}
        className={styles.text}
        rows={3}
        value={draft}
        placeholder="Activity, meal, medication…"
        onChange={(e) => edit(e.target.value)}
      />
      {draft !== '' && (
        <Button variant="ghost" onClick={remove}>
          Delete note
        </Button>
      )}
    </div>
  )
}
