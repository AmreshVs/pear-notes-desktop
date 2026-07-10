import { useSyncExternalStore } from 'react'

let current = null
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

export function startUpload(entry) {
  current = entry
  emit()
}

export function updateUploadProgress(progress) {
  if (!current) return
  current = { ...current, progress }
  emit()
}

export function endUpload() {
  current = null
  emit()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return current
}

export function useCurrentUpload() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
