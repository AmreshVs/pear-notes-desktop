export function formatBytes(bytes) {
  if (!bytes || bytes < 1) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}

export function groupTransfersByNote(items, noteTitles, untitledLabel) {
  const order = []
  const byNote = new Map()
  for (const item of items) {
    if (!byNote.has(item.noteKey)) {
      byNote.set(item.noteKey, [])
      order.push(item.noteKey)
    }
    byNote.get(item.noteKey).push(item)
  }
  return order.map((noteKey) => ({
    noteKey,
    title: noteTitles[noteKey] || untitledLabel,
    items: byNote.get(noteKey)
  }))
}

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatRelativeDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    return `Today at ${timeStr}`
  } else if (days === 1) {
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    return `Yesterday at ${timeStr}`
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
}
