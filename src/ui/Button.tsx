import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
}

/** Full-width pill button. `type` defaults to "button" so it never submits a form by accident. */
export function Button({ variant = 'primary', type = 'button', className, ...rest }: ButtonProps) {
  return <button type={type} className={[styles.btn, styles[variant], className].filter(Boolean).join(' ')} {...rest} />
}
