import { MIN_DAYS, pairCorrelations, seasonAverages, strongestPairs, weekdayAverages } from './patterns'
import { addDays } from './dates'
import type { Diary, Symptom } from './types'

const strength = (id: string, archived = false): Symptom => ({ id, name: id.toUpperCase(), type: 'strength', archived })
const yesno = (id: string): Symptom => ({ id, name: id.toUpperCase(), type: 'yesno' })

/** `n` consecutive days ending 2026-11-11 (a Wednesday), each with the value `f(i)`, i = 0 for the newest day. */
function run(id: string, n: number, f: (i: number) => number | undefined): Diary['entries'] {
  const out: Diary['entries'] = {}
  for (let i = 0; i < n; i++) {
    const v = f(i)
    if (v !== undefined) out[addDays('2026-11-11', -i)] = { [id]: v }
  }
  return out
}
const diaryOf = (symptoms: Symptom[], entries: Diary['entries']): Diary => ({ symptoms, entries, notes: {} })

describe('weekdayAverages', () => {
  it('averages the symptom per weekday, Monday first, and counts the days behind it', () => {
    // 14 days ending Wed 2026-11-11: Mon 2 and 9 Nov → 4 and 8; every other day 5.
    const entries = run('a', 14, (i) => (i === 2 ? 8 : i === 9 ? 4 : 5))
    const r = weekdayAverages(diaryOf([strength('a')], entries), 'a')
    expect(r.days).toBe(14)
    expect(r.averages[0]).toBe(6) // Monday: (4 + 8) / 2
    expect(r.averages[1]).toBe(5)
    expect(r.averages).toHaveLength(7)
  })

  it('a weekday with no value is null, not 0', () => {
    const entries = { '2026-11-09': { a: 3 } } // one Monday
    const r = weekdayAverages(diaryOf([strength('a')], entries), 'a')
    expect(r.averages).toEqual([3, null, null, null, null, null, null])
  })

  it('a yes/no symptom averages to the share of yes days, between 0 and 1', () => {
    const entries = { '2026-11-09': { y: 1 }, '2026-11-02': { y: 0 }, '2026-11-03': { y: 1 } }
    const r = weekdayAverages(diaryOf([yesno('y')], entries), 'y')
    expect(r.averages[0]).toBe(0.5)
    expect(r.averages[1]).toBe(1)
  })

  it('counts an archived symptom (its entries stay in the analysis)', () => {
    const r = weekdayAverages(diaryOf([strength('a', true)], { '2026-11-09': { a: 7 } }), 'a')
    expect(r.averages[0]).toBe(7)
  })
})

describe('seasonAverages', () => {
  const entries = {
    '2026-12-01': { a: 2 }, // winter
    '2026-01-15': { a: 4 }, // winter
    '2026-02-28': { a: 6 }, // winter
    '2026-03-01': { a: 1 }, // spring
    '2026-05-31': { a: 3 }, // spring
    '2026-06-01': { a: 9 }, // summer
    '2026-08-31': { a: 7 }, // summer
    '2026-09-01': { a: 5 }, // autumn
    '2026-11-30': { a: 5 }, // autumn
  }

  it('groups months into winter (Dec–Feb), spring (Mar–May), summer (Jun–Aug), autumn (Sep–Nov), in that order', () => {
    const r = seasonAverages(diaryOf([strength('a')], entries), 'a')
    expect(r.seasons.map((s) => s.name)).toEqual(['Winter', 'Spring', 'Summer', 'Autumn'])
    expect(r.seasons.map((s) => s.average)).toEqual([4, 2, 8, 5])
    expect(r.days).toBe(9)
  })

  it('a season with no value is null, not 0', () => {
    const r = seasonAverages(diaryOf([strength('a')], { '2026-07-01': { a: 5 } }), 'a')
    expect(r.seasons.map((s) => s.average)).toEqual([null, null, 5, null])
  })
})

describe('pairCorrelations', () => {
  const both = (n: number, fb: (i: number) => number): Diary => {
    const entries: Diary['entries'] = {}
    for (let i = 0; i < n; i++) entries[addDays('2026-11-11', -i)] = { a: (i % 5) + 1, b: fb(i) }
    return diaryOf([strength('a'), strength('b')], entries)
  }

  it('is 1 for symptoms that always move together and −1 for opposite ones, over the days both are logged', () => {
    const up = pairCorrelations(both(14, (i) => (i % 5) + 1), [strength('a'), strength('b')])[0]
    expect(up.r).toBeCloseTo(1)
    expect(up.n).toBe(14)
    const down = pairCorrelations(both(14, (i) => 6 - ((i % 5) + 1)), [strength('a'), strength('b')])[0]
    expect(down.r).toBeCloseTo(-1)
  })

  it(`labels a pair with fewer than ${MIN_DAYS} shared days "few-days", with no r, even when the numbers line up`, () => {
    const thirteen = pairCorrelations(both(MIN_DAYS - 1, (i) => (i % 5) + 1), [strength('a'), strength('b')])[0]
    expect(thirteen).toMatchObject({ status: 'few-days', r: null, n: 13 })
    const fourteen = pairCorrelations(both(MIN_DAYS, (i) => (i % 5) + 1), [strength('a'), strength('b')])[0]
    expect(fourteen.status).toBe('ok')
  })

  it('counts only days where both have a value', () => {
    const d = both(30, (i) => (i % 5) + 1)
    for (let i = 0; i < 30; i += 2) delete d.entries[addDays('2026-11-11', -i)].b
    expect(pairCorrelations(d, [strength('a'), strength('b')])[0].n).toBe(15)
  })

  it('a symptom that never changes has no correlation: status "flat"', () => {
    const r = pairCorrelations(both(20, () => 4), [strength('a'), strength('b')])[0]
    expect(r).toMatchObject({ status: 'flat', r: null })
  })

  it('makes one entry per pair, strongest absolute r first, pairs with no r last', () => {
    const entries: Diary['entries'] = {}
    // The strongest pair, b and c, comes last in the order the pairs are generated (ab, ac, bc).
    for (let i = 0; i < 20; i++) entries[addDays('2026-11-11', -i)] = { a: (i * 7) % 5, b: (i % 5) + 1, c: (i % 5) + 1 }
    const syms = [strength('a'), strength('b'), strength('c')]
    const pairs = pairCorrelations(diaryOf(syms, entries), syms)
    expect(pairs).toHaveLength(3)
    expect(pairs[0].a.id + pairs[0].b.id).toBe('bc')
    const sorted = pairs.map((p) => Math.abs(p.r ?? -1))
    expect(sorted).toEqual([...sorted].sort((x, y) => y - x))
  })
})

describe('strongestPairs', () => {
  const mk = (r: number | null, status: 'ok' | 'few-days' | 'flat', id: string) => ({
    a: strength(id), b: strength(id + '2'), r, n: 20, status,
  })

  it('names up to three pairs with |r| of at least 0.5, skipping pairs without enough days', () => {
    const pairs = [mk(-0.9, 'ok', 'p'), mk(0.8, 'ok', 'q'), mk(0.6, 'ok', 'r'), mk(0.55, 'ok', 's'), mk(0.3, 'ok', 't'), mk(null, 'few-days', 'u')]
    expect(strongestPairs(pairs).map((p) => p.a.id)).toEqual(['p', 'q', 'r'])
  })

  it('is empty when no pair is strong', () => {
    expect(strongestPairs([mk(0.4, 'ok', 'p'), mk(null, 'few-days', 'q')])).toEqual([])
  })
})
