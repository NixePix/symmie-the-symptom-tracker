import { useState, type ChangeEvent } from 'react'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Sheet } from '../../ui/Sheet'
import { createBackup, parseBackup } from '../../domain/backup'
import { toDayKey } from '../../domain/dates'
import type { Diary } from '../../domain/types'
import { useNow } from '../../state/ClockProvider'
import { useDiary, useDiaryActions } from '../../state/DiaryProvider'
import { downloadFile } from './download'
import styles from './BackupCard.module.css'

interface Props {
  /** Saves the file. Tests pass a spy; the app uses `downloadFile`. */
  download?: typeof downloadFile
}

const hasData = (d: Diary) => d.symptoms.length > 0 || Object.keys(d.entries).length > 0 || Object.keys(d.notes).length > 0

const describeDiary = (d: Diary) => {
  const days = new Set([...Object.keys(d.entries), ...Object.keys(d.notes)]).size
  return `${d.symptoms.length} ${d.symptoms.length === 1 ? 'symptom' : 'symptoms'}, ${days} ${days === 1 ? 'day' : 'days'} logged`
}

/**
 * Download the whole diary as a backup file (`domain/backup`), and restore from one. A chosen file is
 * checked with `parseBackup` first; a file that fails changes nothing. If the phone already holds data,
 * the user confirms before it is replaced; an empty diary is filled without asking. Must sit inside
 * `DiaryProvider` and `ClockProvider`.
 */
export function BackupCard({ download = downloadFile }: Props) {
  const { diary } = useDiary()
  const { restore } = useDiaryActions()
  const today = toDayKey(useNow())
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [incoming, setIncoming] = useState<Diary | null>(null)

  function accept(next: Diary) {
    restore(next)
    setIncoming(null)
    setDone(true)
  }

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const picked = input.files?.[0]
    // Clear the input so choosing the same file again fires another change event.
    input.value = ''
    if (!picked) return
    setError('')
    setDone(false)
    let next: Diary
    try {
      next = parseBackup(JSON.parse(await picked.text()))
    } catch (e) {
      const reason = e instanceof SyntaxError ? 'The file is not valid JSON' : e instanceof Error ? e.message : 'unreadable'
      return setError(`This is not a usable Symmie backup. ${reason}. Nothing was changed.`)
    }
    if (hasData(diary)) setIncoming(next)
    else accept(next)
  }

  return (
    <Card title="Backup and restore">
      <p className={styles.hint}>
        A backup file holds every symptom, value and note, including archived symptoms. Keep it somewhere safe: clearing this
        browser’s site data deletes the diary from the phone.
      </p>
      <Button onClick={() => download(`symmie-backup-${today}.json`, JSON.stringify(createBackup(diary)), 'application/json')}>
        Download backup
      </Button>
      <label className={styles.file}>
        Import a backup file
        <input type="file" accept=".json,application/json" onChange={choose} />
      </label>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {done && <p role="status" className={styles.ok}>Backup restored.</p>}
      <Sheet open={incoming !== null} title="Replace the diary on this phone?" onClose={() => setIncoming(null)}>
        {incoming && (
          <>
            <p>This phone has {describeDiary(diary)}. The backup has {describeDiary(incoming)}.</p>
            <p>Importing replaces everything on this phone with the backup. It cannot be undone.</p>
            <div className={styles.actions}>
              <Button variant="danger" onClick={() => accept(incoming)}>Replace</Button>
              <Button variant="ghost" onClick={() => setIncoming(null)}>Cancel</Button>
            </div>
          </>
        )}
      </Sheet>
    </Card>
  )
}
