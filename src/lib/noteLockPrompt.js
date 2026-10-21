import { useSyncExternalStore } from 'react'

let current = null
let resolver = null
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function showNoteLockPrompt(kind) {
  return new Promise((resolve) => {
    if (resolver) resolver(false)
    resolver = resolve
    current = kind
    emit()
  })
}

export function resolveNoteLockPrompt(accepted) {
  current = null
  emit()
  const done = resolver
  resolver = null
  if (done) done(accepted)
}

export function useNoteLockPrompt() {
  return useSyncExternalStore(subscribe, () => current)
}
