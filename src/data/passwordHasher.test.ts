import { hashPassword, verifyPassword, PBKDF2_ITERATIONS } from './passwordHasher'

const FAST = 1000

describe('passwordHasher', () => {
  it('uses 600,000 iterations by default (design §1)', async () => {
    expect(PBKDF2_ITERATIONS).toBe(600_000)
    const spy = vi.spyOn(crypto.subtle, 'deriveBits')
    const h = await hashPassword('pw')
    expect(h.iterations).toBe(600_000)
    expect(spy.mock.calls[0][0]).toMatchObject({ name: 'PBKDF2', hash: 'SHA-256', iterations: 600_000 })
    spy.mockRestore()
  })

  it('does not contain the password in what it stores', async () => {
    const h = await hashPassword('hunter2-secret', FAST)
    expect(JSON.stringify(h)).not.toContain('hunter2-secret')
  })

  it('verifies the right password and rejects a wrong one', async () => {
    const h = await hashPassword('right', FAST)
    expect(await verifyPassword('right', h)).toBe(true)
    expect(await verifyPassword('wrong', h)).toBe(false)
  })

  it('uses a fresh random salt: the same password hashes differently twice', async () => {
    const a = await hashPassword('same', FAST)
    const b = await hashPassword('same', FAST)
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
  })

  it('verifies using the iteration count stored with the hash, not the current default', async () => {
    const h = await hashPassword('pw', 1234)
    expect(h.iterations).toBe(1234)
    expect(await verifyPassword('pw', h)).toBe(true)
    expect(await verifyPassword('pw', { ...h, iterations: 1235 })).toBe(false)
  })

  it('rejects the wrong password even when it is a prefix of the right one', async () => {
    const h = await hashPassword('abcdef', FAST)
    expect(await verifyPassword('abc', h)).toBe(false)
  })
})
