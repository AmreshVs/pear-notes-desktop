import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector, useStore } from 'react-redux'

import {
  LOCAL_AI_ENABLED,
  LOCAL_AI_FEATURE_STATUS
} from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  getLocalAiDevice,
  getLocalAiLoaded,
  selectLocalAiFeatureStatus
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { getNoteData, getSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { setShowSettings } from '@pear-notes/core/store/slices/uiSlice.js'

import { requestAiSettingsFocus } from '../lib/localAi/aiSettingsFocus'
import { useShowAiTools } from '../lib/localAi/aiToolsPreference'
import { showToast } from '../lib/toast'

const IN_PROGRESS_KEYS = {
  [LOCAL_AI_FEATURE_STATUS.DOWNLOADING]: 'downloading',
  [LOCAL_AI_FEATURE_STATUS.WAITING_NETWORK]: 'waitingNetwork',
  [LOCAL_AI_FEATURE_STATUS.PAUSED]: 'paused'
}

export function useAiToolsVisible() {
  const showAiTools = useShowAiTools()
  const selectedNoteKey = useSelector(getSelectedNote)
  const locked = useSelector((state) => getNoteData(selectedNoteKey)(state)?.locked === true)
  return LOCAL_AI_ENABLED && showAiTools && !locked
}

export function useAiFeatureGate() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const store = useStore()

  return useCallback(
    (feature) => {
      const state = store.getState()
      const loaded = getLocalAiLoaded(state)
      const status = loaded ? selectLocalAiFeatureStatus(state, feature) : null
      if (status === LOCAL_AI_FEATURE_STATUS.READY) return true

      const name = t(`settings.onDeviceAi.features.${feature}.title`)
      if (status === LOCAL_AI_FEATURE_STATUS.UNSUPPORTED) {
        const reason = getLocalAiDevice(state)?.reason ?? 'store-build'
        showToast(
          t(`settings.onDeviceAi.unsupportedReason.${reason}`, {
            requirement: t('settings.onDeviceAi.requirementMac')
          })
        )
        return false
      }
      if (status === LOCAL_AI_FEATURE_STATUS.NEEDS_MEMORY) {
        showToast(t('localAi.gate.needsMemory', { feature: name }))
        return false
      }

      showToast(t(`localAi.gate.${IN_PROGRESS_KEYS[status] ?? 'setup'}`, { feature: name }))
      requestAiSettingsFocus(feature)
      dispatch(setShowSettings('onDeviceAi'))
      return false
    },
    [dispatch, store, t]
  )
}
