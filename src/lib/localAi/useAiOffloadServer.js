import { useEffect, useRef } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import {
  LOCAL_AI_ENABLED,
  LOCAL_AI_FEATURE
} from '@pear-notes/core/store/services/localAiCatalog.js'
import { isIndexable } from '@pear-notes/core/store/services/localAiIndex.js'
import {
  createAiOffloadRunner,
  serveAiOffload
} from '@pear-notes/core/store/services/localAiOffload.js'
import { retrieveVaultSources } from '@pear-notes/core/store/services/localAiVaultAsk.js'
import {
  getLocalAiConfig,
  getLocalAiFeatureConfig,
  selectIsLocalAiFeatureReady,
  setLocalAiOffloadServing
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

import {
  askAboutNote,
  askVault,
  embedTexts,
  isOnBatteryPower,
  runNoteTask
} from './electronAdapter'

const FEATURE = LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS
const LOW_BATTERY_LEVEL = 0.3
const LAST_USE_KEY = 'pear-notes:ai-offload-last-use'

const readLastUse = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LAST_USE_KEY) || 'null')
    return parsed && typeof parsed.lastAt === 'number'
      ? { lastAt: parsed.lastAt, lastDevice: String(parsed.lastDevice ?? '') }
      : null
  } catch {
    return null
  }
}

const writeLastUse = (lastDevice, lastAt) => {
  try {
    window.localStorage.setItem(LAST_USE_KEY, JSON.stringify({ lastDevice, lastAt }))
  } catch {
    return
  }
}

async function substringKeys(query, folderKey = ALL_NOTES_KEY) {
  const response = await backendApi.searchNotes({ query, folderKey })
  return (response?.results ?? []).map((result) => result.key)
}

export function useAiOffloadServer() {
  const store = useStore()
  const dispatch = useDispatch()
  const serve = useSelector((state) => getLocalAiConfig(state)?.offload?.serve === true)
  const ready = useSelector((state) => selectIsLocalAiFeatureReady(state, FEATURE))
  const server = useRef(null)

  useEffect(() => {
    if (!LOCAL_AI_ENABLED || !serve) return
    const lastUse = readLastUse()
    if (lastUse) dispatch(setLocalAiOffloadServing(lastUse))
    const noteOf = (key) => getNotesData(store.getState())?.[key]
    const runJob = createAiOffloadRunner({
      askVault,
      askAboutNote,
      runNoteTask,
      retrieveVaultSources: (question, turns, folderKey) =>
        retrieveVaultSources({
          api: backendApi,
          embed: embedTexts,
          question,
          turns,
          searchSubstring: (keyword) => substringKeys(keyword, folderKey || ALL_NOTES_KEY),
          isAllowed: (key) =>
            isIndexable(noteOf(key)) && (!folderKey || noteOf(key)?.folderKey === folderKey),
          scoped: !!folderKey,
          titleOf: (key) => noteOf(key)?.title ?? '',
          updatedAtOf: (key) => noteOf(key)?.updatedAt ?? 0
        }),
      getFeatureConfig: () => getLocalAiFeatureConfig(store.getState(), FEATURE)
    })
    const handle = serveAiOffload({
      runJob,
      onActivity: (activity) => {
        dispatch(setLocalAiOffloadServing(activity))
        if (activity.lastAt) writeLastUse(activity.lastDevice ?? '', activity.lastAt)
      },
      canServe: async () => {
        if (!selectIsLocalAiFeatureReady(store.getState(), FEATURE)) return 'not-serving'
        if (!(await isOnBatteryPower())) return null
        const battery = await navigator.getBattery?.().catch(() => null)
        return battery && !battery.charging && battery.level < LOW_BATTERY_LEVEL
          ? 'on-battery'
          : null
      }
    })
    server.current = handle
    return () => {
      server.current = null
      handle.stop()
      dispatch(setLocalAiOffloadServing({ active: false, activeDevice: '' }))
    }
  }, [dispatch, serve, store])

  useEffect(() => {
    server.current?.refresh()
  }, [ready])
}
