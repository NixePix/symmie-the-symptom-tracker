/**
 * Calculations behind the doctor summary page (design §5.6): pure functions of `(diary, from, to)`,
 * both ends of the range included. No React and no clock.
 */
import { addDays, dayOfMonth, monthName } from './dates'
import { bucketValue, TOP_COUNT, type Bucket, type EvolutionSeries } from './stats'
import type { DayKey, Diary, Symptom } from './types'

const MAX_BUCKETS = 10

export interface SymptomStat {
  symptom: Symptom
  /** Mean of the values in the range. For a yes/no symptom this is the share of days answered yes, 0–1. */
  average: number
  /** Largest value in the range; 1 means yes for a yes/no symptom. */
  highest: number
  /** Number of days in the range with a value for the symptom. */
  days: number
}

const inRange = (day: DayKey, from: DayKey, to: DayKey) => day >= from && day <= to

/**
 * One row per symptom with a value on at least one day of the range (archived symptoms included),
 * most logged days first; ties keep the order the user created the symptoms in.
 */
export function rangeStats(diary: Diary, from: DayKey, to: DayKey): SymptomStat[] {
  const values = new Map<string, number[]>()
  for (const [day, entry] of Object.entries(diary.entries)) {
    if (!inRange(day, from, to)) continue
    for (const [id, v] of Object.entries(entry)) values.set(id, [...(values.get(id) ?? []), v])
  }
  return diary.symptoms
    .flatMap((symptom, order) => {
      const vs = values.get(symptom.id)
      if (!vs?.length) return []
      return [{ symptom, order, average: vs.reduce((a, b) => a + b, 0) / vs.length, highest: Math.max(...vs), days: vs.length }]
    })
    .sort((a, b) => b.days - a.days || a.order - b.order)
    .map(({ symptom, average, highest, days }) => ({ symptom, average, highest, days }))
}

/** The day notes inside the range that have text, oldest first, with surrounding whitespace removed. */
export function notesInRange(diary: Diary, from: DayKey, to: DayKey): { day: DayKey; text: string }[] {
  return Object.entries(diary.notes)
    .filter(([day, text]) => inRange(day, from, to) && text.trim() !== '')
    .map(([day, text]) => ({ day, text: text.trim() }))
    .sort((a, b) => (a.day < b.day ? -1 : 1))
}

/**
 * Buckets for the graph: the range cut into consecutive runs of `ceil(days / 10)` days, so there are at most
 * ten and together they cover each day once (the last may be shorter). A one-day bucket is labelled with the
 * day of the month, a longer one with its first day.
 */
export function rangeBuckets(from: DayKey, to: DayKey): Bucket[] {
  const days: DayKey[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d)
  const size = Math.max(1, Math.ceil(days.length / MAX_BUCKETS))
  const out: Bucket[] = []
  for (let i = 0; i < days.length; i += size) {
    const chunk = days.slice(i, i + size)
    out.push({ label: size === 1 ? String(dayOfMonth(chunk[0])) : `${dayOfMonth(chunk[0])} ${monthName(chunk[0])}`, days: chunk })
  }
  return out
}

/** The graph for the range: the five symptoms logged on most days in it, one point per bucket (`bucketValue`). */
export function rangeChart(diary: Diary, from: DayKey, to: DayKey): { buckets: Bucket[]; series: EvolutionSeries[] } {
  const buckets = rangeBuckets(from, to)
  const top = rangeStats(diary, from, to).slice(0, TOP_COUNT)
  return { buckets, series: top.map(({ symptom }) => ({ symptom, points: buckets.map((b) => bucketValue(diary, symptom, b)) })) }
}
