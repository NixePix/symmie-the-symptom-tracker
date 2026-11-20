import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('shows its children', () => {
    render(<Card>Inside</Card>)
    expect(screen.getByText('Inside')).toBeInTheDocument()
  })

  it('is a labelled region when given a title, and the title is its heading', () => {
    render(<Card title="Symptoms">Inside</Card>)
    const region = screen.getByRole('region', { name: 'Symptoms' })
    expect(region).toHaveTextContent('Inside')
    expect(screen.getByRole('heading', { level: 3, name: 'Symptoms' })).toBeInTheDocument()
  })

  it('is not a region without a title', () => {
    render(<Card>Inside</Card>)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })
})
