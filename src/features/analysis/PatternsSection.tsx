import { useState } from 'react'
import { MIN_DAYS, seasonAverages, weekdayAverages, WEEKDAYS, type PairCorrelation } from '../../domain/patterns'
import type { Symptom } from '../../domain/types'
import { Card } from '../../ui/Card'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { useDiary } from '../../state/DiaryProvider'
import { usePatterns } from './hooks'
import styles from './PatternsSection.module.css'

const round = (n: number) => String(Math.round(n * 10) / 10)

/** "3.5" for a 1–10 symptom, "40%" for a yes/no symptom (its average is the share of yes days). */
const show = (symptom: Symptom, v: number | null) => (v === null ? '–' : symptom.type === 'yesno' ? `${Math.round(v * 100)}%` : round(v))

const YESNO_NOTE = 'Yes/no answers are stored as yes = 1 and no = 0, so each figure is the share of days answered yes.'

function NotEnough({ days }: { days: number }) {
  return (
    <p className={styles.notEnough}>
      Not enough data yet: {days} of {MIN_DAYS} days logged. Keep logging and the pattern appears here.
    </p>
  )
}

function Row({ label, detail, value, fraction }: { label: string; detail?: string; value: string; fraction: number }) {
  return (
    <tr>
      <th scope="row">
        {label}
        {detail && <span className={styles.detail}> {detail}</span>}
      </th>
      <td>
        <span className={styles.track}>
          <i style={{ width: `${Math.round(fraction * 100)}%` }} />
        </span>
        <b>{value}</b>
      </td>
    </tr>
  )
}

function describePair(p: PairCorrelation): string {
  if (p.status === 'few-days') return `Not enough data: logged together on ${p.n} of ${MIN_DAYS} days.`
  if (p.status === 'flat') return `One of them never changes over ${p.n} days, so no link can be measured.`
  const r = p.r!
  const direction = r < 0 ? 'in opposite directions' : 'together'
  const strength = Math.abs(r) >= 0.5 ? `they tend to move ${direction}` : Math.abs(r) >= 0.25 ? `a weak link${r < 0 ? ' (opposite directions)' : ''}` : 'little link'
  return `r = ${r.toFixed(2)} over ${p.n} days · ${strength}`
}

/** Weekday, season and pair patterns for the symptoms in the diary. Descriptive only. */
export function PatternsSection() {
  const { status } = useDiary()
  const { diary, symptoms, pairs, strongest } = usePatterns()
  const [chosenId, setChosenId] = useState<string | null>(null)
  if (status !== 'ready') return null
  if (symptoms.length === 0) return <p className={styles.note}>No patterns yet. They appear once you have logged some days.</p>

  const symptom = symptoms.find((s) => s.id === chosenId) ?? symptoms[0]
  const max = symptom.type === 'yesno' ? 1 : 10
  const fewDays = pairs.filter((p) => p.status === 'few-days').length
  const weekday = weekdayAverages(diary, symptom.id)
  const season = seasonAverages(diary, symptom.id)

  return (
    <>
      <SegmentedControl
        label="Symptom"
        options={symptoms.map((s) => ({ value: s.id, label: s.name }))}
        value={symptom.id}
        onChange={setChosenId}
      />
      <Card title="Average by weekday">
        <p className={styles.note}>{symptom.name}</p>
        {weekday.days < MIN_DAYS ? (
          <NotEnough days={weekday.days} />
        ) : (
          <table className={styles.table}>
            <tbody>
              {WEEKDAYS.map((w, i) => (
                <Row key={w} label={w} value={show(symptom, weekday.averages[i])} fraction={(weekday.averages[i] ?? 0) / max} />
              ))}
            </tbody>
          </table>
        )}
        {symptom.type === 'yesno' && <p className={styles.note}>{YESNO_NOTE}</p>}
      </Card>
      <Card title="Average by season">
        <p className={styles.note}>{symptom.name} · season means the time of year (northern hemisphere); temperature is not used.</p>
        {season.days < MIN_DAYS ? (
          <NotEnough days={season.days} />
        ) : (
          <table className={styles.table}>
            <tbody>
              {season.seasons.map((s) => (
                <Row key={s.name} label={s.name} detail={s.months} value={show(symptom, s.average)} fraction={(s.average ?? 0) / max} />
              ))}
            </tbody>
          </table>
        )}
        {symptom.type === 'yesno' && <p className={styles.note}>{YESNO_NOTE}</p>}
      </Card>
      <Card title="What moves together">
        <p className={styles.note}>
          Every pair of your symptoms, over the days both were logged. At least {MIN_DAYS} days are needed for a pair.
        </p>
        {pairs.length === 0 ? (
          <p className={styles.note}>Log at least two symptoms to compare them.</p>
        ) : (
          <>
            {strongest.length > 0 ? (
              <ul aria-label="Strongest pairs" className={styles.plain}>
                {strongest.map((p) => (
                  <li key={p.a.id + p.b.id}>
                    <b>
                      {p.a.name} and {p.b.name}
                    </b>
                    <div className={styles.note}>{describePair(p)}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.note}>No strong link found yet.</p>
            )}
            {fewDays > 0 && (
              <p className={styles.note}>
                {fewDays} {fewDays === 1 ? 'pair has' : 'pairs have'} not enough data yet.
              </p>
            )}
          </>
        )}
        <p className={styles.note}>Correlation is not cause: two symptoms moving together does not mean one makes the other happen.</p>
      </Card>
    </>
  )
}
