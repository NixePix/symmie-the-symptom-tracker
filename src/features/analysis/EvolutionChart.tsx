import { linePath } from '../../domain/geometry'
import type { Bucket, EvolutionSeries } from '../../domain/stats'
import styles from './EvolutionChart.module.css'

const W = 330
const H = 230
const LEFT = 22
const TOP = 8
const BOTTOM = 22
const RIGHT = 10

const x = (i: number, n: number) => LEFT + (i * (W - LEFT - RIGHT)) / (n - 1)
const y = (v: number) => TOP + (H - TOP - BOTTOM) * (1 - v / 10)
const round = (n: number) => Math.round(n * 10) / 10

/** What a table cell and a screen reader say for one point; yes/no is a share of days, not a 0–10 score. */
function describe(series: EvolutionSeries, v: number | null): string {
  if (v === null) return '–'
  return series.symptom.type === 'yesno' ? `${Math.round(v * 10)}% of days yes` : String(round(v))
}

interface Props {
  buckets: Bucket[]
  series: EvolutionSeries[]
}

/**
 * The overlaid lines, one colour per series (`--c0` … `--c4`), on a fixed 0–10 axis. A `null` point breaks
 * the line (`linePath`). The values are repeated in a visually hidden table as the chart's text alternative.
 */
export function EvolutionChart({ buckets, series }: Props) {
  const n = buckets.length
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Graph of your most tracked symptoms">
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line x1={LEFT} x2={W} y1={y(v)} y2={y(v)} className={styles.grid} />
            <text x={0} y={y(v) + 3} className={styles.axis}>
              {v}
            </text>
          </g>
        ))}
        {buckets.map((b, i) => (
          <text key={i} x={x(i, n)} y={H - 6} textAnchor="middle" className={styles.axis}>
            {b.label}
          </text>
        ))}
        {series.map((s, k) => (
          <g key={s.symptom.id}>
            <path
              data-testid={`line-${s.symptom.id}`}
              d={linePath(s.points, (i) => x(i, n), y)}
              fill="none"
              stroke={`var(--c${k})`}
              strokeWidth={3}
              strokeLinejoin="round"
            />
            {s.points.map((v, i) =>
              v === null ? null : <circle key={i} cx={x(i, n)} cy={y(v)} r={4} fill="var(--bg)" stroke={`var(--c${k})`} strokeWidth={2.5} />,
            )}
          </g>
        ))}
      </svg>
      <table className={styles.hidden}>
        <caption>Values per period; – means nothing was logged</caption>
        <thead>
          <tr>
            <th scope="col">Symptom</th>
            {buckets.map((b, i) => (
              <th key={i} scope="col">
                {b.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {series.map((s) => (
            <tr key={s.symptom.id}>
              <th scope="row">{s.symptom.name}</th>
              {s.points.map((v, i) => (
                <td key={i}>{describe(s, v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
