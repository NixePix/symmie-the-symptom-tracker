import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LockGate } from './LockGate'
import { SessionProvider, useSession } from '../state/SessionProvider'
import { memoryCredentialStore } from '../data/memoryCredentialStore'
import { hashPassword } from '../data/passwordHasher'
import type { CredentialStore } from '../data/CredentialStore'

const ITER = 1000

function LockNow() {
  return <button onClick={useSession().lock}>Lock now</button>
}

function setup(store: CredentialStore) {
  return render(
    <SessionProvider store={store} iterations={ITER}>
      <LockGate>
        <p>Symptoms screen</p>
        <LockNow />
      </LockGate>
    </SessionProvider>,
  )
}

async function storeWith(username: string, password: string) {
  const store = memoryCredentialStore()
  await store.save({ username, ...(await hashPassword(password, ITER)) })
  return store
}

describe('LockGate on first run', () => {
  it('asks for a username and a repeated password, and hides the app', async () => {
    setup(memoryCredentialStore())
    expect(await screen.findByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Repeat password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create and open' })).toBeInTheDocument()
    expect(screen.queryByText('Symptoms screen')).not.toBeInTheDocument()
  })

  it('says the credentials stay on this phone', async () => {
    setup(memoryCredentialStore())
    expect(await screen.findByText(/stored on this phone only/i)).toBeInTheDocument()
  })

  it('saves the account (hashed) and opens the app', async () => {
    const store = memoryCredentialStore()
    setup(store)
    await userEvent.type(await screen.findByLabelText('Username'), 'anna')
    await userEvent.type(screen.getByLabelText('Password'), 'Pw-12345')
    await userEvent.type(screen.getByLabelText('Repeat password'), 'Pw-12345')
    await userEvent.click(screen.getByRole('button', { name: 'Create and open' }))
    expect(await screen.findByText('Symptoms screen')).toBeInTheDocument()
    const saved = await store.load()
    expect(saved?.username).toBe('anna')
    expect(saved?.hash).toBeTruthy()
    expect(JSON.stringify(saved)).not.toContain('Pw-12345')
  })

  it('shows an error and saves nothing when the passwords differ', async () => {
    const store = memoryCredentialStore()
    setup(store)
    await userEvent.type(await screen.findByLabelText('Username'), 'anna')
    await userEvent.type(screen.getByLabelText('Password'), 'Abcdef1!')
    await userEvent.type(screen.getByLabelText('Repeat password'), 'Abcdef1?')
    await userEvent.click(screen.getByRole('button', { name: 'Create and open' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match.')
    expect(await store.load()).toBeNull()
    expect(screen.queryByText('Symptoms screen')).not.toBeInTheDocument()
  })

  it('shows an error and saves nothing when username or password is empty', async () => {
    const store = memoryCredentialStore()
    setup(store)
    await userEvent.type(await screen.findByLabelText('Username'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Create and open' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a username and password.')
    expect(await store.load()).toBeNull()
  })

  it('submits with Enter', async () => {
    setup(memoryCredentialStore())
    await userEvent.type(await screen.findByLabelText('Username'), 'anna')
    await userEvent.type(screen.getByLabelText('Password'), 'Pw-12345')
    await userEvent.type(screen.getByLabelText('Repeat password'), 'Pw-12345{Enter}')
    expect(await screen.findByText('Symptoms screen')).toBeInTheDocument()
  })
})

describe('LockGate when saving fails', () => {
  it('shows an error, stays on the setup form and opens nothing', async () => {
    const store = memoryCredentialStore()
    store.save = () => Promise.reject(new Error('quota'))
    setup(store)
    await userEvent.type(await screen.findByLabelText('Username'), 'anna')
    await userEvent.type(screen.getByLabelText('Password'), 'Pw-12345')
    await userEvent.type(screen.getByLabelText('Repeat password'), 'Pw-12345')
    await userEvent.click(screen.getByRole('button', { name: 'Create and open' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the account on this phone.')
    expect(screen.queryByText('Symptoms screen')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create and open' })).toBeEnabled()
  })
})

describe('LockGate on later runs', () => {
  it('asks to unlock, with no repeat-password field, and hides the app', async () => {
    setup(await storeWith('anna', 'pw'))
    expect(await screen.findByRole('button', { name: 'Unlock' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Repeat password')).not.toBeInTheDocument()
    expect(screen.queryByText('Symptoms screen')).not.toBeInTheDocument()
  })

  it('opens the app with the correct credentials', async () => {
    setup(await storeWith('anna', 'pw'))
    await userEvent.type(await screen.findByLabelText('Username'), 'anna')
    await userEvent.type(screen.getByLabelText('Password'), 'pw')
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(await screen.findByText('Symptoms screen')).toBeInTheDocument()
  })

  it('shows an error and keeps the app hidden with a wrong password', async () => {
    setup(await storeWith('anna', 'pw'))
    await userEvent.type(await screen.findByLabelText('Username'), 'anna')
    await userEvent.type(screen.getByLabelText('Password'), 'nope')
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong username or password.')
    expect(screen.queryByText('Symptoms screen')).not.toBeInTheDocument()
  })

  it('shows the same error for a wrong username', async () => {
    setup(await storeWith('anna', 'pw'))
    await userEvent.type(await screen.findByLabelText('Username'), 'bob')
    await userEvent.type(screen.getByLabelText('Password'), 'pw')
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong username or password.')
    expect(screen.queryByText('Symptoms screen')).not.toBeInTheDocument()
  })

  it('clears the password field after a wrong attempt', async () => {
    setup(await storeWith('anna', 'pw'))
    await userEvent.type(await screen.findByLabelText('Username'), 'anna')
    await userEvent.type(screen.getByLabelText('Password'), 'nope')
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    await screen.findByRole('alert')
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  it('shows the lock screen again after lock(), and does not keep the old password', async () => {
    setup(await storeWith('anna', 'pw'))
    await userEvent.type(await screen.findByLabelText('Username'), 'anna')
    await userEvent.type(screen.getByLabelText('Password'), 'pw')
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Lock now' }))
    expect(await screen.findByRole('button', { name: 'Unlock' })).toBeInTheDocument()
    expect(screen.queryByText('Symptoms screen')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })
})
