import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetupForm } from './SetupForm'
import { SessionProvider } from '../../state/SessionProvider'
import { memoryCredentialStore } from '../../data/memoryCredentialStore'

function setup() {
  const store = memoryCredentialStore()
  render(
    <SessionProvider store={store} iterations={1000}>
      <SetupForm />
    </SessionProvider>,
  )
  return store
}

async function fill(user: ReturnType<typeof userEvent.setup>, password: string, repeat = password) {
  await user.type(await screen.findByLabelText('Username'), 'anna')
  await user.type(screen.getByLabelText('Password'), password)
  await user.type(screen.getByLabelText('Repeat password'), repeat)
  await user.click(screen.getByRole('button', { name: 'Create and open' }))
}

describe('SetupForm password policy', () => {
  it('shows the three rules before anything is submitted', async () => {
    setup()
    const list = await screen.findByRole('list', { name: 'Password rules' })
    const items = within(list).getAllByRole('listitem').map((li) => li.textContent)
    expect(items).toEqual([
      'At least 8 characters',
      'At least one symbol (not a letter or digit)',
      'Both an upper-case and a lower-case letter',
    ])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('rejects a short password and names the length rule only', async () => {
    const store = setup()
    await fill(userEvent.setup(), 'Ab!')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('At least 8 characters')
    expect(alert).not.toHaveTextContent('symbol')
    expect(alert).not.toHaveTextContent('upper-case')
    expect(await store.load()).toBeNull()
  })

  it('rejects a password with no symbol', async () => {
    const store = setup()
    await fill(userEvent.setup(), 'Abcdefg1')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('At least one symbol')
    expect(alert).not.toHaveTextContent('8 characters')
    expect(await store.load()).toBeNull()
  })

  it('rejects a password without both cases', async () => {
    const store = setup()
    await fill(userEvent.setup(), 'abcdef1!')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('upper-case and a lower-case')
    expect(alert).not.toHaveTextContent('symbol')
    expect(await store.load()).toBeNull()
  })

  it('names every broken rule when several are broken', async () => {
    setup()
    await fill(userEvent.setup(), 'abc')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('At least 8 characters')
    expect(alert).toHaveTextContent('At least one symbol')
    expect(alert).toHaveTextContent('upper-case and a lower-case')
  })

  it('accepts a password that meets all three rules', async () => {
    const store = setup()
    await fill(userEvent.setup(), 'Abcdef1!')
    await vi.waitFor(async () => expect((await store.load())?.username).toBe('anna'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('still reports a mismatch when the password meets the rules', async () => {
    const store = setup()
    await fill(userEvent.setup(), 'Abcdef1!', 'Abcdef1?')
    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match.')
    expect(await store.load()).toBeNull()
  })
})
