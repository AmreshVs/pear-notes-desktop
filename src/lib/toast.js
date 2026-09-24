import { useSyncExternalStore } from 'react'

const TOAST_MS = 4500

let current = null
let timer = null
let nextId = 0
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function showToast(message) {
  clearTimeout(timer)
  nextId += 1
  current = { id: nextId, message }
  emit()
  timer = setTimeout(dismissToast, TOAST_MS)
}

export function dismissToast() {
  clearTimeout(timer)
  if (!current) return
  current = null
  emit()
}

export function useToast() {
  return useSyncExternalStore(subscribe, () => current)
}
