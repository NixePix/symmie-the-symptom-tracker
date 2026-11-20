const REVOKE_DELAY_MS = 1000

/**
 * Saves `content` as a file named `filename` on the user's device: a blob URL on a temporary link that
 * is clicked, so it works from a PWA without a server. The text is encoded as UTF-8, and a leading
 * U+FEFF is kept as the three byte order mark bytes.
 */
export function downloadFile(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Safari and Firefox read the blob after click() returns; revoking at once can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}
