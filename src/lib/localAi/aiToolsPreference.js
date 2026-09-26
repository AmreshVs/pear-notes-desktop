import { useEffect, useSyncExternalStore } from 'react'

import { backendApi } from '@pear-notes/core/backend/api.js'

function createBooleanPreference(key, defaultValue) {
  let value = defaultValue
  let loaded = false
  let pending = null
  const listeners = new Set()

  const emit = () => {
    for (const listener of listeners) listener()
  }

  const subscribe = (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const load = () => {
    if (loaded) return Promise.resolve(value)
    if (!pending) {
      pending = backendApi
        .getPreference({ key })
        .then((stored) => {
          value = stored === 'true' ? true : stored === 'false' ? false : defaultValue
          loaded = true
          emit()
        })
        .catch(() => {})
        .then(() => {
          pending = null
          return value
        })
    }
    return pending
  }

  const set = async (enabled) => {
    value = enabled === true
    loaded = true
    emit()
    try {
      await backendApi.updatePreference({ key, value: value ? 'true' : 'false' })
    } catch (e) {
      console.error(`set ${key} failed`, e)
    }
  }

  const useValue = () => {
    const current = useSyncExternalStore(subscribe, () => value)
    useEffect(() => {
      load()
    }, [])
    return current
  }

  return { set, useValue }
}

const showAiTools = createBooleanPreference('showAiTools', true)
const showAiToolsInLocked = createBooleanPreference('showAiToolsInLockedNotes', false)

export const setShowAiTools = showAiTools.set
export const useShowAiTools = showAiTools.useValue
export const setShowAiToolsInLocked = showAiToolsInLocked.set
export const useShowAiToolsInLocked = showAiToolsInLocked.useValue
