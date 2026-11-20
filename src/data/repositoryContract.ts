/**
 * The tests every `DiaryRepository` must pass. Each implementation's test file calls
 * `describeDiaryRepository` with a factory returning an empty repository.
 */
import type { Diary, Symptom } from '../domain/types'
import type { DiaryRepository } from './DiaryRepository'

const headache: Symptom = { id: 'h', name: 'Headache', type: 'strength' }
const nausea: Symptom = { id: 'n', name: 'Nausea', type: 'yesno', archived: true }

export function describeDiaryRepository(name: string, create: () => Promise<DiaryRepository> | DiaryRepository) {
  describe(`${name} (DiaryRepository contract)`, () => {
    let repo: DiaryRepository
    beforeEach(async () => {
      repo = await create()
    })

    it('loads an empty diary from a new repository', async () => {
      expect(await repo.load()).toEqual({ symptoms: [], entries: {}, notes: {} })
    })

    it('reads back symptoms with name, type and archived flag, in the order saved', async () => {
      await repo.putSymptom(nausea)
      await repo.putSymptom(headache)
      expect((await repo.load()).symptoms).toEqual([nausea, headache])
    })

    it('putSymptom with an existing id replaces it and keeps its position', async () => {
      await repo.putSymptom(headache)
      await repo.putSymptom(nausea)
      await repo.putSymptom({ ...headache, name: 'Migraine', archived: true })
      expect((await repo.load()).symptoms).toEqual([{ ...headache, name: 'Migraine', archived: true }, nausea])
    })

    it('reads back entries per day and symptom', async () => {
      await repo.putEntry('2026-05-01', 'h', 4)
      await repo.putEntry('2026-05-01', 'n', 1)
      await repo.putEntry('2026-05-02', 'h', 10)
      expect((await repo.load()).entries).toEqual({ '2026-05-01': { h: 4, n: 1 }, '2026-05-02': { h: 10 } })
    })

    it('a second value for the same symptom and day replaces the first', async () => {
      await repo.putEntry('2026-05-01', 'h', 4)
      await repo.putEntry('2026-05-01', 'h', 7)
      expect((await repo.load()).entries).toEqual({ '2026-05-01': { h: 7 } })
    })

    it('putEntry with no value deletes it, and a day left empty disappears', async () => {
      await repo.putEntry('2026-05-01', 'h', 4)
      await repo.putEntry('2026-05-01', 'n', 0)
      await repo.putEntry('2026-05-01', 'h')
      expect((await repo.load()).entries).toEqual({ '2026-05-01': { n: 0 } })
      await repo.putEntry('2026-05-01', 'n')
      expect((await repo.load()).entries).toEqual({})
    })

    it('stores an optional note per day; empty text deletes it', async () => {
      await repo.putNote('2026-05-01', 'rough')
      await repo.putNote('2026-05-01', 'rougher')
      await repo.putNote('2026-05-02', 'fine')
      expect((await repo.load()).notes).toEqual({ '2026-05-01': 'rougher', '2026-05-02': 'fine' })
      await repo.putNote('2026-05-01', '')
      expect((await repo.load()).notes).toEqual({ '2026-05-02': 'fine' })
    })

    it('replaceAll swaps the whole diary', async () => {
      await repo.putSymptom(headache)
      await repo.putEntry('2026-05-01', 'h', 4)
      await repo.putNote('2026-05-01', 'old')
      const next: Diary = {
        symptoms: [nausea],
        entries: { '2026-06-01': { n: 1 } },
        notes: { '2026-06-01': 'new' },
      }
      await repo.replaceAll(next)
      expect(await repo.load()).toEqual(next)
    })

    it('a returned diary is a copy: editing it does not change what is stored', async () => {
      await repo.putEntry('2026-05-01', 'h', 4)
      const loaded = await repo.load()
      loaded.entries['2026-05-01'].h = 9
      expect((await repo.load()).entries['2026-05-01'].h).toBe(4)
    })
  })
}
