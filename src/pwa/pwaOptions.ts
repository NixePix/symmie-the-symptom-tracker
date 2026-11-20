/**
 * Settings for `vite-plugin-pwa`, kept out of `vite.config.ts` so a test can assert them. The manifest is
 * what makes Chrome on Android offer "Install"; the Workbox options are what make the installed app open
 * with no network and update without interrupting the user (design §1, §7).
 */
import type { VitePWAOptions } from 'vite-plugin-pwa'

const COLOUR = '#0d0a1c'

export const pwaOptions: Partial<VitePWAOptions> = {
  // 'prompt' with no `onNeedRefresh` handler (see `registerServiceWorker`): a new service worker is
  // downloaded in the background and waits until every window of the app is closed, so it takes over on a
  // later start and never in the middle of an entry. 'autoUpdate' would skip waiting and reload the page.
  registerType: 'prompt',
  injectRegister: false,
  manifest: {
    name: 'Symmie',
    short_name: 'Symmie',
    description: 'A private symptom diary that works offline.',
    id: '/app/',
    start_url: '/app/',
    scope: '/app/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: COLOUR,
    background_color: COLOUR,
    icons: [
      { src: '/app/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/app/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/app/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{html,js,css,png,svg,webmanifest}'],
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
    skipWaiting: false,
    clientsClaim: false,
  },
}
