// @vitest-environment node
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

describe('landing page source (landing/index.html)', () => {
  const html = read('landing/index.html')

  it('headline says what the app is for, and the demo symptom is phrased as a problem to track', () => {
    expect(html.match(/<h1>([^]*?)<\/h1>/)![1]).toBe('Get better by tracking what your body tells you.')
    expect(html).not.toContain('A bad day should take two seconds to write down.')
    expect(html).toContain("'Problems sleeping'")
    expect(html).not.toContain('Sleep quality')
  })

  it('has no external script, so no framework or service worker file is loaded', () => {
    expect(html).not.toMatch(/<script[^>]*\ssrc=/i)
  })

  it('does not register a service worker', () => {
    expect(html).not.toMatch(/serviceWorker/i)
    expect(html).not.toMatch(/rel=["']manifest["']/i)
  })

  it('has no prototype bar and no links to the other designs', () => {
    expect(html).not.toMatch(/proto-bar|b\.html|c\.html|a\.html|shared\.css/)
  })

  it('offers "Open the app" to /app/ and no Install or Get the app button', () => {
    const buttons = [...html.matchAll(/<a class="btn[^"]*"[^>]*>([^<]*)<\/a>/g)].map((m) => m[1])
    expect(buttons).toContain('Open the app')
    expect(buttons.join('|')).not.toMatch(/install|get the app/i)
    for (const m of html.matchAll(/<a class="btn[^"]*" href="([^"]*)">Open the app/g)) expect(m[1]).toBe('/app/')
  })

  it('names in the install steps the same button label the page shows, and links every button to /app/', () => {
    const buttons = [...html.matchAll(/<a class="btn[^"]*" href="([^"]*)">([^<]*?)(?: →)?<\/a>/g)].filter((m) => !m[1].startsWith('#'))
    const labels = new Set(buttons.map((m) => m[2]))
    expect(labels.size).toBe(1)
    expect(buttons.every((m) => m[1] === '/app/')).toBe(true)
    const step = html.match(/<li><h3>Open Symmie in Chrome<\/h3><p class="mute">([^]*?)<\/p>/)![1]
    expect(step).toContain(`<b>${[...labels][0]}</b>`)
  })

  it('step 2 points at the in-app Install app button, not at a Chrome bar that InstallButton suppresses', () => {
    const step = html.match(/<h3>Install it<\/h3><p class="mute">([^]*?)<\/p>/)![1]
    expect(step).toMatch(/<b>Install app<\/b>/)
    expect(step).toMatch(/menu ⋮ → <i>Install app<\/i>/)
    expect(step).not.toMatch(/at the bottom|offers to install/i)
  })

  it('never says the demo screen sits to the right of the text, so the copy holds at every width', () => {
    // The hero wraps: on a phone the demo drops below the text, so a "right" would point at nothing.
    expect(html).not.toMatch(/on the right/i)
  })
})

describe('build output', () => {
  it('writes the landing page to dist/index.html beside the app in dist/app/', () => {
    // A copy left by an earlier build would satisfy the assertions below even if this build stopped copying.
    rmSync(resolve(root, 'dist'), { recursive: true, force: true })
    execSync('npx vite build', { cwd: root, stdio: 'pipe' })
    expect(existsSync(resolve(root, 'dist/index.html'))).toBe(true)
    expect(existsSync(resolve(root, 'dist/landing.css'))).toBe(true)
    expect(existsSync(resolve(root, 'dist/app/index.html'))).toBe(true)
    expect(read('dist/index.html')).toBe(read('landing/index.html'))
    expect(read('dist/app/index.html')).toMatch(/\/app\/assets\//)
  }, 120_000)
})
