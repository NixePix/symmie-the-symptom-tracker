import { useState } from 'react'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'
import { addDays, formatDay, toDayKey } from '../../domain/dates'
import { symptomsForLogging } from '../../domain/diary'
import { useDiary, useDiaryActions } from '../../state/DiaryProvider'
import { useNow } from '../../state/ClockProvider'
import { BackupCard } from '../settings/BackupCard'
import { ExportCard } from '../settings/ExportCard'
import { ManageSymptomsCard } from '../settings/ManageSymptomsCard'
import { AddSymptomForm } from './AddSymptomForm'
import { DayRecap } from './DayRecap'
import { DayStrip } from './DayStrip'
import { StepProgress } from './StepProgress'
import { SymptomStep } from './SymptomStep'
import { useLogFlow } from './useLogFlow'
import styles from './LogScreen.module.css'

/** The symptoms screen: pick a day, then set one value per symptom, one symptom per step. */
export function LogScreen() {
  const today = toDayKey(useNow())
  const { status, diary, saveFailed, revision } = useDiary()
  const { addSymptom, setValue, clearValue, setNote } = useDiaryActions()
  const { day, step, selectDay, goTo } = useLogFlow(today)
  const [adding, setAdding] = useState(false)
  const [managing, setManaging] = useState(false)
  const [exporting, setExporting] = useState(false)

  if (status === 'loading') return null
  if (status === 'error') return <p role="alert">Could not read the diary from this phone.</p>

  const symptoms = symptomsForLogging(diary, day)
  const before = addDays(day, -1)
  const previousValues = diary.entries[before] ?? {}
  const values = diary.entries[day] ?? {}
  const logged = new Set(Object.keys(values))
  const title = day === today ? 'Today' : day === addDays(today, -1) ? 'Yesterday' : formatDay(day)
  const current = step > 0 ? symptoms[step - 1] : undefined

  return (
    <div className={styles.log}>
      <h2 className={styles.title}>{title}</h2>
      <DayStrip today={today} selected={day} onSelect={selectDay} />
      {saveFailed && <p role="alert" className={styles.warn}>Could not save to this phone. Your latest values may be lost when the app closes.</p>}
      {symptoms.length === 0 ? (
        <p className={styles.empty}>No symptoms yet. Add the first one to start your diary.</p>
      ) : (
        <>
          <StepProgress symptoms={symptoms} logged={logged} step={step} onSelect={goTo} />
          {current ? (
            <SymptomStep key={current.id} symptom={current} value={values[current.id]} previous={current.id in previousValues ? { value: previousValues[current.id], label: day === today ? 'yesterday' : 'the day before' } : undefined} onPick={(v) => { setValue(day, current.id, v); goTo(step === symptoms.length ? 0 : step + 1) }} onClear={() => clearValue(day, current.id)} />
          ) : (
            <DayRecap key={revision} symptoms={symptoms} values={values} day={day} note={diary.notes[day]} onOpen={(i) => goTo(i + 1)} onSaveNote={setNote} />
          )}
        </>
      )}
      <Button variant="ghost" className={styles.add} onClick={() => setAdding(true)}>
        Add symptom
      </Button>
      <Button variant="ghost" className={styles.add} onClick={() => setManaging(true)}>
        Manage symptoms
      </Button>
      <Button variant="ghost" className={styles.add} onClick={() => setExporting(true)}>
        Export and backup
      </Button>
      <Sheet open={exporting} title="Export and backup" onClose={() => setExporting(false)}>
        <ExportCard />
        <BackupCard />
      </Sheet>
      <Sheet open={managing} title="Manage symptoms" onClose={() => setManaging(false)}>
        <ManageSymptomsCard />
      </Sheet>
      <Sheet open={adding} title="Add symptom" onClose={() => setAdding(false)}>
        <AddSymptomForm
          diary={diary}
          onAdd={(name, type) => {
            addSymptom(name, type)
            setAdding(false)
            goTo(symptoms.length + 1)
          }}
        />
      </Sheet>
    </div>
  )
}
