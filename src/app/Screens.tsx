import { useState } from 'react'
import { AnalysisScreen } from '../features/analysis/AnalysisScreen'
import { SummaryScreen } from '../features/summary/SummaryScreen'
import { LogScreen } from '../features/log/LogScreen'
import styles from './Screens.module.css'

const SCREENS = [
  { id: 'log', label: 'Log' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'summary', label: 'Summary' },
] as const

/**
 * Navigation bar and the screen it selects. There is no router yet (design §1 names `HashRouter`, which
 * is not a dependency), so the choice is component state and a reload returns to the log. Moving to
 * routes replaces this file.
 */
export function Screens() {
  const [current, setCurrent] = useState<(typeof SCREENS)[number]['id']>('log')
  return (
    <>
      <nav data-noprint aria-label="Screens" className={styles.nav}>
        {SCREENS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-current={s.id === current ? 'page' : undefined}
            className={s.id === current ? styles.on : styles.tab}
            onClick={() => setCurrent(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>
      {current === 'log' ? <LogScreen /> : current === 'analysis' ? <AnalysisScreen /> : <SummaryScreen />}
    </>
  )
}
