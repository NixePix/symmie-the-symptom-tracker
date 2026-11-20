import { useState, type FormEvent } from 'react'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { useSession } from '../../state/SessionProvider'
import styles from './LockScreen.module.css'

export function UnlockForm() {
  const { unlock } = useSession()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const ok = await unlock(username, password)
    if (!ok) {
      setError('Wrong username or password.')
      setPassword('')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <Field label="Username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && (
        <div role="alert" className={styles.error}>
          {error}
        </div>
      )}
      <Button type="submit" disabled={busy}>
        Unlock
      </Button>
    </form>
  )
}
