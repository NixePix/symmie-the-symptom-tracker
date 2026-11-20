import { useState } from 'react'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Field } from '../../ui/Field'
import { addDays, toDayKey } from '../../domain/dates'
import { rangeStats } from '../../domain/summary'
import type { DayKey } from '../../domain/types'
import { useNow } from '../../state/ClockProvider'
import { useDiary } from '../../state/DiaryProvider'
import { SummaryPaper } from './SummaryPaper'
import styles from './SummaryScreen.module.css'
import './print.css'

const DEFAULT_DAYS = 30

interface Props {
  /** Opens the phone's print dialog (its "Save as PDF" is the way to keep the page). Tests pass a spy. */
  print?: () => void
}

/**
 * Pick a date range and open the summary page for it (`SummaryPaper`), then print it. Printing is
 * `window.print()`: the browser's own print dialog, so nothing leaves the phone. Must sit inside
 * `DiaryProvider` and `ClockProvider`.
 */
export function SummaryScreen(props: Props) {
  const { status } = useDiary()
  // The form's initial dates come from the clock, and the paper reads the diary, so mount once it has loaded.
  return status === 'ready' ? <SummaryForm {...props} /> : <p className={styles.note}>Loading…</p>
}

function SummaryForm({ print = () => window.print() }: Props) {
  const { diary } = useDiary()
  const today = toDayKey(useNow())
  const [from, setFrom] = useState(addDays(today, 1 - DEFAULT_DAYS))
  const [to, setTo] = useState(today)
  const [error, setError] = useState('')
  const [shown, setShown] = useState<{ from: DayKey; to: DayKey } | null>(null)

  function open() {
    setShown(null)
    if (!from || !to) return setError('Choose both dates.')
    if (to < from) return setError('The end date is before the start date.')
    if (rangeStats(diary, from, to).length === 0 && !Object.keys(diary.notes).some((d) => d >= from && d <= to)) {
      return setError('Nothing logged in these dates.')
    }
    setError('')
    setShown({ from, to })
  }

  return (
    <div className={styles.screen}>
      <div data-noprint className={styles.form}>
        <Card title="Summary for a doctor visit">
          <p className={styles.note}>Choose the dates to cover, open the page, then print it or save it as a PDF.</p>
          <div className={styles.dates}>
            <Field label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Field label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <Button onClick={open}>Open summary</Button>
        </Card>
      </div>
      {shown && (
        <>
          <SummaryPaper diary={diary} from={shown.from} to={shown.to} />
          <div data-noprint>
            <Button onClick={print}>Print or save as PDF</Button>
          </div>
        </>
      )}
    </div>
  )
}
