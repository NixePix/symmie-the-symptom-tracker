import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fireEvent } from '@testing-library/react'
import { Sheet } from './Sheet'

describe('Sheet', () => {
  it('renders nothing while closed', () => {
    render(
      <Sheet open={false} title="Add symptom" onClose={() => {}}>
        <p>Body</p>
      </Sheet>,
    )
    expect(screen.queryByText('Body')).not.toBeInTheDocument()
  })

  it('shows a dialog named by its title, with its children, while open', () => {
    render(
      <Sheet open title="Add symptom" onClose={() => {}}>
        <p>Body</p>
      </Sheet>,
    )
    expect(screen.getByRole('dialog', { name: 'Add symptom' })).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
  })

  it('calls onClose from the Close button', async () => {
    const onClose = vi.fn()
    render(
      <Sheet open title="Add symptom" onClose={onClose}>
        <p>Body</p>
      </Sheet>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the browser cancels the dialog (Escape)', () => {
    const onClose = vi.fn()
    render(
      <Sheet open title="Add symptom" onClose={onClose}>
        <p>Body</p>
      </Sheet>,
    )
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when the content is tapped', async () => {
    const onClose = vi.fn()
    render(
      <Sheet open title="Add symptom" onClose={onClose}>
        <p>Body</p>
      </Sheet>,
    )
    await userEvent.click(screen.getByText('Body'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
