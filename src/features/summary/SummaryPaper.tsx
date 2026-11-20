import type { CSSProperties } from 'react'
import { formatDay } from '../../domain/dates'
import { notesInRange, rangeChart, rangeStats, type SymptomStat } from '../../domain/summary'
import type { DayKey, Diary } from '../../domain/types'
import { Card } from '../../ui/Card'
import { Disclaimer } from '../../ui/Disclaimer'
import { EvolutionChart } from '../analysis/EvolutionChart'
import styles from './SummaryPaper.module.css'

interface Props {
  diary: Diary
  from: DayKey
  to: DayKey
}

const round = (n: number) => String(Math.round(n * 10) / 10)

const average = ({ symptom, average: a }: SymptomStat) => (symptom.type === 'yesno' ? `${Math.round(a * 100)}% of days yes` : round(a))
const highest = ({ symptom, highest: h }: SymptomStat) => (symptom.type === 'yesno' ? (h ? 'Yes' : 'No') : String(h))

/**
 * The page the user prints: the range, the evolution graph (`EvolutionChart`, as on the analysis screen),
 * one row per symptom with its average, highest value and days logged, the day notes, and the notice that
 * the page makes no diagnosis. Its own component so the print stylesheet and the tests address one element.
 */
export function SummaryPaper({ diary, from, to }: Props) {
  const stats = rangeStats(diary, from, to)
  const { buckets, series } = rangeChart(diary, from, to)
  const notes = notesInRange(diary, from, to)
  return (
    <article className={styles.paper} aria-label={`Summary ${formatDay(from)} to ${formatDay(to)}`}>
      <p className={styles.range}>
        {formatDay(from)} – {formatDay(to)}
      </p>
      <Card title="Evolution">
        {buckets.length < 2 ? (
          <p className={styles.note}>The graph needs a range of at least two days.</p>
        ) : (
          <>
            <EvolutionChart buckets={buckets} series={series} />
            <ul className={styles.legend} aria-label="Legend">
              {series.map((s, k) => (
                <li key={s.symptom.id}>
                  <span className={styles.swatch} style={{ '--c': `var(--c${k})` } as CSSProperties} />
                  {s.symptom.name}
                </li>
              ))}
            </ul>
            <p className={styles.note}>
              {buckets[0].days.length > 1 ? 'Each point is the average of the days it covers. ' : ''}Yes/no symptoms show the share
              of days answered yes (0–10 is 0–100%). A gap means nothing was logged.
            </p>
          </>
        )}
      </Card>
      <Card title="Symptoms">
        <table className={styles.table} aria-label="Symptoms in this range">
          <thead>
            <tr>
              <th scope="col">Symptom</th>
              <th scope="col">Average</th>
              <th scope="col">Highest</th>
              <th scope="col">Days logged</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.symptom.id}>
                <th scope="row">{s.symptom.name}</th>
                <td>{average(s)}</td>
                <td>{highest(s)}</td>
                <td>{s.days}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Day notes">
        {notes.length === 0 ? (
          <p className={styles.note}>No day notes in this range.</p>
        ) : (
          <ul className={styles.notes}>
            {notes.map((n) => (
              <li key={n.day}>
                <b>{formatDay(n.day)}</b>
                {n.text}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Disclaimer>
        This page describes the entries made in the diary. It is not medical advice and makes no diagnosis.
      </Disclaimer>
    </article>
  )
}
