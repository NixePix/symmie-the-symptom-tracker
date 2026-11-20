import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chip } from './Chip'

describe('Chip', () => {
  it('is a button whose aria-pressed follows `selected`', () => {
    const { rerender } = render(<Chip selected={false}>Fatigue</Chip>)
    expect(screen.getByRole('button', { name: 'Fatigue' })).toHaveAttribute('aria-pressed', 'false')
    rerender(<Chip selected>Fatigue</Chip>)
    expect(screen.getByRole('button', { name: 'Fatigue' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onClick when tapped', async () => {
    const onClick = vi.fn()
    render(<Chip selected={false} onClick={onClick}>Fatigue</Chip>)
    await userEvent.click(screen.getByRole('button', { name: 'Fatigue' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not submit a surrounding form', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Chip selected={false}>Fatigue</Chip>
      </form>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Fatigue' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
