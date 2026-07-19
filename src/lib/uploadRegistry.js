import { useSyncExternalStore } from 'react'

const EMPTY_QUEUE = {
  items: [],
  activeItem: null,
  completedCount: 0,
  totalCount: 0,
  isActive: false
}

let items = []
let snapshot = EMPTY_QUEUE
const cancelledIds = new Set()
const listeners = new Set()

let sequence = 0
export function nextUploadItemId() {
  sequence += 1
  return `upload-${Date.now()}-${sequence}`
}

function rebuild() {
  if (items.length === 0) {
    snapshot = EMPTY_QUEUE
    return
  }
  snapshot = {
    items,
    activeItem: items.find((item) => item.status === 'uploading') || null,
    completedCount: items.filter((item) => item.status === 'done').length,
    totalCount: items.filter((item) => item.status !== 'cancelled').length,
    isActive: items.some((item) => item.status === 'queued' || item.status === 'uploading')
  }
}

function emit() {
  rebuild()
  listeners.forEach((listener) => listener())
}

function patchItem(itemId, patch) {
  const index = items.findIndex((item) => item.id === itemId)
  if (index === -1) return
  const next = items.slice()
  next[index] = { ...next[index], ...patch }
  items = next
  emit()
}

export function enqueueUploads(entries) {
  if (!entries.length) return
  items = [
    ...items,
    ...entries.map((entry) => ({
      id: entry.id,
      fileName: entry.fileName,
      progress: 0,
      status: 'queued'
    }))
  ]
  emit()
}

export function beginUploadItem(itemId, cancel) {
  patchItem(itemId, { status: 'uploading', cancel })
}

export function updateUploadItemProgress(itemId, progress) {
  const current = items.find((item) => item.id === itemId)
  if (!current || current.progress === progress) return
  patchItem(itemId, { progress })
}

export function completeUploadItem(itemId) {
  patchItem(itemId, { status: 'done', progress: 100, cancel: undefined })
}

export function cancelUploadItem(itemId) {
  const target = items.find((item) => item.id === itemId)
  if (!target || target.status === 'done' || target.status === 'cancelled') return
  cancelledIds.add(itemId)
  if (target.cancel) target.cancel()
  patchItem(itemId, { status: 'cancelled', cancel: undefined })
}

export function cancelAllUploads() {
  items
    .filter((item) => item.status === 'queued' || item.status === 'uploading')
    .forEach((item) => cancelUploadItem(item.id))
}

export function isUploadCancelled(itemId) {
  return cancelledIds.has(itemId)
}

export function clearUploadQueue() {
  if (items.some((item) => item.status === 'queued' || item.status === 'uploading')) return
  items.forEach((item) => cancelledIds.delete(item.id))
  items = []
  emit()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return snapshot
}

export function useUploadQueue() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
