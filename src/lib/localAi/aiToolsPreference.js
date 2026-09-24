import { useEffect, useSyncExternalStore } from 'react'

import { backendApi } from '@pear-notes/core/backend/api.js'

export const SHOW_AI_TOOLS_KEY = 'showAiTools'

let showAiTools = true
let loaded = false
let pending = null
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function loadShowAiTools() {
  if (loaded) return Promise.resolve(showAiTools)
  if (!pending) {
    pending = backendApi
      .getPreference({ key: SHOW_AI_TOOLS_KEY })
      .then((value) => {
        showAiTools = value !== 'false'
        loaded = true
        emit()
      })
      .catch(() => {})
      .then(() => {
        pending = null
        return showAiTools
      })
  }
  return pending
}

export async function setShowAiTools(enabled) {
  showAiTools = enabled === true
  loaded = true
  emit()
  try {
    await backendApi.updatePreference({ key: SHOW_AI_TOOLS_KEY, value: showAiTools ? 'true' : 'false' })
  } catch (e) {
    console.error('setShowAiTools failed', e)
  }
}

export function useShowAiTools() {
  const value = useSyncExternalStore(subscribe, () => showAiTools)
  useEffect(() => {
    loadShowAiTools()
  }, [])
  return value
}
