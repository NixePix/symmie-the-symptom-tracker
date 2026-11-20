import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LogScreen } from './LogScreen'
import { ClockProvider } from '../../state/ClockProvider'
import { DiaryProvider } from '../../state/DiaryProvider'
import { memoryRepository } from '../../data/memoryRepository'
import type { DiaryRepository } from '../../data/DiaryRepository'
import { emptyDiary, type Diary } from '../../domain/types'

const NOW = new Date(2026, 10, 11, 21, 0) // Wed 11 Nov 2026
const TODAY = '2026-11-11'
const diary = (over: Partial<Diary> = {}): Diary => ({
  ...emptyDiary(),
  symptoms: [
    { id: 'a', name: 'Headache', type: 'strength' },
    { id: 'b', name: 'Nausea', type: 'yesno' },
  ],
  ...over,
})

async function setup(repo: DiaryRepository = memoryRepository(diary())) {
  let n = 0
  const view = render(
    <ClockProvider now={() => NOW}>
      <DiaryProvider repository={repo} newId={() => `new${++n}`}>
        <LogScreen />
      </DiaryProvider>
    </ClockProvider>,
  )
  await screen.findByRole('heading', { level: 2 })
  return { repo, ...view }
}

describe('LogScreen with no symptoms', () => {
  it('invites the user to add one', async () => {
    await setup(memoryRepository())
    expect(screen.getByText(/no symptoms yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add symptom' })).toBeInTheDocument()
  })
})

describe('adding a symptom', () => {
  it('adds a strength symptom by name and shows it as the current step', async () => {
    const { repo } = await setup(memoryRepository())
    await userEvent.click(screen.getByRole('button', { name: 'Add symptom' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Fatigue')
    expect(screen.getByRole('radio', { name: /strength/i })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Fatigue' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^10/ })).toBeInTheDocument()
    expect((await repo.load()).symptoms).toEqual([{ id: 'new1', name: 'Fatigue', type: 'strength' }])
  })

  it('adds a yes/no symptom when that type is chosen, and shows Yes and No', async () => {
    const { repo } = await setup(memoryRepository())
    await userEvent.click(screen.getByRole('button', { name: 'Add symptom' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Nausea')
    await userEvent.click(screen.getByRole('radio', { name: /yes/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument()
    expect((await repo.load()).symptoms[0].type).toBe('yesno')
  })

  it('shows an error and keeps the sheet open for an empty name', async () => {
    const { repo } = await setup(memoryRepository())
    await userEvent.click(screen.getByRole('button', { name: 'Add symptom' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Type a name.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect((await repo.load()).symptoms).toEqual([])
  })

  it('shows an error for a name the user already has', async () => {
    await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Add symptom' }))
    await userEvent.type(screen.getByLabelText('Name'), 'headache')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent('You already have that symptom.')
  })

  it('closes the sheet without adding anything on Close', async () => {
    const { repo } = await setup(memoryRepository())
    await userEvent.click(screen.getByRole('button', { name: 'Add symptom' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Fatigue')
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await repo.load()).symptoms).toEqual([])
  })
})

describe('logging a value', () => {
  it("starts on today's overview, with no symptom open", async () => {
    await setup()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Today')
    expect(screen.getByRole('region', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })

  it('shows the Overview segment first in the progress bar, then one per symptom in order', async () => {
    await setup()
    const bar = screen.getAllByRole('button').filter((b) => ['Overview', 'Headache', 'Nausea'].includes(b.getAttribute('aria-label') ?? ''))
    expect(bar.map((b) => b.getAttribute('aria-label'))).toEqual(['Overview', 'Headache', 'Nausea'])
    expect(bar[0]).toHaveAttribute('aria-current', 'step')
  })

  it('opens a symptom from its progress segment, and the Overview segment returns', async () => {
    await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Headache' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Overview' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Overview' }))
    expect(screen.getByRole('region', { name: 'Overview' })).toBeInTheDocument()
  })

  it('opens a symptom from its row on the overview', async () => {
    await setup(memoryRepository(diary({ entries: { [TODAY]: { a: 5 } } })))
    await userEvent.click(within(screen.getByRole('region', { name: 'Overview' })).getByRole('button', { name: 'Headache 5' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Headache' })).toBeInTheDocument()
  })

  it('moves to the overview after the last symptom is set, and to the next symptom after any other', async () => {
    await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    await userEvent.click(screen.getByRole('button', { name: /^5/ }))
    expect(screen.getByRole('heading', { level: 3, name: 'Nausea' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByRole('region', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-current', 'step')
  })

  it('takes one tap on an open symptom: choosing 7 saves it for today, then the next symptom is shown', async () => {
    const { repo } = await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    await userEvent.click(screen.getByRole('button', { name: /^7/ }))
    expect((await repo.load()).entries[TODAY]).toEqual({ a: 7 })
    expect(screen.getByRole('heading', { level: 3, name: 'Nausea' })).toBeInTheDocument()
  })

  it('saves Yes as 1 and No as 0', async () => {
    const { repo } = await setup(memoryRepository(diary()))
    await userEvent.click(screen.getByRole('button', { name: 'Nausea' })) // progress segment: 1 tap to reach step 2
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect((await repo.load()).entries[TODAY]).toEqual({ b: 1 })
  })

  it('takes two taps to log a later symptom: its progress segment, then a value', async () => {
    const { repo } = await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Nausea' }))
    await userEvent.click(screen.getByRole('button', { name: 'No' }))
    expect((await repo.load()).entries[TODAY]).toEqual({ b: 0 })
  })

  it('replaces the value when the same symptom is set again the same day', async () => {
    const { repo } = await setup(memoryRepository(diary({ entries: { [TODAY]: { a: 3 } } })))
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    await userEvent.click(screen.getByRole('button', { name: /^8/ }))
    expect((await repo.load()).entries[TODAY]).toEqual({ a: 8 })
  })

  it('marks the stored value as pressed', async () => {
    await setup(memoryRepository(diary({ entries: { [TODAY]: { a: 3 } } })))
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    expect(screen.getByRole('button', { name: /^3/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^4/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('offers exactly the values 1 to 10 for a strength symptom', async () => {
    await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    const scale = screen.getByRole('group', { name: 'Headache strength' })
    const names = within(scale).getAllByRole('button').map((b) => b.textContent)
    expect(names.map((t) => parseInt(t!, 10))).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
  })

  it('lists each value on the overview; a tile opens its symptom', async () => {
    await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    await userEvent.click(screen.getByRole('button', { name: /^5/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))
    const recap = screen.getByRole('region', { name: 'Overview' })
    expect(within(recap).getByRole('button', { name: 'Headache 5' })).toBeInTheDocument()
    expect(within(recap).getByRole('button', { name: 'Nausea Yes' })).toBeInTheDocument()
    await userEvent.click(within(recap).getByRole('button', { name: 'Headache 5' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Headache' })).toBeInTheDocument()
  })

  it('does not offer an archived symptom', async () => {
    await setup(
      memoryRepository(diary({ symptoms: [{ id: 'a', name: 'Headache', type: 'strength', archived: true }, { id: 'b', name: 'Nausea', type: 'yesno' }] })),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Nausea' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Nausea' })).toBeInTheDocument()
    expect(screen.queryByText('Headache')).not.toBeInTheDocument()
  })

  it('shows a notice, and keeps the value on screen, when the write fails', async () => {
    const repo = memoryRepository(diary())
    repo.putEntry = () => Promise.reject(new Error('quota'))
    await setup(repo)
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    await userEvent.click(screen.getByRole('button', { name: /^6/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i)
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    expect(screen.getByRole('button', { name: /^6/ })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('earlier days', () => {
  it('shows 21 days ending today, with today marked as the current one', async () => {
    await setup()
    const strip = screen.getByRole('group', { name: 'Choose a day' })
    const days = within(strip).getAllByRole('button')
    expect(days).toHaveLength(21)
    expect(days.at(-1)).toHaveAccessibleName('Wed 11 Nov')
    expect(days.at(-1)).toHaveAttribute('aria-current', 'date')
    expect(days[0]).toHaveAccessibleName('Thu 22 Oct')
  })

  it('takes three taps to log yesterday: the day, the symptom, then a value; today is untouched', async () => {
    const { repo } = await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Tue 10 Nov' }))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Yesterday')
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    await userEvent.click(screen.getByRole('button', { name: /^4/ }))
    expect((await repo.load()).entries).toEqual({ '2026-11-10': { a: 4 } })
  })

  it('changes a value on an earlier day', async () => {
    const { repo } = await setup(memoryRepository(diary({ entries: { '2026-11-05': { a: 2 } } })))
    await userEvent.click(screen.getByRole('button', { name: 'Thu 5 Nov' }))
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    expect(screen.getByRole('button', { name: /^2/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: /^9/ }))
    expect((await repo.load()).entries['2026-11-05']).toEqual({ a: 9 })
  })

  it("shows the chosen day's overview when the day changes, even if a symptom was open", async () => {
    await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Nausea' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Nausea' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tue 10 Nov' }))
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-current', 'step')
  })

  it('takes three taps to log a later symptom on yesterday: the day, its segment, then a value', async () => {
    const { repo } = await setup(
      memoryRepository(diary({ symptoms: [...diary().symptoms, { id: 'c', name: 'Fatigue', type: 'strength' }] })),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Tue 10 Nov' })) // tap 1
    await userEvent.click(screen.getByRole('button', { name: 'Fatigue' })) // tap 2
    await userEvent.click(screen.getByRole('button', { name: /^6/ })) // tap 3
    expect((await repo.load()).entries).toEqual({ '2026-11-10': { c: 6 } })
  })

  it('titles an older day with its date', async () => {
    await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Thu 5 Nov' }))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Thu 5 Nov')
  })
})

describe('day note', () => {
  afterEach(() => vi.useRealTimers())

  it('offers a Day note field on the overview, empty when the day has no note', async () => {
    await setup()
    expect(screen.getByLabelText('Day note')).toHaveValue('')
  })

  it('saves typed text as the note for the selected day once typing has paused for 400 ms, not on each keystroke', async () => {
    const { repo } = await setup()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    fireEvent.change(screen.getByLabelText('Day note'), { target: { value: 'Ran 5 km' } })
    expect((await repo.load()).notes).toEqual({})
    await act(() => vi.advanceTimersByTimeAsync(399))
    expect((await repo.load()).notes).toEqual({})
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect((await repo.load()).notes).toEqual({ [TODAY]: 'Ran 5 km' })
  })

  it('shows the stored note for the day, and a different day shows its own', async () => {
    await setup(memoryRepository(diary({ notes: { [TODAY]: 'Ran 5 km', '2026-11-10': 'Rest day' } })))
    expect(screen.getByLabelText('Day note')).toHaveValue('Ran 5 km')
    await userEvent.click(screen.getByRole('button', { name: 'Tue 10 Nov' }))
    expect(screen.getByLabelText('Day note')).toHaveValue('Rest day')
  })

  it('replaces the text when the note is edited: the day still has one note', async () => {
    const { repo } = await setup(memoryRepository(diary({ notes: { [TODAY]: 'Ran 5 km' } })))
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    fireEvent.change(screen.getByLabelText('Day note'), { target: { value: 'Swam' } })
    await act(() => vi.advanceTimersByTimeAsync(400))
    expect((await repo.load()).notes).toEqual({ [TODAY]: 'Swam' })
  })

  it('does not lose text typed just before the day is changed', async () => {
    const { repo } = await setup()
    await userEvent.type(screen.getByLabelText('Day note'), 'Late meal')
    await userEvent.click(screen.getByRole('button', { name: 'Tue 10 Nov' }))
    expect((await repo.load()).notes).toEqual({ [TODAY]: 'Late meal' })
    expect(screen.getByLabelText('Day note')).toHaveValue('')
  })

  it('deletes the note with Delete note, at once', async () => {
    const { repo } = await setup(memoryRepository(diary({ notes: { [TODAY]: 'Ran 5 km' } })))
    await userEvent.click(screen.getByRole('button', { name: 'Delete note' }))
    expect((await repo.load()).notes).toEqual({})
    expect(screen.getByLabelText('Day note')).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Delete note' })).not.toBeInTheDocument()
  })

  it('keeps a day that has a note and no symptom values', async () => {
    const { repo } = await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Tue 10 Nov' }))
    await userEvent.type(screen.getByLabelText('Day note'), 'Felt fine')
    await userEvent.click(screen.getByRole('button', { name: 'Wed 11 Nov' }))
    const stored = await repo.load()
    expect(stored.notes['2026-11-10']).toBe('Felt fine')
    expect(stored.entries['2026-11-10']).toBeUndefined()
  })

  it('shows a notice when the note cannot be saved', async () => {
    const repo = memoryRepository(diary())
    repo.putNote = () => Promise.reject(new Error('quota'))
    await setup(repo)
    await userEvent.type(screen.getByLabelText('Day note'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Tue 10 Nov' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i)
  })
})

describe('same as yesterday', () => {
  const YESTERDAY = '2026-11-10'
  const withYesterday = (entries: Diary['entries'] = { [YESTERDAY]: { b: 1 } }) =>
    memoryRepository(diary({ entries }))
  const sameButton = () => screen.getByRole('button', { name: /^Same as yesterday/ })

  it('lists the symptoms logged yesterday before the others', async () => {
    await setup(withYesterday())
    const bar = screen.getAllByRole('button').filter((b) => ['Overview', 'Headache', 'Nausea'].includes(b.getAttribute('aria-label') ?? ''))
    expect(bar.map((b) => b.getAttribute('aria-label'))).toEqual(['Overview', 'Nausea', 'Headache'])
  })

  it("shows yesterday's value on the button and marks it on the scale, without saving it", async () => {
    const { repo } = await setup(withYesterday({ [YESTERDAY]: { a: 7 } }))
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    expect(sameButton()).toHaveTextContent('7')
    expect(screen.getByRole('button', { name: /^7.*yesterday/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^7/ })).toHaveAttribute('aria-pressed', 'false')
    expect((await repo.load()).entries[TODAY]).toBeUndefined()
  })

  it('shows yesterday\'s yes/no value on the button', async () => {
    await setup(withYesterday({ [YESTERDAY]: { b: 1 } }))
    await userEvent.click(screen.getByRole('button', { name: 'Nausea' }))
    expect(sameButton()).toHaveTextContent('Yes')
  })

  it("saves yesterday's value for today with one tap, then shows the next symptom", async () => {
    const { repo } = await setup(withYesterday({ [YESTERDAY]: { a: 7, b: 0 } }))
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    await userEvent.click(sameButton())
    expect((await repo.load()).entries[TODAY]).toEqual({ a: 7 })
    expect(screen.getByRole('heading', { level: 3, name: 'Nausea' })).toBeInTheDocument()
    await userEvent.click(sameButton())
    expect((await repo.load()).entries[TODAY]).toEqual({ a: 7, b: 0 })
  })

  it('still lets the value be changed: choosing another band saves that one', async () => {
    const { repo } = await setup(withYesterday({ [YESTERDAY]: { a: 7 } }))
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    await userEvent.click(screen.getByRole('button', { name: /^4/ }))
    expect((await repo.load()).entries[TODAY]).toEqual({ a: 4 })
  })

  it('hides the button once today already has yesterday\'s value, and shows it again for a different one', async () => {
    await setup(withYesterday({ [YESTERDAY]: { a: 7 }, [TODAY]: { a: 7 } }))
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    expect(screen.queryByRole('button', { name: /^Same as yesterday/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^3/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    expect(sameButton()).toHaveTextContent('7')
  })

  it('does not offer the button for a symptom not logged yesterday', async () => {
    await setup(withYesterday({ [YESTERDAY]: { b: 1 } }))
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    expect(screen.queryByRole('button', { name: /^Same as yesterday/ })).not.toBeInTheDocument()
  })

  it('looks as it does today when nothing was logged yesterday', async () => {
    await setup(withYesterday({ '2026-11-08': { a: 7 } }))
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Headache' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Same as/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/yesterday/i)).not.toBeInTheDocument()
  })

  it('shows the overview, not the symptom now at that position, when changing day reorders the symptoms', async () => {
    await setup(withYesterday({ [YESTERDAY]: { b: 1 } })) // today order: Nausea, Headache
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    await userEvent.click(screen.getByRole('button', { name: 'Tue 10 Nov' })) // that day's order: Headache, Nausea
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Overview' })).toBeInTheDocument()
  })

  it('on an older day, offers the day before it and calls it that', async () => {
    const { repo } = await setup(withYesterday({ '2026-11-09': { a: 5 } }))
    await userEvent.click(screen.getByRole('button', { name: 'Tue 10 Nov' }))
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    await userEvent.click(screen.getByRole('button', { name: /^Same as the day before/ }))
    expect((await repo.load()).entries['2026-11-10']).toEqual({ a: 5 })
  })
})

describe('deleting a past value', () => {
  const past = () => memoryRepository(diary({ entries: { '2026-11-05': { a: 2, b: 1 } } }))

  it('offers Clear value only when the open day has a value for the symptom', async () => {
    await setup(past())
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    expect(screen.queryByRole('button', { name: 'Clear value' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Thu 5 Nov' }))
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    expect(screen.getByRole('button', { name: 'Clear value' })).toBeInTheDocument()
  })

  it('deletes that day’s value for the symptom only, and stays on the symptom', async () => {
    const { repo } = await setup(past())
    await userEvent.click(screen.getByRole('button', { name: 'Thu 5 Nov' }))
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    await userEvent.click(screen.getByRole('button', { name: 'Clear value' }))
    expect((await repo.load()).entries).toEqual({ '2026-11-05': { b: 1 } })
    expect(screen.getByRole('heading', { level: 3, name: 'Headache' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear value' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^2/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('removes the day from the stored entries when its last value is cleared', async () => {
    const { repo } = await setup(memoryRepository(diary({ entries: { '2026-11-05': { a: 2 } } })))
    await userEvent.click(screen.getByRole('button', { name: 'Thu 5 Nov' }))
    await userEvent.click(screen.getByRole('button', { name: 'Headache' }))
    await userEvent.click(screen.getByRole('button', { name: 'Clear value' }))
    expect((await repo.load()).entries).toEqual({})
  })
})

describe('managing symptoms from the log screen', () => {
  const openManage = () => userEvent.click(screen.getByRole('button', { name: 'Manage symptoms' }))
  const withHistory = () =>
    memoryRepository(diary({ entries: { '2026-11-05': { a: 2, b: 1 } } }))

  it('a renamed symptom shows its new name on a past day’s overview, with the old value', async () => {
    await setup(withHistory())
    await openManage()
    await userEvent.click(screen.getByRole('button', { name: 'Rename Headache' }))
    const input = screen.getByLabelText('Name')
    await userEvent.clear(input)
    await userEvent.type(input, 'Migraine')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await userEvent.click(screen.getByRole('button', { name: 'Thu 5 Nov' }))
    await userEvent.click(screen.getByRole('button', { name: 'Migraine' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Migraine' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^2/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('an archived symptom is gone from the log steps, and its entries stay stored', async () => {
    const { repo } = await setup(withHistory())
    await openManage()
    await userEvent.click(screen.getByRole('button', { name: 'Archive Headache' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('button', { name: 'Nausea' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Headache' })).not.toBeInTheDocument()
    expect((await repo.load()).entries).toEqual({ '2026-11-05': { a: 2, b: 1 } })
  })

  it('a restored symptom is back on the log screen', async () => {
    await setup(memoryRepository(diary({ symptoms: [{ id: 'a', name: 'Headache', type: 'strength', archived: true }, { id: 'b', name: 'Nausea', type: 'yesno' }] })))
    expect(screen.queryByRole('heading', { level: 3, name: 'Headache' })).not.toBeInTheDocument()
    await openManage()
    await userEvent.click(screen.getByRole('button', { name: 'Restore Headache' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('button', { name: 'Headache' })).toBeInTheDocument()
  })
})

describe('export and backup from the log screen', () => {
  it('opens a sheet with the CSV export and the backup card', async () => {
    await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Export and backup' }))
    const sheet = screen.getByRole('dialog', { name: 'Export and backup' })
    expect(within(sheet).getByRole('region', { name: 'Export to a spreadsheet' })).toBeInTheDocument()
    expect(within(sheet).getByRole('region', { name: 'Backup and restore' })).toBeInTheDocument()
  })

  it('shows the restored day note in the open overview note field after an import replaces the diary', async () => {
    await setup(memoryRepository(diary({ notes: { [TODAY]: 'old note' } })))
    expect(screen.getByLabelText('Day note')).toHaveValue('old note')
    await userEvent.click(screen.getByRole('button', { name: 'Export and backup' }))
    const restored = { version: 1, diary: diary({ entries: { [TODAY]: { a: 5, b: 1 } }, notes: { [TODAY]: 'restored note' } }) }
    await userEvent.upload(screen.getByLabelText('Import a backup file'), new File([JSON.stringify(restored)], 'b.json'))
    await userEvent.click(screen.getByRole('button', { name: 'Replace' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Export and backup' })).getByRole('button', { name: 'Close' }))
    expect(screen.getByLabelText('Day note')).toHaveValue('restored note')
  })
})
