import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportCard } from './ExportCard'
import { ClockProvider } from '../../state/ClockProvider'
import { DiaryProvider } from '../../state/DiaryProvider'
import { memoryRepository } from '../../data/memoryRepository'
import type { Diary } from '../../domain/types'

const NOW = new Date(2026, 10, 11, 21, 0)
const stored: Diary = {
  symptoms: [{ id: 'a', name: 'Hovedpine', type: 'strength' }],
  entries: { '2026-11-01': { a: 2 }, '2026-11-05': { a: 6 }, '2026-11-10': { a: 8 } },
  notes: { '2026-11-05': 'rain' },
}

async function setup(diary: Diary = stored) {
  const download = vi.fn()
  render(
    <ClockProvider now={() => NOW}>
      <DiaryProvider repository={memoryRepository(diary)}>
        <ExportCard download={download} />
      </DiaryProvider>
    </ClockProvider>,
  )
  await screen.findByLabelText('From')
  await screen.findByRole('button', { name: 'Download CSV' })
  return download
}

const setDate = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe('ExportCard', () => {
  it('tells the user what to do if Excel opens the file as one column', async () => {
    await setup()
    expect(screen.getByText(/one column/i)).toHaveTextContent('Data > From Text/CSV')
    expect(screen.getByText(/one column/i)).toHaveTextContent(/comma/i)
  })

  it('starts with the range from the first logged day to today', async () => {
    await setup()
    expect(screen.getByLabelText('From')).toHaveValue('2026-11-01')
    expect(screen.getByLabelText('To')).toHaveValue('2026-11-11')
  })

  it('downloads a CSV of the chosen start and end date, with notes, named after the range', async () => {
    const download = await setup()
    setDate('From', '2026-11-05')
    setDate('To', '2026-11-10')
    await userEvent.click(screen.getByRole('button', { name: 'Download CSV' }))
    expect(download).toHaveBeenCalledTimes(1)
    const [name, content, mime] = download.mock.calls[0]
    expect(name).toBe('symmie-diary-2026-11-05-to-2026-11-10.csv')
    expect(mime).toBe('text/csv')
    expect(content).toContain('2026-11-05,Hovedpine,strength,6')
    expect(content).toContain('2026-11-05,,note,rain')
    expect(content).toContain('2026-11-10,Hovedpine,strength,8')
    expect(content).not.toContain('2026-11-01')
  })

  it('refuses an end date before the start date and downloads nothing', async () => {
    const download = await setup()
    setDate('From', '2026-11-10')
    setDate('To', '2026-11-05')
    await userEvent.click(screen.getByRole('button', { name: 'Download CSV' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/end date.*before/i)
    expect(download).not.toHaveBeenCalled()
  })

  it('says so and downloads nothing when no day in the range has anything logged', async () => {
    const download = await setup()
    setDate('From', '2026-11-06')
    setDate('To', '2026-11-09')
    await userEvent.click(screen.getByRole('button', { name: 'Download CSV' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/nothing logged/i)
    expect(download).not.toHaveBeenCalled()
  })

  it('refuses a cleared date field', async () => {
    const download = await setup()
    setDate('From', '')
    await userEvent.click(screen.getByRole('button', { name: 'Download CSV' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/both dates/i)
    expect(download).not.toHaveBeenCalled()
  })
})
