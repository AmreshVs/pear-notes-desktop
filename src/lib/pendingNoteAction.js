let pending = null
const listeners = new Set()

const notify = () => listeners.forEach((listener) => listener())

export function requestNoteAction(key, action) {
  pending = { key, action }
  notify()
}

export function clearPendingNoteAction() {
  if (!pending) return
  pending = null
  notify()
}

export const getPendingNoteAction = () => pending

export function subscribePendingNoteAction(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
