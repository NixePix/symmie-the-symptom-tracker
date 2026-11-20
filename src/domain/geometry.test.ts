import { linePath } from './geometry'

const x = (i: number) => i * 10
const y = (v: number) => 100 - v * 10

describe('linePath', () => {
  it('joins consecutive points with one move and then lines', () => {
    expect(linePath([1, 2, 3], x, y)).toBe('M0 90 L10 80 L20 70')
  })

  it('starts a new subpath after a null, so the line breaks instead of dropping to zero', () => {
    expect(linePath([1, null, 3, 4], x, y)).toBe('M0 90 M20 70 L30 60')
  })

  it('is empty when there is no value', () => {
    expect(linePath([null, null], x, y)).toBe('')
  })
})
