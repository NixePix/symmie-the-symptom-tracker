/**
 * Patterns in the diary (design §5.5): average per weekday, average per season, and how strongly pairs of
 * symptoms move together. Pure functions of the diary. A yes/no symptom is stored 0/1, so its average is
 * the share of yes days (0–1). Archived symptoms count: their entries stay in the analysis.
 * "Season" is the time of year only; no temperature is read (README, Assumptions).
 */
import { monthIndex, weekdayIndex } from './dates'
import type { Diary, Symptom, SymptomId } from './types'

/** A pattern backed by fewer days than this is labelled "not enough data" and not shown as a finding. */
export const MIN_DAYS = 14

/** Strongest pairs are named when |r| is at least this. */
export const STRONG_R = 0.5
const STRONGEST_COUNT = 3

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Northern-hemisphere seasons by calendar month, January = 0. */
export const SEASONS = [
  { name: 'Winter', months: 'Dec–Feb' },
  { name: 'Spring', months: 'Mar–May' },
  { name: 'Summer', months: 'Jun–Aug' },
  { name: 'Autumn', months: 'Sep–Nov' },
]
const seasonOfMonth = (month: number) => Math.floor(((month + 1) % 12) / 3)

function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length
}

/** Every logged value of the symptom, with its day. */
function valuesOf(diary: Diary, id: SymptomId): { day: string; value: number }[] {
  return Object.entries(diary.entries).flatMap(([day, values]) => (values[id] === undefined ? [] : [{ day, value: values[id] }]))
}

export interface WeekdayAverages {
  /** Days with a value for the symptom: the data behind the pattern. */
  days: number
  /** Monday first; `null` for a weekday with no value. */
  averages: (number | null)[]
}

export function weekdayAverages(diary: Diary, id: SymptomId): WeekdayAverages {
  const all = valuesOf(diary, id)
  return {
    days: all.length,
    averages: WEEKDAYS.map((_, w) =>
      mean(all.filter((v) => weekdayIndex(v.day) === w).map((v) => v.value)),
    ),
  }
}

export interface SeasonAverages {
  days: number
  seasons: { name: string; months: string; average: number | null }[]
}

export function seasonAverages(diary: Diary, id: SymptomId): SeasonAverages {
  const all = valuesOf(diary, id)
  return {
    days: all.length,
    seasons: SEASONS.map((s, i) => ({
      ...s,
      average: mean(all.filter((v) => seasonOfMonth(monthIndex(v.day)) === i).map((v) => v.value)),
    })),
  }
}

export interface PairCorrelation {
  a: Symptom
  b: Symptom
  /** Pearson correlation, −1 to 1, over the days both were logged; `null` unless `status` is `ok`. */
  r: number | null
  /** Days on which both symptoms have a value. */
  n: number
  /** `few-days`: fewer than `MIN_DAYS` shared days. `flat`: one symptom never changes, so no link can be measured. */
  status: 'ok' | 'few-days' | 'flat'
}

function pearson(xs: number[], ys: number[]): number | null {
  const mx = mean(xs)!
  const my = mean(ys)!
  let sxy = 0
  let sxx = 0
  let syy = 0
  xs.forEach((x, i) => {
    sxy += (x - mx) * (ys[i] - my)
    sxx += (x - mx) ** 2
    syy += (ys[i] - my) ** 2
  })
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null
}

/** One entry per pair of `symptoms`, strongest |r| first; pairs without a figure come last. */
export function pairCorrelations(diary: Diary, symptoms: Symptom[]): PairCorrelation[] {
  const out: PairCorrelation[] = []
  symptoms.forEach((a, i) =>
    symptoms.slice(i + 1).forEach((b) => {
      const xs: number[] = []
      const ys: number[] = []
      for (const day of Object.values(diary.entries)) {
        if (day[a.id] !== undefined && day[b.id] !== undefined) {
          xs.push(day[a.id])
          ys.push(day[b.id])
        }
      }
      if (xs.length < MIN_DAYS) return void out.push({ a, b, r: null, n: xs.length, status: 'few-days' })
      const r = pearson(xs, ys)
      out.push({ a, b, r, n: xs.length, status: r === null ? 'flat' : 'ok' })
    }),
  )
  return out.sort((p, q) => Math.abs(q.r ?? -1) - Math.abs(p.r ?? -1))
}

/** Up to three pairs with enough days and |r| of at least `STRONG_R`, strongest first. */
export function strongestPairs(pairs: PairCorrelation[]): PairCorrelation[] {
  return pairs
    .filter((p) => p.status === 'ok' && Math.abs(p.r!) >= STRONG_R)
    .sort((p, q) => Math.abs(q.r!) - Math.abs(p.r!))
    .slice(0, STRONGEST_COUNT)
}
