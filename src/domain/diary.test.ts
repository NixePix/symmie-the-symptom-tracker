import { diaryReducer, symptomNameError, symptomsForLogging } from './diary'
import { emptyDiary, type Diary } from './types'

const base: Diary = {
  symptoms: [
    { id: 'a', name: 'Headache', type: 'strength' },
    { id: 'b', name: 'Nausea', type: 'yesno' },
  ],
  entries: { '2026-05-01': { a: 4 } },
  notes: {},
}

describe('diaryReducer', () => {
  it('addSymptom appends a symptom with the given id', () => {
    const next = diaryReducer(emptyDiary(), { type: 'addSymptom', id: 'x', name: 'Fatigue', symptomType: 'strength' })
    expect(next.symptoms).toEqual([{ id: 'x', name: 'Fatigue', type: 'strength' }])
  })

  it('renameSymptom changes only the named symptom', () => {
    const next = diaryReducer(base, { type: 'renameSymptom', id: 'a', name: 'Migraine' })
    expect(next.symptoms.map((s) => s.name)).toEqual(['Migraine', 'Nausea'])
  })

  it('archiveSymptom sets the flag and keeps its entries', () => {
    const next = diaryReducer(base, { type: 'archiveSymptom', id: 'a' })
    expect(next.symptoms[0].archived).toBe(true)
    expect(next.entries).toEqual(base.entries)
  })

  it('setValue on a new day creates the day', () => {
    const next = diaryReducer(base, { type: 'setValue', day: '2026-05-02', id: 'b', value: 1 })
    expect(next.entries['2026-05-02']).toEqual({ b: 1 })
  })

  it('setValue for the same symptom and day replaces the first value', () => {
    const next = diaryReducer(base, { type: 'setValue', day: '2026-05-01', id: 'a', value: 9 })
    expect(next.entries['2026-05-01']).toEqual({ a: 9 })
  })

  it('setValue does not mutate its input', () => {
    const before = structuredClone(base)
    diaryReducer(base, { type: 'setValue', day: '2026-05-01', id: 'a', value: 9 })
    expect(base).toEqual(before)
  })

  it('clearValue removes the value and drops a day left empty', () => {
    const next = diaryReducer(base, { type: 'clearValue', day: '2026-05-01', id: 'a' })
    expect(next.entries).toEqual({})
  })

  it('setNote stores text and an empty note removes it', () => {
    const withNote = diaryReducer(base, { type: 'setNote', day: '2026-05-01', text: 'rough day' })
    expect(withNote.notes).toEqual({ '2026-05-01': 'rough day' })
    expect(diaryReducer(withNote, { type: 'setNote', day: '2026-05-01', text: '' }).notes).toEqual({})
  })

  it('restore replaces the whole diary', () => {
    expect(diaryReducer(base, { type: 'restore', diary: emptyDiary() })).toEqual(emptyDiary())
  })
})

describe('unarchiveSymptom', () => {
  it('removes the archived flag from that symptom only and keeps entries', () => {
    const archived = diaryReducer(diaryReducer(base, { type: 'archiveSymptom', id: 'a' }), { type: 'archiveSymptom', id: 'b' })
    const next = diaryReducer(archived, { type: 'unarchiveSymptom', id: 'a' })
    expect(next.symptoms[0]).toEqual({ id: 'a', name: 'Headache', type: 'strength' })
    expect(next.symptoms[1].archived).toBe(true)
    expect(next.entries).toEqual(base.entries)
  })
})

describe('symptomNameError with exceptId', () => {
  it('lets a symptom keep or re-case its own name', () => {
    expect(symptomNameError(base, 'headache', 'a')).toBeNull()
  })

  it("still rejects another active symptom's name", () => {
    expect(symptomNameError(base, 'nausea', 'a')).toBe('You already have that symptom.')
  })
})

describe('symptomNameError', () => {
  it('rejects an empty or blank name', () => {
    expect(symptomNameError(base, '')).toBe('Type a name.')
    expect(symptomNameError(base, '   ')).toBe('Type a name.')
  })
  it('rejects a name already in use, ignoring case and surrounding spaces', () => {
    expect(symptomNameError(base, ' headache ')).toBe('You already have that symptom.')
  })
  it('accepts the name of an archived symptom', () => {
    const archived = diaryReducer(base, { type: 'archiveSymptom', id: 'a' })
    expect(symptomNameError(archived, 'Headache')).toBeNull()
  })
  it('accepts a new name', () => {
    expect(symptomNameError(base, 'Fatigue')).toBeNull()
  })
})

describe('symptomsForLogging', () => {
  const three: Diary = {
    ...base,
    symptoms: [...base.symptoms, { id: 'c', name: 'Fatigue', type: 'strength' }, { id: 'd', name: 'Old', type: 'strength', archived: true }],
    entries: { '2026-05-01': { c: 6, d: 2 }, '2026-05-02': {} },
  }

  it('puts the symptoms logged on the previous day first, in their usual order, then the others', () => {
    expect(symptomsForLogging(three, '2026-05-02').map((s) => s.id)).toEqual(['c', 'a', 'b'])
  })

  it('keeps the usual order when the previous day has no entries', () => {
    expect(symptomsForLogging(three, '2026-05-05').map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('leaves out archived symptoms even if they were logged the previous day', () => {
    expect(symptomsForLogging(three, '2026-05-02').map((s) => s.id)).not.toContain('d')
  })
})
