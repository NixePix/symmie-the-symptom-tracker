import { useState } from 'react'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Field } from '../../ui/Field'
import { daysWithData, diaryToCsv } from '../../domain/csv'
import { toDayKey } from '../../domain/dates'
import { useNow } from '../../state/ClockProvider'
import { useDiary } from '../../state/DiaryProvider'
import { downloadFile } from './download'
import styles from './BackupCard.module.css'

interface Props {
  /** Saves the file. Tests pass a spy; the app uses `downloadFile`. */
  download?: typeof downloadFile
}

/**
 * Choose a start and end date and download those days as a CSV (`domain/csv`). The range starts as
 * the first logged day to today. Must sit inside `DiaryProvider` and `ClockProvider`.
 */
export function ExportCard(props: Props) {
  const { status } = useDiary()
  // The form's initial dates come from the diary, so it mounts only once the diary has loaded.
  return status === 'ready' ? <ExportForm {...props} /> : null
}

function ExportForm({ download = downloadFile }: Props) {
  const { diary } = useDiary()
  const today = toDayKey(useNow())
  const first = [...Object.keys(diary.entries), ...Object.keys(diary.notes)].sort()[0]
  const [from, setFrom] = useState(first && first < today ? first : today)
  const [to, setTo] = useState(today)
  const [error, setError] = useState('')

  function submit() {
    if (!from || !to) return setError('Choose both dates.')
    if (to < from) return setError('The end date is before the start date.')
    if (daysWithData(diary, from, to).length === 0) return setError('Nothing logged in these dates.')
    setError('')
    download(`symmie-diary-${from}-to-${to}.csv`, diaryToCsv(diary, from, to), 'text/csv')
  }

  return (
    <Card title="Export to a spreadsheet">
      <p className={styles.hint}>One row per day and symptom, plus your day notes. Opens in Excel, Numbers and Google Sheets.</p>
      <p className={styles.hint}>If Excel shows everything in one column, use Data &gt; From Text/CSV and pick comma as the separator.</p>
      <div className={styles.dates}>
        <Field label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Field label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <Button onClick={submit}>Download CSV</Button>
    </Card>
  )
}
