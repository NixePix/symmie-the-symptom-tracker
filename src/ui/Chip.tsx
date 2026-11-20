import type { ButtonHTMLAttributes } from 'react'
import styles from './Chip.module.css'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean
}

/** A small toggle pill. `selected` is exposed as `aria-pressed`. `type` defaults to "button". */
export function Chip({ selected, type = 'button', className, ...rest }: ChipProps) {
  return <button type={type} aria-pressed={selected} className={[styles.chip, selected && styles.on, className].filter(Boolean).join(' ')} {...rest} />
}
