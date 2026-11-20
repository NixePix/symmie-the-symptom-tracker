import type { DayKey, Diary, Symptom, SymptomId } from '../domain/types'

/**
 * The only way the app reads or writes the diary. `memoryRepository` (tests) and `idbRepository`
 * (the app) both pass `describeDiaryRepository` in `repositoryContract.ts`.
 */
export interface DiaryRepository {
  /** The whole diary. Symptoms come back in the order they were first saved. */
  load(): Promise<Diary>
  /** Adds the symptom, or replaces the stored one with the same id (keeping its position). */
  putSymptom(symptom: Symptom): Promise<void>
  /** Stores the value for (day, symptom), replacing any earlier one; `undefined` deletes it. */
  putEntry(day: DayKey, id: SymptomId, value?: number): Promise<void>
  /** Stores the note for `day`; empty text deletes it. */
  putNote(day: DayKey, text: string): Promise<void>
  /** Replaces everything. All or nothing: if it rejects, the previous diary is still stored. */
  replaceAll(diary: Diary): Promise<void>
}
