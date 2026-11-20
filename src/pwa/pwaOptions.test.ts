import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pwaOptions } from './pwaOptions'

const publicFile = (name: string) => resolve(__dirname, '../../public', name)
/** An icon `src` is a URL under /app/; the file sits in `public/` under the same name without that prefix. */
const iconFile = (src: string) => publicFile(src.replace(/^\/app\//, ''))

/** Width and height from a PNG's IHDR chunk (bytes 16–23). */
function pngSize(path: string) {
  const b = readFileSync(path)
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), signature: b.subarray(1, 4).toString() }
}

describe('web app manifest', () => {
  const manifest = pwaOptions.manifest as Exclude<typeof pwaOptions.manifest, false | undefined>

  it('opens full screen with its own name, under /app/, on the app background colour', () => {
    expect(manifest.name).toBe('Symmie')
    expect(manifest.short_name).toBe('Symmie')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/app/')
    expect(manifest.scope).toBe('/app/')
    expect(manifest.id).toBe('/app/')
    expect(manifest.theme_color).toBe('#0d0a1c')
    expect(manifest.background_color).toBe('#0d0a1c')
  })

  it('serves every icon from under /app/, the manifest scope', () => {
    for (const icon of manifest.icons ?? []) expect(icon.src.startsWith('/app/')).toBe(true)
  })

  it('lists a 192 and a 512 PNG icon, and a maskable one, that exist at those sizes', () => {
    const icons = manifest.icons ?? []
    for (const size of [192, 512]) {
      const icon = icons.find((i) => i.sizes === `${size}x${size}` && i.purpose !== 'maskable')
      expect(icon, `${size} icon`).toBeDefined()
      const path = iconFile(icon!.src)
      expect(existsSync(path)).toBe(true)
      expect(pngSize(path)).toEqual({ width: size, height: size, signature: 'PNG' })
    }
    expect(icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512' && existsSync(iconFile(i.src)))).toBe(true)
  })
})

describe('service worker options', () => {
  it('does not take over a running page: a new version waits until the app is closed and started again', () => {
    expect(pwaOptions.registerType).toBe('prompt')
    expect(pwaOptions.workbox?.skipWaiting).toBeFalsy()
    expect(pwaOptions.workbox?.clientsClaim).toBeFalsy()
  })

  it('precaches the page shell, scripts, styles and icons, so every screen opens in airplane mode', () => {
    const patterns = pwaOptions.workbox?.globPatterns ?? []
    for (const ext of ['html', 'js', 'css', 'png']) expect(patterns.join(' ')).toContain(ext)
  })

  it('answers every navigation with index.html', () => {
    // Workbox resolves this against the service worker's own URL, /app/sw.js, so it means /app/index.html.
    expect(pwaOptions.workbox?.navigateFallback).toBe('index.html')
  })
})
