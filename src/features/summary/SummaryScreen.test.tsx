import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SummaryScreen } from './SummaryScreen'
import { ClockProvider } from '../../state/ClockProvider'
import { DiaryProvider } from '../../state/DiaryProvider'
import { memoryRepository } from '../../data/memoryRepository'
import type { Diary } from '../../domain/types'

const NOW = new Date(2026, 10, 11, 21, 0)

const diary: Diary = {
  symptoms: [
    { id: 'a', name: 'Headache', type: 'strength' },
    { id: 'b', name: 'Nausea', type: 'yesno' },
  ],
  entries: {
    '2026-10-01': { a: 9 },
    '2026-11-02': { a: 2, b: 1 },
    '2026-11-03': { a: 6, b: 0 },
    '2026-11-05': { a: 4, b: 1 },
  },
  notes: { '2026-11-02': 'Rain all day', '2026-10-01': 'Before the range' },
}

async function setup(d: Diary = diary, print = vi.fn()) {
  const user = userEvent.setup()
  render(
    <ClockProvider now={() => NOW}>
      <DiaryProvider repository={memoryRepository(d)}>
        <SummaryScreen print={print} />
      </DiaryProvider>
    </ClockProvider>,
  )
  await screen.findByLabelText('From')
  return { user, print }
}

async function openRange(user: ReturnType<typeof userEvent.setup>, from: string, to: string) {
  await user.clear(screen.getByLabelText('From'))
  await user.type(screen.getByLabelText('From'), from)
  await user.clear(screen.getByLabelText('To'))
  await user.type(screen.getByLabelText('To'), to)
  await user.click(screen.getByRole('button', { name: 'Open summary' }))
}

describe('SummaryScreen', () => {
  it('shows a date range that ends today and shows no summary until the user opens one', async () => {
    await setup()
    expect(screen.getByLabelText('To')).toHaveValue('2026-11-11')
    expect(screen.getByLabelText('From')).toHaveValue('2026-10-13')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('opens a summary page for the chosen range with the graph and the day notes inside it', async () => {
    const { user } = await setup()
    await openRange(user, '2026-11-01', '2026-11-10')
    const page = screen.getByRole('article', { name: /^Summary/ })
    expect(page).toHaveTextContent('Sun 1 Nov')
    expect(page).toHaveTextContent('Tue 10 Nov')
    expect(within(page).getByRole('img', { name: /graph/i })).toBeInTheDocument()
    const notes = within(page).getByRole('region', { name: 'Day notes' })
    expect(notes).toHaveTextContent('Mon 2 Nov')
    expect(notes).toHaveTextContent('Rain all day')
    expect(notes).not.toHaveTextContent('Before the range')
  })

  it('lists for each symptom its average, highest value and days logged in the range', async () => {
    const { user } = await setup()
    await openRange(user, '2026-11-01', '2026-11-10')
    const table = screen.getByRole('table', { name: 'Symptoms in this range' })
    const row = (name: string) => within(within(table).getByRole('row', { name: new RegExp(name) })).getAllByRole('cell').map((c) => c.textContent)
    expect(row('Headache')).toEqual(['4', '6', '3'])
    expect(row('Nausea')).toEqual(['67% of days yes', 'Yes', '3'])
  })

  it('says it describes the entries and makes no diagnosis', async () => {
    const { user } = await setup()
    await openRange(user, '2026-11-01', '2026-11-10')
    expect(screen.getByRole('note')).toHaveTextContent(/makes no diagnosis/i)
    expect(screen.getByRole('note')).toHaveTextContent(/describes/i)
  })

  it('prints through the phone print menu when asked, and only then', async () => {
    const { user, print } = await setup()
    await openRange(user, '2026-11-01', '2026-11-10')
    expect(print).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Print or save as PDF' }))
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('hides the range form and the print button when printing, and not the page', async () => {
    const { user } = await setup()
    await openRange(user, '2026-11-01', '2026-11-10')
    expect(screen.getByRole('button', { name: 'Print or save as PDF' }).closest('[data-noprint]')).not.toBeNull()
    expect(screen.getByLabelText('From').closest('[data-noprint]')).not.toBeNull()
    expect(screen.getByRole('article').closest('[data-noprint]')).toBeNull()
    const css = [...document.querySelectorAll('style')].map((e) => e.textContent).join('')
    expect(css).toMatch(/@media print\s*{[^}]*\[data-noprint\][^}]*display:\s*none/)
  })

  it('refuses a range that ends before it starts, and one with nothing logged', async () => {
    const { user } = await setup()
    await openRange(user, '2026-11-10', '2026-11-01')
    expect(screen.getByRole('alert')).toHaveTextContent('The end date is before the start date.')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    await openRange(user, '2026-09-01', '2026-09-05')
    expect(screen.getByRole('alert')).toHaveTextContent('Nothing logged in these dates.')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('draws no graph for a one-day range but still lists the symptom', async () => {
    const { user } = await setup()
    await openRange(user, '2026-11-02', '2026-11-02')
    expect(screen.queryByRole('img', { name: /graph/i })).not.toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Symptoms in this range' })).toHaveTextContent('Headache')
  })

  it('shows a note saying there are no notes when the range has none', async () => {
    const { user } = await setup()
    await openRange(user, '2026-11-03', '2026-11-05')
    expect(screen.getByRole('region', { name: 'Day notes' })).toHaveTextContent('No day notes in this range.')
  })
})
