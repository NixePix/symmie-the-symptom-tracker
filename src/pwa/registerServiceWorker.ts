/**
 * Registers the service worker that `vite-plugin-pwa` generates, so the app opens offline after the first
 * load. `register` is `registerSW` from `virtual:pwa-register`, passed in by `main.tsx` because that module
 * exists only inside a Vite build. It is called without `onNeedRefresh`: an updated worker is installed in
 * the background and takes over the next time the app is started, never while the user is mid-entry.
 */
export function registerServiceWorker(register: (options?: { immediate?: boolean }) => unknown): void {
  if (!('serviceWorker' in navigator)) return
  register({ immediate: true })
}
