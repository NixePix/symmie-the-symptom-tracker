import type { DayKey, Diary, Symptom, SymptomId, SymptomType } from './types'
import { addDays } from './dates'

export type DiaryAction =
  | { type: 'addSymptom'; id: SymptomId; name: string; symptomType: SymptomType }
  | { type: 'renameSymptom'; id: SymptomId; name: string }
  | { type: 'archiveSymptom'; id: SymptomId }
  | { type: 'unarchiveSymptom'; id: SymptomId }
  | { type: 'setValue'; day: DayKey; id: SymptomId; value: number }
  | { type: 'clearValue'; day: DayKey; id: SymptomId }
  | { type: 'setNote'; day: DayKey; text: string }
  | { type: 'restore'; diary: Diary }

const mapSymptom = (diary: Diary, id: SymptomId, f: (s: Symptom) => Symptom): Diary => ({
  ...diary,
  symptoms: diary.symptoms.map((s) => (s.id === id ? f(s) : s)),
})

/** Pure: no I/O and no clock. The caller generates ids. Never mutates `diary`. */
export function diaryReducer(diary: Diary, action: DiaryAction): Diary {
  switch (action.type) {
    case 'addSymptom':
      return { ...diary, symptoms: [...diary.symptoms, { id: action.id, name: action.name, type: action.symptomType }] }
    case 'renameSymptom':
      return mapSymptom(diary, action.id, (s) => ({ ...s, name: action.name }))
    case 'archiveSymptom':
      return mapSymptom(diary, action.id, (s) => ({ ...s, archived: true }))
    case 'unarchiveSymptom':
      return mapSymptom(diary, action.id, ({ archived: _archived, ...s }) => {
        void _archived
        return s
      })
    case 'setValue':
      return {
        ...diary,
        entries: { ...diary.entries, [action.day]: { ...diary.entries[action.day], [action.id]: action.value } },
      }
    case 'clearValue': {
      const { [action.id]: _removed, ...rest } = diary.entries[action.day] ?? {}
      void _removed
      const { [action.day]: _day, ...otherDays } = diary.entries
      void _day
      return { ...diary, entries: Object.keys(rest).length ? { ...otherDays, [action.day]: rest } : otherDays }
    }
    case 'setNote': {
      const { [action.day]: _old, ...others } = diary.notes
      void _old
      return { ...diary, notes: action.text === '' ? others : { ...others, [action.day]: action.text } }
    }
    case 'restore':
      return action.diary
  }
}

/**
 * Why `name` cannot be given to a symptom, or null if it can. Archived symptoms do not count as
 * duplicates. Pass `exceptId` when renaming or restoring, so the symptom does not clash with itself.
 */
export function symptomNameError(diary: Diary, name: string, exceptId?: SymptomId): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Type a name.'
  const taken = diary.symptoms.some((s) => !s.archived && s.id !== exceptId && s.name.toLowerCase() === trimmed.toLowerCase())
  return taken ? 'You already have that symptom.' : null
}

/**
 * The active symptoms in the order the log screen steps through them for `day`: those with a value
 * on the previous day first, then the rest, each group in creation order.
 */
export function symptomsForLogging(diary: Diary, day: DayKey): Symptom[] {
  const previous = diary.entries[addDays(day, -1)] ?? {}
  const active = diary.symptoms.filter((s) => !s.archived)
  return [...active.filter((s) => s.id in previous), ...active.filter((s) => !(s.id in previous))]
}
