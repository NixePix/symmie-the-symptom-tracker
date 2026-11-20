import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallButton } from './InstallButton'

/** What Chrome fires: an Event with `prompt()` and a `userChoice` promise. */
function installEvent() {
  const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: ReturnType<typeof vi.fn>
    userChoice: Promise<{ outcome: string }>
  }
  e.prompt = vi.fn().mockResolvedValue(undefined)
  e.userChoice = Promise.resolve({ outcome: 'accepted' })
  return e
}

function setStandalone(on: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: on && q === '(display-mode: standalone)',
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

const fire = (e: Event) => act(() => void window.dispatchEvent(e))

describe('InstallButton', () => {
  beforeEach(() => setStandalone(false))

  it('shows no button in a browser that fires no beforeinstallprompt', () => {
    render(<InstallButton />)
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument()
  })

  it('shows "Install app" once the browser fires beforeinstallprompt, and tapping it calls that event\'s prompt()', async () => {
    render(<InstallButton />)
    const e = installEvent()
    fire(e)
    await userEvent.click(screen.getByRole('button', { name: 'Install app' }))
    expect(e.prompt).toHaveBeenCalledTimes(1)
    expect(e.defaultPrevented).toBe(true)
  })

  it('hides the button after the prompt was answered, since the event can be used once', async () => {
    render(<InstallButton />)
    fire(installEvent())
    await userEvent.click(screen.getByRole('button', { name: 'Install app' }))
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument()
  })

  it('hides the button on appinstalled', () => {
    render(<InstallButton />)
    fire(installEvent())
    expect(screen.getByRole('button', { name: 'Install app' })).toBeInTheDocument()
    fire(new Event('appinstalled'))
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument()
  })

  it('shows no button when the app runs standalone, even if the event fires', () => {
    setStandalone(true)
    render(<InstallButton />)
    fire(installEvent())
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument()
  })
})
