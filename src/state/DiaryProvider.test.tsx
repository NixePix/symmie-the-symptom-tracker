import { useEffect } from 'react'
import { act, render, screen } from '@testing-library/react'
import { DiaryProvider, useDiary, useDiaryActions, type DiaryActions } from './DiaryProvider'
import { memoryRepository } from '../data/memoryRepository'
import type { DiaryRepository } from '../data/DiaryRepository'
import type { Diary } from '../domain/types'

let actions: DiaryActions

function Probe() {
  const { status, diary, saveFailed } = useDiary()
  const a = useDiaryActions()
  useEffect(() => {
    actions = a
  })
  return (
    <div>
      <p>status: {status}</p>
      <p>symptoms: {diary.symptoms.map((s) => s.name).join(',')}</p>
      <p>entries: {JSON.stringify(diary.entries)}</p>
      <p>saveFailed: {String(saveFailed)}</p>
    </div>
  )
}

const stored: Diary = {
  symptoms: [
    { id: 'a', name: 'Headache', type: 'strength' },
    { id: 'b', name: 'Nausea', type: 'yesno' },
  ],
  entries: { '2026-11-10': { a: 3 } },
  notes: {},
}

function setup(repository: DiaryRepository) {
  let n = 0
  return render(
    <DiaryProvider repository={repository} newId={() => `id${++n}`}>
      <Probe />
    </DiaryProvider>,
  )
}

describe('DiaryProvider', () => {
  it('is loading, then ready with the stored diary', async () => {
    setup(memoryRepository(stored))
    expect(screen.getByText('status: loading')).toBeInTheDocument()
    expect(await screen.findByText('status: ready')).toBeInTheDocument()
    expect(screen.getByText('symptoms: Headache,Nausea')).toBeInTheDocument()
  })

  it('reports status error when the diary cannot be read', async () => {
    const repo = memoryRepository()
    repo.load = () => Promise.reject(new Error('idb'))
    setup(repo)
    expect(await screen.findByText('status: error')).toBeInTheDocument()
  })

  it('setValue shows the value at once and writes it to the repository', async () => {
    const repo = memoryRepository(stored)
    setup(repo)
    await screen.findByText('status: ready')
    await act(async () => actions.setValue('2026-11-11', 'a', 7))
    expect(screen.getByText(/"2026-11-11":\{"a":7\}/)).toBeInTheDocument()
    expect((await repo.load()).entries['2026-11-11']).toEqual({ a: 7 })
  })

  it('setting a value again for the same day and symptom replaces it', async () => {
    const repo = memoryRepository(stored)
    setup(repo)
    await screen.findByText('status: ready')
    await act(async () => actions.setValue('2026-11-10', 'a', 9))
    expect((await repo.load()).entries['2026-11-10']).toEqual({ a: 9 })
    expect(screen.getByText('entries: {"2026-11-10":{"a":9}}')).toBeInTheDocument()
  })

  it.each([0, 11, 5.5, -1, Number.NaN])('ignores %s for a strength symptom: nothing changes, nothing is written', async (value) => {
    const repo = memoryRepository(stored)
    const put = vi.spyOn(repo, 'putEntry')
    setup(repo)
    await screen.findByText('status: ready')
    await act(async () => actions.setValue('2026-11-10', 'a', value))
    expect(screen.getByText('entries: {"2026-11-10":{"a":3}}')).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
  })

  it('accepts only 0 and 1 for a yes/no symptom', async () => {
    const repo = memoryRepository(stored)
    setup(repo)
    await screen.findByText('status: ready')
    await act(async () => actions.setValue('2026-11-10', 'b', 2))
    expect((await repo.load()).entries['2026-11-10']).toEqual({ a: 3 })
    await act(async () => actions.setValue('2026-11-10', 'b', 0))
    expect((await repo.load()).entries['2026-11-10']).toEqual({ a: 3, b: 0 })
  })

  it('addSymptom stores the trimmed name and the type under a new id', async () => {
    const repo = memoryRepository()
    setup(repo)
    await screen.findByText('status: ready')
    await act(async () => actions.addSymptom('  Fatigue ', 'yesno'))
    expect(screen.getByText('symptoms: Fatigue')).toBeInTheDocument()
    expect((await repo.load()).symptoms).toEqual([{ id: 'id1', name: 'Fatigue', type: 'yesno' }])
  })

  it('keeps the value on screen and sets saveFailed when the write rejects', async () => {
    const repo = memoryRepository(stored)
    repo.putEntry = () => Promise.reject(new Error('quota'))
    setup(repo)
    await screen.findByText('status: ready')
    expect(screen.getByText('saveFailed: false')).toBeInTheDocument()
    await act(async () => actions.setValue('2026-11-11', 'a', 7))
    expect(screen.getByText(/"2026-11-11":\{"a":7\}/)).toBeInTheDocument()
    expect(screen.getByText('saveFailed: true')).toBeInTheDocument()
  })

  it('gives components the same actions object after an edit', async () => {
    setup(memoryRepository(stored))
    await screen.findByText('status: ready')
    const before = actions
    await act(async () => actions.setValue('2026-11-11', 'a', 7))
    expect(actions).toBe(before)
  })
})

