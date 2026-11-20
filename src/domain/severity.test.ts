import { severityColor } from './severity'

describe('severityColor', () => {
  it('runs from teal at 1 to red at 10', () => {
    expect(severityColor(1)).toBe('hsl(170 92% 56%)')
    expect(severityColor(10)).toBe('hsl(0 92% 56%)')
  })
  it('gives each of 1-10 a different colour', () => {
    const colours = new Set(Array.from({ length: 10 }, (_, i) => severityColor(i + 1)))
    expect(colours.size).toBe(10)
  })
})
