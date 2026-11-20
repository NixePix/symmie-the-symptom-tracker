import config from '../../vite.config'

describe('vite build location', () => {
  it('builds the app for /app/, so asset URLs, sw.js and its scope are all under /app/', () => {
    expect(config.base).toBe('/app/')
  })

  it('writes into dist/app and empties only that folder, so files placed in dist/ beside it (the landing page) are not deleted', () => {
    expect(config.build?.outDir).toBe('dist/app')
    expect(config.build?.emptyOutDir).toBe(true)
  })
})
