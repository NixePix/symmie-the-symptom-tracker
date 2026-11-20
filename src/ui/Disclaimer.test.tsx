import { render, screen } from '@testing-library/react'
import { Disclaimer } from './Disclaimer'

describe('Disclaimer', () => {
  it('shows its text as a note, so a screen reader announces it as supporting information', () => {
    render(<Disclaimer>Not medical advice.</Disclaimer>)
    expect(screen.getByRole('note')).toHaveTextContent('Not medical advice.')
  })

  it('can be given its own name', () => {
    render(<Disclaimer label="Medical disclaimer">Text</Disclaimer>)
    expect(screen.getByRole('note', { name: 'Medical disclaimer' })).toBeInTheDocument()
  })
})
