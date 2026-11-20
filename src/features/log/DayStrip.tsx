import { useEffect, useRef } from 'react'
import { addDays, formatDay } from '../../domain/dates'
import type { DayKey } from '../../domain/types'
import styles from './DayStrip.module.css'

const DAYS_SHOWN = 21

interface Props {
  today: DayKey
  selected: DayKey
  onSelect(day: DayKey): void
}

/** The last 21 days, oldest first, ending today. Tapping one opens it for logging. */
export function DayStrip({ today, selected, onSelect }: Props) {
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i - (DAYS_SHOWN - 1)))
  const ref = useRef<HTMLDivElement>(null)
  // Start scrolled to the right end, where today is.
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth
  }, [])
  return (
    <div ref={ref} role="group" aria-label="Choose a day" className={styles.strip}>
      {days.map((day) => {
        const [weekday, dayOfMonth] = formatDay(day).split(' ')
        return (
          <button
            key={day}
            type="button"
            aria-label={formatDay(day)}
            aria-current={day === selected ? 'date' : undefined}
            className={[styles.day, day === selected && styles.on].filter(Boolean).join(' ')}
            onClick={() => onSelect(day)}
          >
            <small aria-hidden>{weekday}</small>
            <b aria-hidden>{dayOfMonth}</b>
          </button>
        )
      })}
    </div>
  )
}
