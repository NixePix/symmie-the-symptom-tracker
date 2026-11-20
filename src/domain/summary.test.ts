import { notesInRange, rangeChart, rangeStats } from './summary'
import type { Diary } from './types'

const diary: Diary = {
  symptoms: [
    { id: 'a', name: 'Headache', type: 'strength' },
    { id: 'b', name: 'Nausea', type: 'yesno' },
    { id: 'c', name: 'Back', type: 'strength', archived: true },
    { id: 'd', name: 'Cough', type: 'strength' },
  ],
  entries: {
    '2026-10-31': { a: 10 },
    '2026-11-02': { a: 2, b: 1, c: 9 },
    '2026-11-03': { a: 6, b: 0 },
    '2026-11-05': { a: 4, b: 1 },
    '2026-11-20': { a: 8 },
  },
  notes: { '2026-11-05': '  Slept badly ', '2026-11-02': 'Rain', '2026-11-03': '   ', '2026-12-01': 'later' },
}

describe('rangeStats', () => {
  it('gives each symptom its average, highest value and days logged inside the range only', () => {
    const stats = rangeStats(diary, '2026-11-01', '2026-11-10')
    const a = stats.find((s) => s.symptom.id === 'a')!
    expect(a).toMatchObject({ days: 3, highest: 6 })
    expect(a.average).toBeCloseTo(4)
  })

  it('counts a yes/no symptom as the share of days answered yes, highest 1 when any day is yes', () => {
    const b = rangeStats(diary, '2026-11-01', '2026-11-10').find((s) => s.symptom.id === 'b')!
    expect(b).toMatchObject({ days: 3, highest: 1 })
    expect(b.average).toBeCloseTo(2 / 3)
  })

  it('includes archived symptoms, leaves out symptoms with no value in the range, and puts the most logged first', () => {
    const stats = rangeStats(diary, '2026-11-01', '2026-11-10')
    expect(stats.map((s) => s.symptom.id)).toEqual(['a', 'b', 'c'])
  })

  it('includes both end days', () => {
    expect(rangeStats(diary, '2026-11-02', '2026-11-02').map((s) => s.days)).toEqual([1, 1, 1])
    expect(rangeStats(diary, '2026-10-31', '2026-10-31')[0]).toMatchObject({ highest: 10, days: 1 })
  })
})

describe('notesInRange', () => {
  it('returns non-blank notes inside the range, oldest day first, with the text trimmed', () => {
    expect(notesInRange(diary, '2026-11-01', '2026-11-30')).toEqual([
      { day: '2026-11-02', text: 'Rain' },
      { day: '2026-11-05', text: 'Slept badly' },
    ])
  })
})

describe('rangeChart', () => {
  it('uses one bucket per day for a range of up to ten days, labelled with the day of the month', () => {
    const { buckets, series } = rangeChart(diary, '2026-11-01', '2026-11-05')
    expect(buckets.map((b) => b.label)).toEqual(['1', '2', '3', '4', '5'])
    expect(series[0].symptom.id).toBe('a')
    expect(series[0].points).toEqual([null, 2, 6, null, 4])
  })

  it('groups a longer range into at most ten consecutive buckets that cover every day once, and averages inside a bucket', () => {
    const { buckets, series } = rangeChart(diary, '2026-10-31', '2026-11-20')
    expect(buckets).toHaveLength(7)
    const days = buckets.flatMap((b) => b.days)
    expect(days[0]).toBe('2026-10-31')
    expect(days).toHaveLength(21)
    expect(new Set(days).size).toBe(21)
    expect(buckets[0].days).toHaveLength(3)
    expect(series[0].points[0]).toBe(6) // mean of 10 (31 Oct) and 2 (2 Nov); 1 Nov has no value
  })

  it('keeps only the five symptoms logged on most days in the range', () => {
    const many: Diary = {
      symptoms: ['1', '2', '3', '4', '5', '6'].map((id) => ({ id, name: id, type: 'strength' as const })),
      entries: { '2026-11-01': { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }, '2026-11-02': { 1: 1, 2: 1, 3: 1, 4: 1, 6: 1 } },
      notes: {},
    }
    expect(rangeChart(many, '2026-11-01', '2026-11-02').series.map((s) => s.symptom.id)).toEqual(['1', '2', '3', '4', '6'])
  })
})
