import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { memoryCredentialStore } from '../data/memoryCredentialStore'
import { memoryRepository } from '../data/memoryRepository'
import { hashPassword } from '../data/passwordHasher'

const ITER = 1000
const NOW = new Date(2026, 10, 11, 9, 0)

async function accountStore() {
  const store = memoryCredentialStore()
  await store.save({ username: 'anna', ...(await hashPassword('pw', ITER)) })
  return store
}

function renderApp(credentials: Awaited<ReturnType<typeof accountStore>>, repository = memoryRepository()) {
  return {
    repository,
    ...render(<App credentials={credentials} repository={repository} iterations={ITER} now={() => NOW} />),
  }
}

async function unlock() {
  await userEvent.type(await screen.findByLabelText('Username'), 'anna')
  await userEvent.type(screen.getByLabelText('Password'), 'pw')
  await userEvent.click(screen.getByRole('button', { name: 'Unlock' }))
}

describe('App', () => {
  it('shows the symptoms screen after unlocking, not before', async () => {
    renderApp(await accountStore())
    await screen.findByRole('button', { name: 'Unlock' })
    expect(screen.queryByRole('button', { name: 'Add symptom' })).not.toBeInTheDocument()
    await unlock()
    expect(await screen.findByRole('button', { name: 'Add symptom' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Symmie' })).toBeInTheDocument()
  })

  it('keeps logged values after the app is closed and reopened', async () => {
    const credentials = await accountStore()
    const repository = memoryRepository()
    const first = renderApp(credentials, repository)
    await unlock()
    await userEvent.click(await screen.findByRole('button', { name: 'Add symptom' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Headache')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await userEvent.click(screen.getByRole('button', { name: /^6/ }))
    first.unmount()

    renderApp(credentials, repository)
    await unlock()
    await userEvent.click(await screen.findByRole('button', { name: 'Headache' }))
    expect(screen.getByRole('button', { name: /^6/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('reaches the analysis screen from a navigation bar and back to the log', async () => {
    renderApp(await accountStore())
    await unlock()
    const nav = await screen.findByRole('navigation', { name: 'Screens' })
    expect(within(nav).getByRole('button', { name: 'Log' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(within(nav).getByRole('button', { name: 'Analysis' }))
    expect(await screen.findByRole('radiogroup', { name: 'Period' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add symptom' })).not.toBeInTheDocument()
    await userEvent.click(within(nav).getByRole('button', { name: 'Log' }))
    expect(await screen.findByRole('button', { name: 'Add symptom' })).toBeInTheDocument()
  })
})
