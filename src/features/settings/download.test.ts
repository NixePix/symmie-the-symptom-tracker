import { downloadFile } from './download'

describe('downloadFile', () => {
  const create = vi.fn<(blob: Blob) => string>(() => 'blob:fake')
  const revoke = vi.fn()
  let click: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    create.mockClear()
    revoke.mockClear()
    URL.createObjectURL = create
    URL.revokeObjectURL = revoke
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('clicks a link to a blob that has the filename', () => {
    downloadFile('a.csv', 'x', 'text/csv')
    const clicked = click.mock.contexts[0] as HTMLAnchorElement
    expect(click).toHaveBeenCalledTimes(1)
    expect(clicked.download).toBe('a.csv')
    expect(clicked.href).toBe('blob:fake')
    expect(create.mock.calls[0][0].type).toBe('text/csv;charset=utf-8')
    expect(document.body.querySelector('a')).toBeNull()
  })

  it('releases the blob url only after a delay, so Safari and Firefox can start reading it', () => {
    vi.useFakeTimers()
    downloadFile('a.csv', 'x', 'text/csv')
    expect(revoke).not.toHaveBeenCalled()
    vi.advanceTimersByTime(999)
    expect(revoke).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(revoke).toHaveBeenCalledWith('blob:fake')
  })

  it('encodes the text as UTF-8 and keeps a leading byte order mark', async () => {
    downloadFile('a.csv', '﻿ø', 'text/csv')
    const bytes = new Uint8Array(await create.mock.calls[0][0].arrayBuffer())
    expect([...bytes]).toEqual([0xef, 0xbb, 0xbf, 0xc3, 0xb8])
  })
})
