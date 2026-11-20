import { BACKUP_VERSION, createBackup, parseBackup } from './backup'
import type { Diary } from './types'

const diary: Diary = {
  symptoms: [{ id: 'a', name: 'Headache', type: 'strength', archived: true }],
  entries: { '2026-05-01': { a: 4 } },
  notes: { '2026-05-01': 'hi' },
}

describe('backup', () => {
  it('has a numeric version field', () => {
    expect(createBackup(diary)).toMatchObject({ version: BACKUP_VERSION })
    expect(typeof createBackup(diary).version).toBe('number')
  })

  it('round-trips through JSON text', () => {
    expect(parseBackup(JSON.parse(JSON.stringify(createBackup(diary))))).toEqual(diary)
  })

  it.each([
    ['not an object', 'x'],
    ['no version', { diary }],
    ['a newer version', { version: BACKUP_VERSION + 1, diary }],
    ['no diary', { version: BACKUP_VERSION }],
    ['a bad symptom type', { version: 1, diary: { ...diary, symptoms: [{ id: 'a', name: 'x', type: 'other' }] } }],
    ['a bad day key', { version: 1, diary: { ...diary, entries: { yesterday: { a: 1 } } } }],
    ['an out-of-range value', { version: 1, diary: { ...diary, entries: { '2026-05-01': { a: 11 } } } }],
    ['a value for an unknown symptom', { version: 1, diary: { ...diary, entries: { '2026-05-01': { zzz: 1 } } } }],
  ])('rejects %s', (_label, input) => {
    expect(() => parseBackup(input)).toThrow()
  })
})
