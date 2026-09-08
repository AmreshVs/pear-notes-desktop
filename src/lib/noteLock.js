import { useSyncExternalStore } from 'react'

import { authenticate } from './deviceAuth'

const listeners = new Set()
let sessionUnlocked = false
let version = 0

function emit() {
  version++
  for (const listener of listeners) listener()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return version
}

export function isNoteUnlocked(key) {
  return !!key && sessionUnlocked
}

export function markNoteUnlocked(key) {
  if (!key || sessionUnlocked) return
  sessionUnlocked = true
  emit()
}

export function clearUnlockedNotes() {
  if (!sessionUnlocked) return
  sessionUnlocked = false
  emit()
}

export async function unlockNote(key, reason = 'Unlock this note') {
  if (!key) return false
  if (sessionUnlocked) return true
  const ok = await authenticate(reason)
  if (ok) {
    sessionUnlocked = true
    emit()
  }
  return ok
}

export function useNoteLockVersion() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function useHasUnlockedNotes() {
  useSyncExternalStore(subscribe, getSnapshot)
  return sessionUnlocked
}
