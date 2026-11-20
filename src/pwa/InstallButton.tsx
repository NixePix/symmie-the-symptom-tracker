import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import styles from './InstallButton.module.css'

/** The part of Chrome's `beforeinstallprompt` event that TypeScript's DOM types do not include. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
}

const STANDALONE = '(display-mode: standalone)'

/**
 * "Install app" button for the app at /app/. It renders only after the browser fires
 * `beforeinstallprompt` (Chrome on Android and some desktop browsers; iOS Safari and Firefox never fire it,
 * so they get no button) and not while the app runs installed (`display-mode: standalone`). Tapping it calls
 * `prompt()` on the saved event; the event can be used once, so the button goes away after that tap and on
 * `appinstalled`. The landing page at `/` has no such button because the event fires only for the page's own
 * scope (`/app/`).
 */
export function InstallButton() {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault() // stops Chrome's own mini-infobar; the button is the offer
      setEvent(e as InstallPromptEvent)
    }
    const onInstalled = () => setEvent(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const standalone = typeof window.matchMedia === 'function' && window.matchMedia(STANDALONE).matches
  if (!event || standalone) return null

  return (
    <div className={styles.wrap}>
      <Button
        onClick={() => {
          void event.prompt()
          setEvent(null)
        }}
      >
        Install app
      </Button>
    </div>
  )
}
