import { registerServiceWorker } from './registerServiceWorker'

describe('registerServiceWorker', () => {
  afterEach(() => {
    delete (navigator as { serviceWorker?: unknown }).serviceWorker
  })

  it('registers once when the browser supports service workers', () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
    const register = vi.fn()
    registerServiceWorker(register)
    expect(register).toHaveBeenCalledTimes(1)
  })

  it('does nothing when the browser has no service workers (jsdom, or a private window that blocks them)', () => {
    const register = vi.fn()
    registerServiceWorker(register)
    expect(register).not.toHaveBeenCalled()
  })

  it('registers without a reload callback, so an update never replaces the page the user is typing in', () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
    const register = vi.fn()
    registerServiceWorker(register)
    expect(register.mock.calls[0][0] ?? {}).not.toHaveProperty('onNeedRefresh')
  })
})
