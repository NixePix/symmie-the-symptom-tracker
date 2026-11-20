import { addDays, daysOfMonth, monthIndex, weekdayIndex, formatDay, fromDayKey, isDayKey, toDayKey } from './dates'

describe('toDayKey', () => {
  it('formats the local calendar date with zero padding', () => {
    expect(toDayKey(new Date(2026, 0, 5, 9, 30))).toBe('2026-01-05')
  })

  it('uses the local date late in the evening, not the UTC date', () => {
    // In any zone east of UTC this instant is already the next day in UTC.
    expect(toDayKey(new Date(2026, 0, 31, 23, 59))).toBe('2026-01-31')
  })
})

describe('fromDayKey', () => {
  it('returns local midnight of that date', () => {
    const d = fromDayKey('2026-03-09')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 9, 0])
  })

  it('round-trips through toDayKey', () => {
    expect(toDayKey(fromDayKey('2024-02-29'))).toBe('2024-02-29')
  })
})

describe('addDays', () => {
  it.each([
    ['2026-01-31', 1, '2026-02-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2024-02-28', 1, '2024-02-29'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-03-28', 2, '2026-03-30'],
    ['2026-10-24', 2, '2026-10-26'],
    ['2026-05-10', 0, '2026-05-10'],
  ])('%s + %i days = %s', (start, n, expected) => {
    expect(addDays(start, n)).toBe(expected)
  })
})

describe('isDayKey', () => {
  it('accepts a real date', () => expect(isDayKey('2024-02-29')).toBe(true))
  it.each(['2026-02-30', '2026-13-01', '2026-1-1', '26-01-01', '2026-01-01T00:00:00Z', '', 5, null])(
    'rejects %j',
    (v) => expect(isDayKey(v)).toBe(false),
  )
})

describe('formatDay', () => {
  it('writes weekday, day and month', () => {
    expect(formatDay('2026-11-10')).toBe('Tue 10 Nov')
    expect(formatDay('2026-01-01')).toBe('Thu 1 Jan')
  })
})

describe('daysOfMonth', () => {
  it('lists every day of the calendar month `back` months before the month of the given day', () => {
    const days = daysOfMonth('2026-11-11', 1)
    expect(days).toHaveLength(31)
    expect(days[0]).toBe('2026-10-01')
    expect(days[30]).toBe('2026-10-31')
  })

  it('back 0 is the current month in full, and crosses a year boundary', () => {
    expect(daysOfMonth('2026-02-11', 0)).toHaveLength(28)
    expect(daysOfMonth('2026-01-05', 2)[0]).toBe('2025-11-01')
  })
})

describe('weekdayIndex and monthIndex', () => {
  it('weekdayIndex counts from Monday = 0 to Sunday = 6', () => {
    expect(weekdayIndex('2026-11-09')).toBe(0) // Monday
    expect(weekdayIndex('2026-11-10')).toBe(1)
    expect(weekdayIndex('2026-11-15')).toBe(6) // Sunday
  })

  it('monthIndex counts from January = 0', () => {
    expect(monthIndex('2026-01-31')).toBe(0)
    expect(monthIndex('2026-12-01')).toBe(11)
  })
})
