/**
 * Local calendar dates as `YYYY-MM-DD` strings ("day keys"). A day key names the date on the phone's
 * clock, so an entry logged at 23:50 belongs to that evening's date in every time zone; a UTC
 * timestamp would not. This is the only module that constructs `Date` objects (design §7), and it
 * never reads the clock: callers pass the `Date` they got from `ClockProvider`.
 */
import type { DayKey } from './types'

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

export function toDayKey(date: Date): DayKey {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Local midnight at the start of `key`. */
export function fromDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Moves `n` calendar days (negative goes back). Uses `Date#setDate`, so a day with 23 or 25 hours
 * around a daylight-saving change still counts as one day.
 */
export function addDays(key: DayKey, n: number): DayKey {
  const d = fromDayKey(key)
  d.setDate(d.getDate() + n)
  return toDayKey(d)
}

/** True for a string that is a real calendar date in `YYYY-MM-DD` form. */
export function isDayKey(value: unknown): value is DayKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return toDayKey(fromDayKey(value)) === value
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Tue 10 Nov". English names are fixed in this file, so the result does not depend on the browser's locale data. */
export function formatDay(key: DayKey): string {
  const d = fromDayKey(key)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** Every day of the calendar month `back` months before the month containing `key` (0 is that month). */
export function daysOfMonth(key: DayKey, back: number): DayKey[] {
  const d = fromDayKey(key)
  const first = new Date(d.getFullYear(), d.getMonth() - back, 1)
  const days: DayKey[] = []
  for (let day = new Date(first); day.getMonth() === first.getMonth(); day.setDate(day.getDate() + 1)) days.push(toDayKey(day))
  return days
}

/** Three-letter English month name of `key`. */
export function monthName(key: DayKey): string {
  return MONTHS[fromDayKey(key).getMonth()]
}

/** Day of the month of `key`, 1–31. */
export function dayOfMonth(key: DayKey): number {
  return fromDayKey(key).getDate()
}

/** Weekday of `key`, Monday = 0 … Sunday = 6. */
export function weekdayIndex(key: DayKey): number {
  return (fromDayKey(key).getDay() + 6) % 7
}

/** Month of `key`, January = 0 … December = 11. */
export function monthIndex(key: DayKey): number {
  return fromDayKey(key).getMonth()
}
