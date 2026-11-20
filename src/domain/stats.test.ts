import { evolutionSeries, symptomsWithData, topSymptoms } from './stats'
import type { Diary } from './types'

const TODAY = '2026-11-11'
const sym = (id: string, type: 'strength' | 'yesno' = 'strength', archived = false) => ({ id, name: id.toUpperCase(), type, archived })

describe('topSymptoms', () => {
  it('returns the five symptoms with the most logged days, most first, ties in creation order', () => {
    const symptoms = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => sym(id))
    const entries: Diary['entries'] = {
      '2026-11-01': { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1, g: 1 },
      '2026-11-02': { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 },
      '2026-11-03': { g: 1, f: 1, c: 1 },
      '2026-11-04': { g: 1 },
    }
    expect(topSymptoms({ symptoms, entries, notes: {} }).map((s) => s.id)).toEqual(['c', 'f', 'g', 'a', 'b'])
  })

  it('shows every symptom that has a value when there are fewer than five, and skips ones with none', () => {
    const symptoms = [sym('a'), sym('b'), sym('c')]
    const entries = { '2026-11-01': { a: 1 }, '2026-11-02': { b: 2 } }
    expect(topSymptoms({ symptoms, entries, notes: {} }).map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('keeps an archived symptom, which competes for the top five by its day count (entries stay in the graph)', () => {
    const symptoms = [sym('a'), sym('d', 'strength', true), sym('e')]
    const entries = { '2026-11-01': { a: 1, d: 5, e: 1 }, '2026-11-02': { d: 2, e: 3 } }
    expect(topSymptoms({ symptoms, entries, notes: {} }).map((s) => s.id)).toEqual(['d', 'e', 'a'])
  })
})

describe('evolutionSeries', () => {
  const diary: Diary = {
    symptoms: [sym('a'), sym('y', 'yesno')],
    entries: {
      '2026-11-11': { a: 4, y: 1 },
      '2026-11-09': { a: 8, y: 0 },
      '2026-11-05': { a: 2 },
      '2026-10-20': { a: 6, y: 1 },
    },
    notes: {},
  }

  it('day mode: ten buckets ending today, a day without a value is null, not 0', () => {
    const { buckets, series } = evolutionSeries(diary, 'day', TODAY)
    expect(buckets).toHaveLength(10)
    expect(buckets[0].label).toBe('2')
    expect(buckets[9].label).toBe('11')
    const a = series.find((s) => s.symptom.id === 'a')!
    expect(a.points).toEqual([null, null, null, 2, null, null, null, 8, null, 4])
  })

  it('week mode: each bucket is the 7 days ending 7×k days before today, averaged', () => {
    const { buckets, series } = evolutionSeries(diary, 'week', TODAY)
    expect(buckets).toHaveLength(10)
    expect(buckets[9].label).toBe('This week')
    const a = series.find((s) => s.symptom.id === 'a')!
    // this week 05-11..11-11: 4, 8, 2 → 14/3; two weeks back (10-29..11-04) none; 10-20 is in 10-15..10-21 (3 weeks back)
    expect(a.points[9]).toBeCloseTo(14 / 3)
    expect(a.points[8]).toBeNull()
    expect(a.points[6]).toBe(6)
  })

  it('month mode: calendar months, current last, averaged', () => {
    const { buckets, series } = evolutionSeries(diary, 'month', TODAY)
    expect(buckets.map((b) => b.label).slice(-2)).toEqual(['Oct', 'Nov'])
    const a = series.find((s) => s.symptom.id === 'a')!
    expect(a.points[9]).toBeCloseTo(14 / 3)
    expect(a.points[8]).toBe(6)
    expect(a.points[7]).toBeNull()
  })

  it('a yes/no symptom is the share of days answered yes, on the 0–10 axis (×10)', () => {
    const { series } = evolutionSeries(diary, 'week', TODAY)
    const y = series.find((s) => s.symptom.id === 'y')!
    expect(y.points[9]).toBeCloseTo(5) // 1 of 2 days yes
    expect(y.points[6]).toBe(10)
    expect(y.points[8]).toBeNull()
  })

  it('a day-mode yes/no point is 10 for yes and 0 for no (a real no is a zero, not a gap)', () => {
    const y = evolutionSeries(diary, 'day', TODAY).series.find((s) => s.symptom.id === 'y')!
    expect(y.points[7]).toBe(0)
    expect(y.points[8]).toBeNull()
    expect(y.points[9]).toBe(10)
  })
})

describe('symptomsWithData', () => {
  it('lists every symptom with a value, not only five, most logged days first', () => {
    const symptoms = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => sym(id))
    const entries: Diary['entries'] = { '2026-11-01': Object.fromEntries(symptoms.map((s) => [s.id, 1])), '2026-11-02': { g: 1 } }
    expect(symptomsWithData({ symptoms, entries, notes: {} }).map((s) => s.id)).toEqual(['g', 'a', 'b', 'c', 'd', 'e', 'f'])
  })
})
