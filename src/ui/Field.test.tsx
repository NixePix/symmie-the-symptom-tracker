import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Field } from './Field'

describe('Field', () => {
  it('labels the input so it is found by its label text', () => {
    render(<Field label="Username" />)
    expect(screen.getByLabelText('Username')).toBeInstanceOf(HTMLInputElement)
  })

  it('passes input props through: type, value and typing reach onChange', async () => {
    const onChange = vi.fn()
    render(<Field label="Password" type="password" onChange={onChange} />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    await userEvent.type(input, 'ab')
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('shows an error as an alert tied to the input, and marks the input invalid', () => {
    render(<Field label="Username" error="Required" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
    const input = screen.getByLabelText('Username')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Required')
  })

  it('shows no alert and no aria-invalid without an error', () => {
    render(<Field label="Username" />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Username')).not.toHaveAttribute('aria-invalid')
  })

  it('gives two fields different ids', () => {
    render(
      <>
        <Field label="A" />
        <Field label="B" />
      </>,
    )
    expect(screen.getByLabelText('A').id).not.toBe(screen.getByLabelText('B').id)
  })
})
