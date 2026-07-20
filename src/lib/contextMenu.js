export async function showContextMenu(items) {
  const bridge = typeof window !== 'undefined' ? window.electronBridge : null
  if (!bridge || typeof bridge.showContextMenu !== 'function') return null
  try {
    return await bridge.showContextMenu(items)
  } catch {
    return null
  }
}
