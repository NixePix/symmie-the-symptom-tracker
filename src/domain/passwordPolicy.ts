/**
 * The rules a password must meet when it is chosen. Applied on setup only; unlock
 * compares against the stored hash and never calls this, so an older, weaker password
 * still unlocks.
 *
 * - Length counts code points (`[...password]`), so an emoji is one character, not two.
 * - A symbol is any character that is not a letter or digit (`\p{L}`, `\p{N}`); a space counts.
 * - Case is decided per character by comparing it with `toUpperCase()` / `toLowerCase()`, so
 *   "Ä" and "é" count. A letter with no case (CJK, for example) is neither upper nor lower.
 */
export interface PasswordRule {
  id: 'length' | 'symbol' | 'case'
  /** Shown on the setup screen before submit, and again in the rejection message. */
  text: string
  met: (password: string) => boolean
}

export const MIN_PASSWORD_LENGTH = 8

export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: 'length', text: `At least ${MIN_PASSWORD_LENGTH} characters`, met: (p) => [...p].length >= MIN_PASSWORD_LENGTH },
  { id: 'symbol', text: 'At least one symbol (not a letter or digit)', met: (p) => /[^\p{L}\p{N}]/u.test(p) },
  {
    id: 'case',
    text: 'Both an upper-case and a lower-case letter',
    met: (p) => {
      const chars = [...p]
      return chars.some((c) => c !== c.toLowerCase()) && chars.some((c) => c !== c.toUpperCase())
    },
  },
]

/** The rules `password` breaks, in display order; empty when it is acceptable. */
export function brokenPasswordRules(password: string): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !rule.met(password))
}
