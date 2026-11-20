/** SVG path helpers for the charts (design §5.4). Pure, so a test can assert a path string. */

/**
 * An SVG path through `points`, which `null` breaks: each run of values is its own `M … L …` subpath,
 * and a missing value is never drawn as 0. `x` and `y` map an index and a value to coordinates.
 */
export function linePath(points: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let pen = false
  let d = ''
  points.forEach((v, i) => {
    if (v === null) {
      pen = false
      return
    }
    d += `${d ? ' ' : ''}${pen ? 'L' : 'M'}${x(i)} ${y(v)}`
    pen = true
  })
  return d
}
