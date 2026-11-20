import { useState, type CSSProperties } from 'react'
import type { EvolutionMode } from '../../domain/stats'
import { Card } from '../../ui/Card'
import { Disclaimer } from '../../ui/Disclaimer'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { useDiary } from '../../state/DiaryProvider'
import { EvolutionChart } from './EvolutionChart'
import { useEvolutionSeries } from './hooks'
import { PatternsSection } from './PatternsSection'
import styles from './AnalysisScreen.module.css'

const MODES: { value: EvolutionMode; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

/** The analysis screen. The evolution graph and the patterns; the year heatmap comes later. */
export function AnalysisScreen() {
  const { status } = useDiary()
  const [mode, setMode] = useState<EvolutionMode>('day')
  const { buckets, series } = useEvolutionSeries(mode)
  if (status !== 'ready') return <p className={styles.note}>Loading…</p>
  return (
    <div className={styles.screen}>
      <SegmentedControl<EvolutionMode> label="Period" options={MODES} value={mode} onChange={setMode} />
      <Card title="Evolution">
        {series.length === 0 ? (
          <p className={styles.note}>Nothing to show yet. Log a value for a symptom and it appears here.</p>
        ) : (
          <>
            <p className={styles.note}>Last 10 {mode}s</p>
            <EvolutionChart buckets={buckets} series={series} />
            <ul className={styles.legend} aria-label="Legend">
              {series.map((s, k) => (
                <li key={s.symptom.id}>
                  <span data-swatch className={styles.swatch} style={{ '--c': `var(--c${k})` } as CSSProperties} />
                  {s.symptom.name}
                </li>
              ))}
            </ul>
            <p className={styles.note}>
              Week and month points are averages. Yes/no symptoms show the share of days answered yes (0–10 is 0–100%). A gap
              means nothing was logged.
            </p>
          </>
        )}
      </Card>
      <PatternsSection />
      <Disclaimer>
        This shows descriptive statistics from your own entries. It is not medical advice and makes no diagnosis. Talk to a doctor
        about anything that worries you.
      </Disclaimer>
    </div>
  )
}
