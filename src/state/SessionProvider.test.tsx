import { useEffect } from 'react'
import { act, render, screen } from '@testing-library/react'
import { SessionProvider, useSession } from './SessionProvider'
import { memoryCredentialStore } from '../data/memoryCredentialStore'
import { hashPassword } from '../data/passwordHasher'
import type { CredentialStore } from '../data/CredentialStore'

const ITER = 1000
let session: ReturnType<typeof useSession>

function Probe() {
  const current = useSession()
  useEffect(() => {
    session = current
  })
  return <p>status: {current.status}</p>
}

function setup(store: CredentialStore) {
  return render(
    <SessionProvider store={store} iterations={ITER}>
      <Probe />
    </SessionProvider>,
  )
}

async function storeWith(username: string, password: string) {
  const store = memoryCredentialStore()
  await store.save({ username, ...(await hashPassword(password, ITER)) })
  return store
}

describe('SessionProvider', () => {
  it('is loading, then first-run when no account is stored', async () => {
    setup(memoryCredentialStore())
    expect(screen.getByText('status: loading')).toBeInTheDocument()
    expect(await screen.findByText('status: first-run')).toBeInTheDocument()
  })

  it('is locked when an account is stored', async () => {
    setup(await storeWith('anna', 'pw'))
    expect(await screen.findByText('status: locked')).toBeInTheDocument()
  })

  it('createAccount saves a hashed account and unlocks', async () => {
    const store = memoryCredentialStore()
    setup(store)
    await screen.findByText('status: first-run')
    await act(() => session.createAccount('anna', 'secret-pw'))
    expect(screen.getByText('status: unlocked')).toBeInTheDocument()
    const saved = await store.load()
    expect(saved?.username).toBe('anna')
    expect(saved?.iterations).toBe(ITER)
    expect(JSON.stringify(saved)).not.toContain('secret-pw')
  })

  it('unlock with the right credentials returns true and unlocks', async () => {
    setup(await storeWith('anna', 'pw'))
    await screen.findByText('status: locked')
    let ok: boolean | undefined
    await act(async () => {
      ok = await session.unlock('anna', 'pw')
    })
    expect(ok).toBe(true)
    expect(screen.getByText('status: unlocked')).toBeInTheDocument()
  })

  it.each([
    ['wrong password', 'anna', 'nope'],
    ['wrong username', 'bob', 'pw'],
  ])('unlock with a %s returns false and stays locked', async (_n, u, p) => {
    setup(await storeWith('anna', 'pw'))
    await screen.findByText('status: locked')
    let ok: boolean | undefined
    await act(async () => {
      ok = await session.unlock(u, p)
    })
    expect(ok).toBe(false)
    expect(screen.getByText('status: locked')).toBeInTheDocument()
  })

  it('ignores surrounding spaces in the username', async () => {
    setup(await storeWith('anna', 'pw'))
    await screen.findByText('status: locked')
    await act(() => session.unlock('  anna ', 'pw'))
    expect(screen.getByText('status: unlocked')).toBeInTheDocument()
  })

  it('lock() returns to locked', async () => {
    setup(await storeWith('anna', 'pw'))
    await screen.findByText('status: locked')
    await act(() => session.unlock('anna', 'pw'))
    act(() => session.lock())
    expect(screen.getByText('status: locked')).toBeInTheDocument()
  })

  it('closing the app locks it: a new provider on the same store starts locked', async () => {
    const store = await storeWith('anna', 'pw')
    const first = setup(store)
    await screen.findByText('status: locked')
    await act(() => session.unlock('anna', 'pw'))
    first.unmount()
    setup(store)
    expect(await screen.findByText('status: locked')).toBeInTheDocument()
  })

  it('sends nothing over the network while creating an account and unlocking', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const beacon = vi.fn(() => true)
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true })
    const xhr = vi.spyOn(XMLHttpRequest.prototype, 'send')
    const store = memoryCredentialStore()
    setup(store)
    await screen.findByText('status: first-run')
    await act(() => session.createAccount('anna', 'pw'))
    act(() => session.lock())
    await act(() => session.unlock('anna', 'pw'))
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhr).not.toHaveBeenCalled()
    expect(beacon).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
    xhr.mockRestore()
  })
})
