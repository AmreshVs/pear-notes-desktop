import { useSyncExternalStore } from 'react'

let currentRequest = null
let requestCounter = 0
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return currentRequest
}

export function requestLocalAiSheet({
  mode,
  url = null,
  fileName = null,
  kind = null,
  insertAt = null,
  attachmentUrl = null,
  paragraphs = null,
  scope = 'note',
  selection = null
}) {
  requestCounter += 1
  currentRequest = {
    id: requestCounter,
    mode,
    url,
    fileName,
    kind,
    insertAt,
    attachmentUrl,
    paragraphs,
    scope,
    selection
  }
  emit()
}

export function clearLocalAiSheetRequest() {
  currentRequest = null
  emit()
}

export function useLocalAiSheetRequest() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
