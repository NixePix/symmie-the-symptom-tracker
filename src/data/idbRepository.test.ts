import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { DB_VERSION, idbRepository } from './idbRepository'
import { describeDiaryRepository } from './repositoryContract'
import type { Diary } from '../domain/types'

// A fresh in-memory IndexedDB for every test, so no test sees another's data.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describeDiaryRepository('idbRepository', () => idbRepository('test'))

describe('idbRepository persistence', () => {
  const diary: Diary = {
    symptoms: [
      { id: 'n', name: 'Nausea', type: 'yesno', archived: true },
      { id: 'h', name: 'Headache', type: 'strength' },
    ],
    entries: { '2026-05-01': { h: 4, n: 1 }, '2026-05-02': { h: 10 } },
    notes: { '2026-05-01': 'rough day' },
  }

  it('data written through one repository is returned unchanged by a newly opened one', async () => {
    const first = idbRepository('persist')
    for (const s of diary.symptoms) await first.putSymptom(s)
    await first.putEntry('2026-05-01', 'h', 4)
    await first.putEntry('2026-05-01', 'n', 1)
    await first.putEntry('2026-05-02', 'h', 10)
    await first.putNote('2026-05-01', 'rough day')

    expect(await idbRepository('persist').load()).toEqual(diary)
  })

  it('creates the database at version 1', async () => {
    await idbRepository('versioned').load()
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('versioned')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    expect(db.version).toBe(DB_VERSION)
    expect(DB_VERSION).toBe(1)
    expect([...db.objectStoreNames].sort()).toEqual(['entries', 'notes', 'symptoms'])
    db.close()
  })

  it('a replaceAll that fails part-way leaves the previous diary stored', async () => {
    const repo = idbRepository('rollback')
    await repo.replaceAll(diary)
    const bad = { ...diary, symptoms: [{ id: 'x', name: (() => 1) as unknown as string, type: 'strength' as const }] }
    // Without `await tx.done.catch(...)` after the abort, tx.done rejects with AbortError and nobody handles it.
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => unhandled.push(reason)
    // tsconfig has no Node types, so reach process through globalThis.
    const nodeProcess = (globalThis as unknown as { process: { on(e: string, f: (r: unknown) => void): void; off(e: string, f: (r: unknown) => void): void } }).process
    nodeProcess.on('unhandledRejection', onUnhandled)
    const error = await repo.replaceAll(bad).then(() => undefined, (e: unknown) => e)
    await new Promise((resolve) => setTimeout(resolve, 20))
    nodeProcess.off('unhandledRejection', onUnhandled)
    expect(error).toBeDefined()
    expect((error as { name?: string }).name).not.toBe('AbortError')
    expect(unhandled).toEqual([])
    expect(await idbRepository('rollback').load()).toEqual(diary)
  })
})
