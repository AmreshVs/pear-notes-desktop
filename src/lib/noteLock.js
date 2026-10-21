import { useEffect, useState, useSyncExternalStore } from 'react'

import { backendApi } from '@pear-notes/core/backend/api.js'
import * as log from '@pear-notes/core/log.js'
import { clearEditor, getEditorBaseKey } from '@pear-notes/core/store/slices/editorSlice.js'
import { getNotesData, setNotesDataBatch } from '@pear-notes/core/store/slices/notesSlice.js'
import { store } from '@pear-notes/core/store/store.js'

const PENDING_SAVE_GRACE_MS = 600

const listeners = new Set()
let sessionUnlocked = false
let generation = 0
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

function purgeSealedBodies() {
  const notes = getNotesData(store.getState()) || {}
  const batch = Object.entries(notes)
    .filter(([, note]) => note?.sealed && !note.bodyOmitted)
    .map(([key, note]) => ({ key, data: { ...note, note: '', summary: null, bodyOmitted: true } }))
  if (batch.length === 0) return
  store.dispatch(setNotesDataBatch(batch))
  const baseKey = getEditorBaseKey(store.getState())
  if (batch.some(({ key }) => key === baseKey)) store.dispatch(clearEditor())
}

export function isNoteSessionUnlocked() {
  return sessionUnlocked
}

export function isNoteUnlocked(key) {
  return !!key && sessionUnlocked
}

export function markNoteUnlocked(key) {
  if (key === '' || sessionUnlocked) return
  sessionUnlocked = true
  generation++
  emit()
}

export function clearUnlockedNotes({ afterPendingSaves = false } = {}) {
  const closing = generation
  const close = () => {
    if (closing !== generation) return
    backendApi.closeLockSession().catch((e) => log.error('closeLockSession', e))
    purgeSealedBodies()
  }
  if (afterPendingSaves) setTimeout(close, PENDING_SAVE_GRACE_MS)
  else close()
  if (!sessionUnlocked) return
  sessionUnlocked = false
  emit()
}

export function useNoteLockVersion() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function useHasUnlockedNotes() {
  useSyncExternalStore(subscribe, getSnapshot)
  return sessionUnlocked
}

export function useNeedsOtherLockPassword(key, note) {
  useSyncExternalStore(subscribe, getSnapshot)
  const candidate = isNoteUnlocked(key) && !!note?.sealed && !!note?.bodyOmitted
  const [checked, setChecked] = useState({ key: null, needed: false })

  useEffect(() => {
    if (!candidate || !key) return
    let active = true
    backendApi
      .getSingleNote({ key })
      .then((response) => {
        const needed = !!response?.data?.sealed && !!response.data.bodyOmitted
        if (active) setChecked({ key, needed })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [candidate, key])

  return candidate && checked.key === key && checked.needed
}
