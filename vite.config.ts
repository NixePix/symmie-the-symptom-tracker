/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { pwaOptions } from './src/pwa/pwaOptions'
import { copyLanding } from './copyLanding'

export default defineConfig({
  // The app lives at /app/ so the site root can hold a landing page. The build writes to dist/app and
  // empties only that folder; the landing page is copied into dist/ beside it and must survive a rebuild.
  // copyLanding() puts landing/ into dist/ after each build.
  base: '/app/',
  build: { outDir: 'dist/app', emptyOutDir: true },
  plugins: [react(), VitePWA(pwaOptions), copyLanding()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // Process imported CSS so a test can see the rules a component loads.
    css: true,
  },
})
