import { render, screen } from '@testing-library/react'
import { ClockProvider, useNow } from './ClockProvider'

function Probe() {
  return <p>{useNow().getFullYear()}</p>
}

describe('ClockProvider', () => {
  it('gives components the time its `now` returns', () => {
    render(
      <ClockProvider now={() => new Date(2031, 4, 5)}>
        <Probe />
      </ClockProvider>,
    )
    expect(screen.getByText('2031')).toBeInTheDocument()
  })
})
