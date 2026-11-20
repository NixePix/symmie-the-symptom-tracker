import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './Sheet.module.css'

interface Props {
  open: boolean
  /** Names the dialog and is shown as its heading. */
  title: string
  onClose(): void
  children: ReactNode
}

/**
 * A bottom sheet on the native `<dialog>` (design §5.3), so focus trapping and Escape come from the
 * browser. Renders nothing while closed, so a form inside starts empty each time it opens. A tap on the
 * backdrop (the dialog element itself, outside its inner panel) closes it. jsdom has no `showModal`, so
 * there the `open` attribute is set instead.
 */
export function Sheet({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || dialog.open) return
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
  }, [open])

  if (!open) return null
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={styles.sheet}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