describe('restore', () => {
  const incoming: Diary = {
    symptoms: [{ id: 'z', name: 'Fatigue', type: 'yesno' }],
    entries: { '2026-01-02': { z: 1 } },
    notes: { '2026-01-02': 'tired' },
  }

  it('replaces the shown diary and everything stored, so old symptoms, values and notes are gone', async () => {
    const repo = memoryRepository({ ...stored, notes: { '2026-11-10': 'old' } })
    setup(repo)
    await screen.findByText('status: ready')
    act(() => actions.restore(incoming))
    expect(screen.getByText('symptoms: Fatigue')).toBeInTheDocument()
    await vi.waitFor(async () => expect(await repo.load()).toEqual(incoming))
  })

  it('keeps the restored diary on screen and sets saveFailed when the write rejects', async () => {
    const repo = memoryRepository(stored)
    repo.replaceAll = () => Promise.reject(new Error('quota'))
    setup(repo)
    await screen.findByText('status: ready')
    await act(async () => actions.restore(incoming))
    expect(screen.getByText('symptoms: Fatigue')).toBeInTheDocument()
    expect(screen.getByText('saveFailed: true')).toBeInTheDocument()
  })
})

describe('setNote', () => {
  it('stores the note for the day, replaces it on a second call and deletes it for empty or blank text', async () => {
    const repo = memoryRepository(stored)
    setup(repo)
    await screen.findByText('status: ready')
    act(() => actions.setNote('2026-11-10', 'Ran'))
    act(() => actions.setNote('2026-11-10', 'Swam'))
    await vi.waitFor(async () => expect((await repo.load()).notes).toEqual({ '2026-11-10': 'Swam' }))
    act(() => actions.setNote('2026-11-10', '  '))
    await vi.waitFor(async () => expect((await repo.load()).notes).toEqual({}))
  })

  describe('correcting and archiving', () => {
    const archivedDiary: Diary = {
      ...stored,
      symptoms: [...stored.symptoms, { id: 'c', name: 'Old', type: 'strength', archived: true }],
    }

    it('renameSymptom stores the trimmed name and keeps the type', async () => {
      const repo = memoryRepository(stored)
      setup(repo)
      await screen.findByText('status: ready')
      act(() => actions.renameSymptom('a', '  Migraine '))
      expect(screen.getByText('symptoms: Migraine,Nausea')).toBeInTheDocument()
      expect((await repo.load()).symptoms[0]).toEqual({ id: 'a', name: 'Migraine', type: 'strength' })
    })

    it('renameSymptom ignores a blank name', async () => {
      setup(memoryRepository(stored))
      await screen.findByText('status: ready')
      act(() => actions.renameSymptom('a', '   '))
      expect(screen.getByText('symptoms: Headache,Nausea')).toBeInTheDocument()
    })

    it('archiveSymptom stores the flag and leaves the entries in the repository', async () => {
      const repo = memoryRepository(stored)
      setup(repo)
      await screen.findByText('status: ready')
      act(() => actions.archiveSymptom('a'))
      const saved = await repo.load()
      expect(saved.symptoms[0].archived).toBe(true)
      expect(saved.entries).toEqual(stored.entries)
    })

    it('unarchiveSymptom stores the symptom without the flag', async () => {
      const repo = memoryRepository(archivedDiary)
      setup(repo)
      await screen.findByText('status: ready')
      act(() => actions.unarchiveSymptom('c'))
      expect((await repo.load()).symptoms[2]).toEqual({ id: 'c', name: 'Old', type: 'strength' })
    })

    it('clearValue deletes the value for that day and symptom in memory and in the repository', async () => {
      const repo = memoryRepository(stored)
      setup(repo)
      await screen.findByText('status: ready')
      act(() => actions.clearValue('2026-11-10', 'a'))
      expect(screen.getByText('entries: {}')).toBeInTheDocument()
      expect((await repo.load()).entries).toEqual({})
    })

    it('ignores an unknown symptom id', async () => {
      const repo = memoryRepository(stored)
      setup(repo)
      await screen.findByText('status: ready')
      act(() => actions.renameSymptom('zzz', 'X'))
      act(() => actions.archiveSymptom('zzz'))
      expect((await repo.load()).symptoms).toEqual(stored.symptoms)
    })
  })
})
