import { PASSWORD_RULES, brokenPasswordRules } from './passwordPolicy'

const broken = (pw: string) => brokenPasswordRules(pw).map((r) => r.id)

describe('brokenPasswordRules', () => {
  it('lists the three rules, in the order they are shown', () => {
    expect(PASSWORD_RULES.map((r) => r.id)).toEqual(['length', 'symbol', 'case'])
  })

  it('accepts a password that meets all three rules', () => {
    expect(broken('Abcdef1!')).toEqual([])
  })

  it('rejects 7 characters and accepts 8', () => {
    expect(broken('Abcde!f')).toEqual(['length'])
    expect(broken('Abcdef!g')).toEqual([])
  })

  it('counts a character outside the BMP as one', () => {
    expect(broken('Ab!😀😀😀😀😀')).toEqual([])
    expect(broken('Ab!😀😀😀😀')).toEqual(['length'])
  })

  it('requires a symbol: a digit or a letter is not one', () => {
    expect(broken('Abcdefg1')).toEqual(['symbol'])
    expect(broken('Abcdefgh')).toEqual(['symbol'])
  })

  it('counts a space and a non-ASCII punctuation mark as a symbol', () => {
    expect(broken('Abcd efg')).toEqual([])
    expect(broken('Abcdefg€')).toEqual([])
  })

  it('requires an upper-case letter', () => {
    expect(broken('abcdef1!')).toEqual(['case'])
  })

  it('requires a lower-case letter', () => {
    expect(broken('ABCDEF1!')).toEqual(['case'])
  })

  it('treats non-ASCII letters by case', () => {
    expect(broken('Ärger!!!')).toEqual([])
    expect(broken('éééé!!!É')).toEqual([])
    expect(broken('ÉÉÉÉ!!!!')).toEqual(['case'])
  })

  it('does not count a letter without case (e.g. CJK) as upper or lower', () => {
    expect(broken('日本語日本語!!')).toEqual(['case'])
  })

  it('reports every broken rule at once', () => {
    expect(broken('abc')).toEqual(['length', 'symbol', 'case'])
    expect(broken('')).toEqual(['length', 'symbol', 'case'])
  })
})
