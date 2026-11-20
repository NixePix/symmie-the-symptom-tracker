import { cpSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

/**
 * Copies landing/ into dist/ (the site root) after the app build has written dist/app. The app build's
 * emptyOutDir empties only dist/app, so the copy is not deleted by a later rebuild of the app, and the
 * copy runs on every build because it is a plugin of the same build.
 */
export function copyLanding(): Plugin {
  let root = process.cwd()
  return {
    name: 'copy-landing',
    apply: 'build',
    configResolved(config) {
      root = config.root
    },
    closeBundle() {
      cpSync(resolve(root, 'landing'), resolve(root, 'dist'), { recursive: true })
    },
  }
}
