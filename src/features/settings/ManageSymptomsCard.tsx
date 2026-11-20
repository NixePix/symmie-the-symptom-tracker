import { useState, type FormEvent } from 'react'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Field } from '../../ui/Field'
import { symptomNameError } from '../../domain/diary'
import type { Symptom } from '../../domain/types'
import { useDiary, useDiaryActions } from '../../state/DiaryProvider'
import styles from './ManageSymptomsCard.module.css'

const TYPE_LABEL: Record<Symptom['type'], string> = { strength: 'Strength 1–10', yesno: 'Yes / no' }

/** The name field for one symptom. Has no type control: the type is fixed when the symptom is created. */
function RenameForm({ symptom, onDone }: { symptom: Symptom; onDone(): void }) {
  const { diary } = useDiary()
  const { renameSymptom } = useDiaryActions()
  const [name, setName] = useState(symptom.name)
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const problem = symptomNameError(diary, name, symptom.id)
    if (problem) return setError(problem)
    renameSymptom(symptom.id, name)
    onDone()
  }

  return (
    <form onSubmit={submit} className={styles.rename}>
      <Field label="Name" value={name} error={error} onChange={(e) => setName(e.target.value)} />
      <div className={styles.actions}>
        <Button type="submit">Save</Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

/**
 * Rename, archive and restore symptoms. Archiving hides a symptom from the log screen and keeps its
 * entries; there is deliberately no way to delete a symptom here. Reads and writes through the diary
 * provider, so it must sit inside `DiaryProvider`.
 */
export function ManageSymptomsCard() {
  const { diary } = useDiary()
  const { archiveSymptom, unarchiveSymptom } = useDiaryActions()
  const [renaming, setRenaming] = useState<string | null>(null)
  const [restoreError, setRestoreError] = useState('')
  const active = diary.symptoms.filter((s) => !s.archived)
  const archived = diary.symptoms.filter((s) => s.archived)

  function restore(symptom: Symptom) {
    const problem = symptomNameError(diary, symptom.name, symptom.id)
    if (problem) return setRestoreError(`${problem} Rename that one before restoring ${symptom.name}.`)
    setRestoreError('')
    unarchiveSymptom(symptom.id)
  }

  return (
    <Card title="Manage symptoms">
      <ul aria-label="Active symptoms" className={styles.list}>
        {active.map((s) => (
          <li key={s.id} className={styles.item}>
            {renaming === s.id ? (
              <RenameForm symptom={s} onDone={() => setRenaming(null)} />
            ) : (
              <>
                <span className={styles.name}>{s.name}</span>
                <small className={styles.type}>{TYPE_LABEL[s.type]}</small>
                <Button variant="ghost" className={styles.small} aria-label={`Rename ${s.name}`} onClick={() => setRenaming(s.id)}>
                  Rename
                </Button>
                <Button variant="ghost" className={styles.small} aria-label={`Archive ${s.name}`} onClick={() => archiveSymptom(s.id)}>
                  Archive
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
      {archived.length > 0 && (
        <>
          <h4 className={styles.sub}>Archived</h4>
          <p className={styles.hint}>Hidden from the log screen. Their entries stay in the graphs and exports.</p>
          <ul aria-label="Archived symptoms" className={styles.list}>
            {archived.map((s) => (
              <li key={s.id} className={styles.item}>
                <span className={styles.name}>{s.name}</span>
                <small className={styles.type}>{TYPE_LABEL[s.type]}</small>
                <Button variant="ghost" className={styles.small} aria-label={`Restore ${s.name}`} onClick={() => restore(s)}>
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
      {restoreError && <p role="alert" className={styles.error}>{restoreError}</p>}
    </Card>
  )
}
