import { emptyDiary, type Diary } from '../domain/types'
import type { DiaryRepository } from './DiaryRepository'

/** In-memory `DiaryRepository` for tests. Starts from `initial` if given. */
export function memoryRepository(initial: Diary = emptyDiary()): DiaryRepository {
  let diary = structuredClone(initial)
  return {
    async load() {
      return structuredClone(diary)
    },
    async putSymptom(symptom) {
      const i = diary.symptoms.findIndex((s) => s.id === symptom.id)
      const copy = structuredClone(symptom)
      if (i >= 0) diary.symptoms[i] = copy
      else diary.symptoms.push(copy)
    },
    async putEntry(day, id, value) {
      const values = { ...diary.entries[day] }
      if (value === undefined) delete values[id]
      else values[id] = value
      if (Object.keys(values).length) diary.entries[day] = values
      else delete diary.entries[day]
    },
    async putNote(day, text) {
      if (text === '') delete diary.notes[day]
      else diary.notes[day] = text
    },
    async replaceAll(next) {
      diary = structuredClone(next)
    },
  }
}
