import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnalysisScreen } from './AnalysisScreen'
import { ClockProvider } from '../../state/ClockProvider'
import { DiaryProvider } from '../../state/DiaryProvider'
import { memoryRepository } from '../../data/memoryRepository'
import type { Diary } from '../../domain/types'

const NOW = new Date(2026, 10, 11, 21, 0)

const names = ['Hovedpine', 'Træthed', 'Kvalme', 'Svimmelhed', 'Ryg', 'Hoste']
const symptoms = names.map((name, i) => ({ id: `s${i}`, name, type: 'strength' as const }))

async function setup(diary: Diary) {
  render(
    <ClockProvider now={() => NOW}>
      <DiaryProvider repository={memoryRepository(diary)}>
        <AnalysisScreen />
      </DiaryProvider>
    </ClockProvider>,
  )
  await screen.findByRole('radiogroup', { name: 'Period' })
}

/** Six symptoms; Hoste (s5) is logged on the fewest days. */
const sixSymptoms: Diary = {
  symptoms,
  entries: {
    '2026-11-11': { s0: 5, s1: 5, s2: 5, s3: 5, s4: 5, s5: 5 },
    '2026-11-10': { s0: 5, s1: 5, s2: 5, s3: 5, s4: 5 },
  },
  notes: {},
}

const legend = () => screen.getByRole('list', { name: 'Legend' })

describe('AnalysisScreen', () => {
  it('shows one graph with the five most tracked symptoms in the legend, each with its own colour', async () => {
    await setup(sixSymptoms)
    expect(screen.getAllByRole('img', { name: /graph/i })).toHaveLength(1)
    const items = within(legend()).getAllByRole('listitem')
    expect(items.map((i) => i.textContent)).toEqual(['Hovedpine', 'Træthed', 'Kvalme', 'Svimmelhed', 'Ryg'])
    const colours = items.map((i) => (i.querySelector('[data-swatch]') as HTMLElement).style.getPropertyValue('--c'))
    expect(new Set(colours).size).toBe(5)
    expect(screen.getByTestId('line-s0').getAttribute('stroke')).toBe('var(--c0)')
  })

  it('draws one line per symptom in the legend', async () => {
    await setup(sixSymptoms)
    expect(document.querySelectorAll('[data-testid^="line-"]')).toHaveLength(5)
  })

  it('shows all symptoms when there are fewer than five', async () => {
    await setup({ symptoms, entries: { '2026-11-11': { s0: 3, s1: 4 } }, notes: {} })
    expect(within(legend()).getAllByRole('listitem')).toHaveLength(2)
  })

  it('offers day, week and month, with day selected first, and says what period is shown', async () => {
    await setup(sixSymptoms)
    const group = screen.getByRole('radiogroup', { name: 'Period' })
    expect(within(group).getByRole('radio', { name: 'Day' })).toBeChecked()
    expect(screen.getByText('Last 10 days')).toBeInTheDocument()
    await userEvent.click(within(group).getByRole('radio', { name: 'Week' }))
    expect(screen.getByText('Last 10 weeks')).toBeInTheDocument()
    await userEvent.click(within(group).getByRole('radio', { name: 'Month' }))
    expect(screen.getByText('Last 10 months')).toBeInTheDocument()
  })

  it('week mode plots the average of the week, readable in the values table', async () => {
    await setup({
      symptoms,
      entries: { '2026-11-11': { s0: 2 }, '2026-11-10': { s0: 5 }, '2026-11-09': { s0: 8 } },
      notes: {},
    })
    await userEvent.click(screen.getByRole('radio', { name: 'Week' }))
    const row = within(within(screen.getByRole('region', { name: 'Evolution' })).getByRole('table')).getByRole('row', { name: /Hovedpine/ })
    expect(within(row).getAllByRole('cell').at(-1)).toHaveTextContent('5')
  })

  it('shows a yes/no symptom as the share of days answered yes', async () => {
    await setup({
      symptoms: [{ id: 'y', name: 'Fever', type: 'yesno' }],
      entries: { '2026-11-11': { y: 1 }, '2026-11-10': { y: 0 }, '2026-11-09': { y: 0 }, '2026-11-08': { y: 0 } },
      notes: {},
    })
    await userEvent.click(screen.getByRole('radio', { name: 'Week' }))
    const row = within(within(screen.getByRole('region', { name: 'Evolution' })).getByRole('table')).getByRole('row', { name: /Fever/ })
    expect(within(row).getAllByRole('cell').at(-1)).toHaveTextContent('25% of days yes')
  })

  it('shows a period with no data as a gap: no value in the table and a broken line', async () => {
    await setup({ symptoms, entries: { '2026-11-11': { s0: 4 }, '2026-11-08': { s0: 6 } }, notes: {} })
    const row = within(within(screen.getByRole('region', { name: 'Evolution' })).getByRole('table')).getByRole('row', { name: /Hovedpine/ })
    const cells = within(row).getAllByRole('cell')
    expect(cells.at(-2)).toHaveTextContent('–')
    expect(cells.at(-2)).not.toHaveTextContent('0')
    const d = screen.getByTestId('line-s0').getAttribute('d')!
    expect(d.match(/M/g)).toHaveLength(2)
  })

  it('still graphs a symptom after it is archived, when it is the only one logged', async () => {
    await setup({ symptoms: [{ ...symptoms[0], archived: true }], entries: { '2026-11-11': { s0: 4 } }, notes: {} })
    expect(within(legend()).getAllByRole('listitem').map((i) => i.textContent)).toEqual(['Hovedpine'])
  })

  it('tells the user when nothing is logged yet', async () => {
    await setup({ symptoms, entries: {}, notes: {} })
    expect(screen.getByText(/nothing to show yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows the patterns under the graph, for the same diary', async () => {
    await setup(sixSymptoms)
    expect(screen.getByRole('region', { name: 'Evolution' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Average by weekday' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Average by season' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'What moves together' })).toBeInTheDocument()
  })

  it('states that the analysis is not medical advice and makes no diagnosis, also when nothing is logged', async () => {
    await setup(sixSymptoms)
    expect(screen.getByRole('note')).toHaveTextContent(/not medical advice/i)
    expect(screen.getByRole('note')).toHaveTextContent(/diagnosis/i)
  })

  it('shows the not-medical-advice note on an empty diary too', async () => {
    await setup({ symptoms, entries: {}, notes: {} })
    expect(screen.getByRole('note')).toHaveTextContent(/not medical advice/i)
  })
})
