import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BackupCard } from './BackupCard'
import { ClockProvider } from '../../state/ClockProvider'
import { DiaryProvider, useDiary } from '../../state/DiaryProvider'
import { memoryRepository } from '../../data/memoryRepository'
import type { DiaryRepository } from '../../data/DiaryRepository'
import { emptyDiary, type Diary } from '../../domain/types'

const NOW = new Date(2026, 10, 11, 21, 0)
const phoneA: Diary = {
  symptoms: [
    { id: 'a', name: 'Hovedpine', type: 'strength' },
    { id: 'b', name: 'Nausea', type: 'yesno', archived: true },
  ],
  entries: { '2026-11-10': { a: 4, b: 1 } },
  notes: { '2026-11-10': 'Slept badly' },
}
const phoneB: Diary = {
  symptoms: [{ id: 'z', name: 'Cough', type: 'yesno' }],
  entries: { '2026-11-09': { z: 1 } },
  notes: {},
}

function Shown() {
  const { diary } = useDiary()
  return <pre data-testid="diary">{JSON.stringify(diary)}</pre>
}

async function setup(repo: DiaryRepository, download = vi.fn()) {
  const view = render(
    <ClockProvider now={() => NOW}>
      <DiaryProvider repository={repo}>
        <BackupCard download={download} />
        <Shown />
      </DiaryProvider>
    </ClockProvider>,
  )
  await screen.findByRole('button', { name: 'Download backup' })
  await vi.waitFor(() => expect(screen.getByTestId('diary').textContent).not.toBe(JSON.stringify(emptyDiary())))
  return Object.assign(download, { unmount: view.unmount })
}

const shown = () => JSON.parse(screen.getByTestId('diary').textContent ?? '') as Diary
const file = (text: string) => new File([text], 'backup.json', { type: 'application/json' })
const choose = (text: string) => userEvent.upload(screen.getByLabelText('Import a backup file'), file(text))

describe('BackupCard', () => {
  it('downloads the whole diary, including archived symptoms, as a versioned JSON file dated today', async () => {
    const download = await setup(memoryRepository(phoneA))
    await userEvent.click(screen.getByRole('button', { name: 'Download backup' }))
    const [name, content, mime] = download.mock.calls[0]
    expect(name).toBe('symmie-backup-2026-11-11.json')
    expect(mime).toBe('application/json')
    expect(JSON.parse(content)).toEqual({ version: 1, diary: phoneA })
  })

  it('moves a diary to another phone: the downloaded file, imported there, shows the same symptoms, values and notes', async () => {
    const download = await setup(memoryRepository(phoneA))
    await userEvent.click(screen.getByRole('button', { name: 'Download backup' }))
    const text: string = download.mock.calls[0][1]

    // The other phone has data of its own, so the import asks first.
    const otherRepo = memoryRepository(phoneB)
    download.unmount()
    await setup(otherRepo)
    await choose(text)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Replace' }))

    expect(shown()).toEqual(phoneA)
    await vi.waitFor(async () => expect(await otherRepo.load()).toEqual(phoneA))
    expect(screen.getByRole('status')).toHaveTextContent(/restored/i)
  })

  it('asks before replacing a diary that has data, and changes nothing until the user confirms', async () => {
    const repo = memoryRepository(phoneB)
    await setup(repo)
    await choose(JSON.stringify({ version: 1, diary: phoneA }))
    const dialog = screen.getByRole('dialog', { name: /replace/i })
    expect(dialog).toHaveTextContent('1 symptom')
    expect(shown()).toEqual(phoneB)
    expect(await repo.load()).toEqual(phoneB)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(shown()).toEqual(phoneB)
    expect(await repo.load()).toEqual(phoneB)
  })

  it('imports straight into an empty diary without asking', async () => {
    const repo = memoryRepository(emptyDiary())
    render(
      <ClockProvider now={() => NOW}>
        <DiaryProvider repository={repo}>
          <BackupCard download={vi.fn()} />
          <Shown />
        </DiaryProvider>
      </ClockProvider>,
    )
    await screen.findByRole('button', { name: 'Download backup' })
    await choose(JSON.stringify({ version: 1, diary: phoneA }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await vi.waitFor(() => expect(shown()).toEqual(phoneA))
  })

  it.each([
    ['text that is not JSON', 'not json'],
    ['a file that is not a backup', JSON.stringify({ hello: 1 })],
    ['a backup from a newer version', JSON.stringify({ version: 99, diary: phoneA })],
    ['a backup with an invalid value', JSON.stringify({ version: 1, diary: { ...phoneA, entries: { '2026-11-10': { a: 99 } } } })],
  ])('shows an error and changes nothing for %s', async (_label, text) => {
    const repo = memoryRepository(phoneB)
    await setup(repo)
    await choose(text)
    expect(screen.getByRole('alert')).toHaveTextContent(/backup/i)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(shown()).toEqual(phoneB)
    expect(await repo.load()).toEqual(phoneB)
  })

  it('can import the same file again after cancelling', async () => {
    await setup(memoryRepository(phoneB))
    const text = JSON.stringify({ version: 1, diary: phoneA })
    await choose(text)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await choose(text)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
