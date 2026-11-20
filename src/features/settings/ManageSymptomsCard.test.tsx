import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ManageSymptomsCard } from './ManageSymptomsCard'
import { DiaryProvider } from '../../state/DiaryProvider'
import { memoryRepository } from '../../data/memoryRepository'
import type { Diary } from '../../domain/types'

const stored: Diary = {
  symptoms: [
    { id: 'a', name: 'Headache', type: 'strength' },
    { id: 'b', name: 'Nausea', type: 'yesno' },
    { id: 'c', name: 'Cough', type: 'yesno', archived: true },
  ],
  entries: { '2026-11-10': { a: 3, c: 1 } },
  notes: {},
}

async function setup(initial: Diary = stored) {
  const repo = memoryRepository(initial)
  render(
    <DiaryProvider repository={repo}>
      <ManageSymptomsCard />
    </DiaryProvider>,
  )
  await screen.findByRole('region', { name: 'Manage symptoms' })
  await screen.findByText('Headache')
  return repo
}

describe('ManageSymptomsCard', () => {
  it('lists active symptoms with their type, and archived ones under their own heading', async () => {
    await setup()
    const active = screen.getByRole('list', { name: 'Active symptoms' })
    expect(within(active).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Headache'),
      expect.stringContaining('Nausea'),
    ])
    expect(within(active).getByText('Strength 1–10')).toBeInTheDocument()
    expect(within(active).getByText('Yes / no')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Archived symptoms' })).getByText('Cough')).toBeInTheDocument()
  })

  it('renames a symptom and stores the new name', async () => {
    const repo = await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Rename Headache' }))
    const input = screen.getByLabelText('Name')
    await userEvent.clear(input)
    await userEvent.type(input, 'Migraine')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Migraine')).toBeInTheDocument()
    expect(screen.queryByText('Headache')).not.toBeInTheDocument()
    expect((await repo.load()).symptoms[0]).toEqual({ id: 'a', name: 'Migraine', type: 'strength' })
  })

  it('offers no way to change the type while renaming', async () => {
    await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Rename Headache' }))
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it("refuses another active symptom's name and keeps the old one", async () => {
    const repo = await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Rename Headache' }))
    const input = screen.getByLabelText('Name')
    await userEvent.clear(input)
    await userEvent.type(input, 'nausea')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent('You already have that symptom.')
    expect((await repo.load()).symptoms[0].name).toBe('Headache')
  })

  it('refuses a blank name', async () => {
    await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Rename Headache' }))
    await userEvent.clear(screen.getByLabelText('Name'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Type a name.')
  })

  it('cancelling a rename changes nothing', async () => {
    const repo = await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Rename Headache' }))
    await userEvent.type(screen.getByLabelText('Name'), 'xyz')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Headache')).toBeInTheDocument()
    expect((await repo.load()).symptoms[0].name).toBe('Headache')
  })

  it('archives a symptom: it moves to the archived list and its entries stay stored', async () => {
    const repo = await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Archive Headache' }))
    expect(within(screen.getByRole('list', { name: 'Active symptoms' })).queryByText('Headache')).not.toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Archived symptoms' })).getByText('Headache')).toBeInTheDocument()
    const saved = await repo.load()
    expect(saved.symptoms[0].archived).toBe(true)
    expect(saved.entries).toEqual(stored.entries)
  })

  it('restores an archived symptom to the active list', async () => {
    const repo = await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Restore Cough' }))
    expect(within(screen.getByRole('list', { name: 'Active symptoms' })).getByText('Cough')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Archived symptoms' })).not.toBeInTheDocument()
    expect((await repo.load()).symptoms[2].archived).toBeUndefined()
  })

  it('will not restore a symptom while an active one has the same name', async () => {
    const repo = await setup({ ...stored, symptoms: [...stored.symptoms, { id: 'd', name: 'cough', type: 'strength' }] })
    await userEvent.click(screen.getByRole('button', { name: 'Restore Cough' }))
    expect(screen.getByRole('alert')).toHaveTextContent('You already have that symptom.')
    expect((await repo.load()).symptoms[2].archived).toBe(true)
  })

  it('has no button that deletes a symptom', async () => {
    await setup()
    expect(screen.queryByRole('button', { name: /delete|remove/i })).not.toBeInTheDocument()
  })
})
