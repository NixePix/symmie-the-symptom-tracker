import { useState, type FormEvent } from 'react'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { useSession } from '../../state/SessionProvider'
import { PASSWORD_RULES, brokenPasswordRules } from '../../domain/passwordPolicy'
import styles from './LockScreen.module.css'

export function SetupForm() {
  const { createAccount } = useSession()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!username.trim() || !password) return setError('Enter a username and password.')
    const broken = brokenPasswordRules(password)
    if (broken.length) return setError(`Password rules not met: ${broken.map((r) => r.text).join('; ')}.`)
    if (password !== repeat) return setError('Passwords do not match.')
    setError('')
    setBusy(true)
    try {
      await createAccount(username, password)
    } catch {
      setError('Could not save the account on this phone.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <Field label="Username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <Field label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <ul aria-label="Password rules" className={styles.rules}>
        {PASSWORD_RULES.map((rule) => (
          <li key={rule.id}>{rule.text}</li>
        ))}
      </ul>
      <Field label="Repeat password" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
      {error && (
        <div role="alert" className={styles.error}>
          {error}
        </div>
      )}
      <Button type="submit" disabled={busy}>
        Create and open
      </Button>
    </form>
  )
}
