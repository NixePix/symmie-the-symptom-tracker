import { render, screen } from '@testing-library/react'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('shows the app name as the page heading', () => {
    render(<AppShell />)
    expect(screen.getByRole('heading', { level: 1, name: 'Symmie' })).toBeInTheDocument()
  })

  it('loads the design tokens: the :root rules define --bg and --accent', () => {
    render(<AppShell />)
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n')
    expect(css).toMatch(/--bg:\s*#0d0a1c/)
    expect(css).toMatch(/--accent:\s*#ff5d8f/)
  })
})
