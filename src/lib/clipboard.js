async function writeViaBridge({ text, html }) {
  const bridge = typeof window !== 'undefined' ? window.electronBridge : null
  if (!bridge || typeof bridge.writeClipboard !== 'function') return false
  try {
    return (await bridge.writeClipboard({ text, html })) === true
  } catch {
    return false
  }
}

async function writeViaNavigator({ text, html }) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false
  try {
    if (html && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' })
        })
      ])
      return true
    }
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export async function copyToClipboard(text, html) {
  if (typeof text !== 'string') return false
  if (await writeViaBridge({ text, html })) return true
  if (html && (await writeViaNavigator({ text, html }))) return true
  return writeViaNavigator({ text })
}
