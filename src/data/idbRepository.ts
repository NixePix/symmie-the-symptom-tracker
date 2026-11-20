/**
 * IndexedDB `DiaryRepository` over the `idb` wrapper. Stores, so that logging one value writes one
 * small record (design §5.7): `symptoms` (key `id`, with a `seq` giving creation order), `entries`
 * (key `[day, id]`, index `day`) and `notes` (key `day`).
 *
 * Schema changes after version 1 are further steps in `upgrade`, each guarded by `oldVersion`, so
 * existing diaries are migrated, never recreated.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DayKey, Diary, Symptom, SymptomId } from '../domain/types'
import type { DiaryRepository } from './DiaryRepository'

export const DB_VERSION = 1

type SymptomRecord = Symptom & { seq: number }
interface EntryRecord {
  day: DayKey
  id: SymptomId
  value: number
}

interface DiaryDB extends DBSchema {
  symptoms: { key: SymptomId; value: SymptomRecord }
  entries: { key: [DayKey, SymptomId]; value: EntryRecord }
  notes: { key: DayKey; value: { day: DayKey; text: string } }
}

function openDiaryDB(name: string): Promise<IDBPDatabase<DiaryDB>> {
  return openDB<DiaryDB>(name, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('symptoms', { keyPath: 'id' })
        db.createObjectStore('entries', { keyPath: ['day', 'id'] })
        db.createObjectStore('notes', { keyPath: 'day' })
      }
    },
  })
}

/** `name` is the database name; open the same name again to read what an earlier instance wrote. */
export function idbRepository(name = 'symmie'): DiaryRepository {
  const dbPromise = openDiaryDB(name)

  return {
    async load() {
      const db = await dbPromise
      const tx = db.transaction(['symptoms', 'entries', 'notes'])
      const [symptomRecords, entryRecords, noteRecords] = await Promise.all([
        tx.objectStore('symptoms').getAll(),
        tx.objectStore('entries').getAll(),
        tx.objectStore('notes').getAll(),
      ])
      const diary: Diary = {
        symptoms: symptomRecords.sort((a, b) => a.seq - b.seq).map(({ seq: _seq, ...s }) => (void _seq, s)),
        entries: {},
        notes: {},
      }
      for (const { day, id, value } of entryRecords) (diary.entries[day] ??= {})[id] = value
      for (const { day, text } of noteRecords) diary.notes[day] = text
      return diary
    },

    async putSymptom(symptom) {
      const db = await dbPromise
      const tx = db.transaction('symptoms', 'readwrite')
      const store = tx.objectStore('symptoms')
      const existing = await store.get(symptom.id)
      const seq = existing?.seq ?? (await store.getAll()).reduce((max, s) => Math.max(max, s.seq), 0) + 1
      await store.put({ ...symptom, seq })
      await tx.done
    },

    async putEntry(day, id, value) {
      const db = await dbPromise
      if (value === undefined) await db.delete('entries', [day, id])
      else await db.put('entries', { day, id, value })
    },

    async putNote(day, text) {
      const db = await dbPromise
      if (text === '') await db.delete('notes', day)
      else await db.put('notes', { day, text })
    },

    async replaceAll(diary) {
      const db = await dbPromise
      const tx = db.transaction(['symptoms', 'entries', 'notes'], 'readwrite')
      try {
        await Promise.all([tx.objectStore('symptoms').clear(), tx.objectStore('entries').clear(), tx.objectStore('notes').clear()])
        diary.symptoms.forEach((s, i) => tx.objectStore('symptoms').put({ ...s, seq: i + 1 }))
        for (const [day, values] of Object.entries(diary.entries)) {
          for (const [id, value] of Object.entries(values)) tx.objectStore('entries').put({ day, id, value })
        }
        for (const [day, text] of Object.entries(diary.notes)) tx.objectStore('notes').put({ day, text })
        await tx.done
      } catch (error) {
        // A request that throws synchronously (e.g. an uncloneable value) leaves the transaction open.
        try {
          tx.abort()
        } catch {
          /* already aborted */
        }
        await tx.done.catch(() => undefined)
        throw error
      }
    },
  }
}
