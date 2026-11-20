/** The diary's data model. No React and no I/O in `domain/`. */

/** Local calendar date, `YYYY-MM-DD`; see `dates.ts`. */
export type DayKey = string
export type SymptomId = string

/** `strength` is rated 1–10; `yesno` is stored as 0 (no) or 1 (yes). The type cannot change after creation. */
export type SymptomType = 'strength' | 'yesno'

export interface Symptom {
  id: SymptomId
  name: string
  type: SymptomType
  archived?: boolean
}

/** One value per symptom per day. A symptom with no key for a day was not logged that day. */
export type EntryMap = Record<DayKey, Record<SymptomId, number>>
export type NoteMap = Record<DayKey, string>

export interface Diary {
  /** In the order the user created them. */
  symptoms: Symptom[]
  entries: EntryMap
  notes: NoteMap
}

export const emptyDiary = (): Diary => ({ symptoms: [], entries: {}, notes: {} })

export function isValidValue(type: SymptomType, value: number): boolean {
  return type === 'yesno' ? value === 0 || value === 1 : Number.isInteger(value) && value >= 1 && value <= 10
}
