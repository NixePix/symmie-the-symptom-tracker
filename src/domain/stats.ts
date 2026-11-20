/**
 * Calculations behind the analysis screen (design §5.5): pure functions of `(diary, mode, today)`, so a
 * component receives finished points. No React and no clock; `today` is passed in.
 */
import { addDays, dayOfMonth, daysOfMonth, monthName } from './dates'
import type { DayKey, Diary, Symptom } from './types'

export type EvolutionMode = 'day' | 'week' | 'month'

export interface Bucket {
  label: string
  days: DayKey[]
}

export interface EvolutionSeries {
  symptom: Symptom
  /** One per bucket, oldest first. 0–10 for both types; `null` when the symptom has no value in the bucket. */
  points: (number | null)[]
}

const BUCKETS = 10
export const TOP_COUNT = 5

/**
 * Every symptom with a value on at least one day, archived ones included (their entries stay in the
 * analysis), ordered by how many days they have a value, most first. Ties keep the order the user
 * created them in.
 */
export function symptomsWithData(diary: Diary): Symptom[] {
  const counts = new Map<string, number>()
  for (const day of Object.values(diary.entries)) for (const id of Object.keys(day)) counts.set(id, (counts.get(id) ?? 0) + 1)
  return diary.symptoms
    .filter((s) => (counts.get(s.id) ?? 0) > 0)
    .map((s, order) => ({ s, order, n: counts.get(s.id)! }))
    .sort((a, b) => b.n - a.n || a.order - b.order)
    .map((x) => x.s)
}

/** The first five of `symptomsWithData`: the lines of the graph and the symptoms compared in pairs. */
export function topSymptoms(diary: Diary): Symptom[] {
  return symptomsWithData(diary).slice(0, TOP_COUNT)
}

/** The last ten days, ten 7-day weeks or ten calendar months, oldest first, the current one last. */
export function buckets(mode: EvolutionMode, today: DayKey): Bucket[] {
  const out: Bucket[] = []
  for (let back = BUCKETS - 1; back >= 0; back--) {
    if (mode === 'day') {
      const day = addDays(today, -back)
      out.push({ label: String(dayOfMonth(day)), days: [day] })
    } else if (mode === 'week') {
      const days = Array.from({ length: 7 }, (_, k) => addDays(today, -back * 7 - k))
      out.push({ label: back === 0 ? 'This week' : `${back} w ago`, days })
    } else {
      const days = daysOfMonth(today, back)
      out.push({ label: monthName(days[0]), days })
    }
  }
  return out
}

/** Average of the symptom's values in the bucket; a yes/no symptom is the share of yes answers times 10. */
export function bucketValue(diary: Diary, symptom: Symptom, bucket: Bucket): number | null {
  const values = bucket.days.flatMap((d) => {
    const v = diary.entries[d]?.[symptom.id]
    return v === undefined ? [] : [v]
  })
  if (values.length === 0) return null
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return symptom.type === 'yesno' ? mean * 10 : mean
}

export function evolutionSeries(diary: Diary, mode: EvolutionMode, today: DayKey): { buckets: Bucket[]; series: EvolutionSeries[] } {
  const bs = buckets(mode, today)
  return {
    buckets: bs,
    series: topSymptoms(diary).map((symptom) => ({ symptom, points: bs.map((b) => bucketValue(diary, symptom, b)) })),
  }
}
