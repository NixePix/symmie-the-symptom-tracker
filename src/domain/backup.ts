/**
 * The backup file: `{ version, diary }`. `version` is the file format, so a future app can read
 * old backups; `parseBackup` refuses a version newer than this build understands.
 */
import { isDayKey } from './dates'
import { isValidValue, type Diary, type Symptom } from './types'

export const BACKUP_VERSION = 1

export interface Backup {
  version: number
  diary: Diary
}

export const createBackup = (diary: Diary): Backup => ({ version: BACKUP_VERSION, diary })

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Returns the diary in `input` (parsed JSON) or raises an Error naming what is wrong. */
export function parseBackup(input: unknown): Diary {
  if (!isRecord(input)) throw new Error('Backup is not an object')
  if (typeof input.version !== 'number') throw new Error('Backup has no version')
  if (input.version > BACKUP_VERSION) throw new Error(`Backup version ${input.version} is newer than this app understands`)
  const d = input.diary
  if (!isRecord(d) || !Array.isArray(d.symptoms) || !isRecord(d.entries) || !isRecord(d.notes)) {
    throw new Error('Backup has no valid diary')
  }
  const symptoms: Symptom[] = d.symptoms.map((s: unknown) => {
    if (!isRecord(s) || typeof s.id !== 'string' || typeof s.name !== 'string' || (s.type !== 'strength' && s.type !== 'yesno')) {
      throw new Error('Backup has an invalid symptom')
    }
    return { id: s.id, name: s.name, type: s.type, ...(s.archived === true ? { archived: true } : {}) }
  })
  const byId = new Map(symptoms.map((s) => [s.id, s]))
  const entries: Diary['entries'] = {}
  for (const [day, values] of Object.entries(d.entries)) {
    if (!isDayKey(day) || !isRecord(values)) throw new Error(`Backup has an invalid day: ${day}`)
    entries[day] = {}
    for (const [id, value] of Object.entries(values)) {
      const symptom = byId.get(id)
      if (!symptom || typeof value !== 'number' || !isValidValue(symptom.type, value)) {
        throw new Error(`Backup has an invalid value on ${day}`)
      }
      entries[day][id] = value
    }
  }
  const notes: Diary['notes'] = {}
  for (const [day, text] of Object.entries(d.notes)) {
    if (!isDayKey(day) || typeof text !== 'string') throw new Error(`Backup has an invalid note on ${day}`)
    notes[day] = text
  }
  return { symptoms, entries, notes }
}
