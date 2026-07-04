import { useSyncExternalStore } from 'react'
import { authenticate } from './deviceAuth'

const unlockedKeys = new Set()
const listeners = new Set()
let version = 0

function emit () {
  version++
  for (const listener of listeners) listener()
}

function subscribe (listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot () {
  return version
}

export function isNoteUnlocked (key) {
  return unlockedKeys.has(key)
}

export function relockNote (key) {
  if (unlockedKeys.delete(key)) emit()
}

export function markNoteUnlocked (key) {
  if (!key) return
  if (!unlockedKeys.has(key)) {
    unlockedKeys.add(key)
    emit()
  }
}

export async function unlockNote (key, reason = 'Unlock this note') {
  if (!key) return false
  if (unlockedKeys.has(key)) return true
  const ok = await authenticate(reason)
  if (ok) {
    unlockedKeys.add(key)
    emit()
  }
  return ok
}

export function useNoteLockVersion () {
  return useSyncExternalStore(subscribe, getSnapshot)
}
