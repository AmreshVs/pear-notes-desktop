import { useSyncExternalStore } from 'react'

const CLOSED = { mode: null, purpose: 'unlock', message: '', unavailable: false }

let state = CLOSED
let resolver = null
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function open(next) {
  return new Promise((resolve) => {
    if (resolver) resolver(false)
    resolver = resolve
    state = { ...CLOSED, ...next }
    emit()
  })
}

export function requestNoteLockPassword(purpose = 'unlock', message = '') {
  return open({ mode: 'enter', purpose, message })
}

export function requestNoteLockPasswordCreate(purpose = 'set') {
  return open({ mode: 'create', purpose })
}

export function resolveNoteLockPassword(ok) {
  state = CLOSED
  emit()
  const done = resolver
  resolver = null
  if (done) done(ok)
}

export function showLockUnavailable() {
  state = { ...state, unavailable: true }
  emit()
}

export function hideLockUnavailable() {
  state = { ...state, unavailable: false }
  emit()
}

export function useNoteLockPasswordRequest() {
  return useSyncExternalStore(subscribe, () => state)
}
