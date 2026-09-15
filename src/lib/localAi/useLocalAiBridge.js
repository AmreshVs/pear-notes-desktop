import { useEffect } from 'react'
import { useDispatch } from 'react-redux'

import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  localAiAppResumed,
  localAiNetworkChanged
} from '@pear-notes/core/store/slices/localAiSlice.js'

import { getLocalAiNetworkKind } from './electronAdapter'

export function useLocalAiBridge() {
  const dispatch = useDispatch()

  useEffect(() => {
    if (!LOCAL_AI_ENABLED) return
    let active = true
    const reportNetwork = () => {
      getLocalAiNetworkKind().then((kind) => {
        if (active) dispatch({ type: localAiNetworkChanged.type, payload: kind })
      })
    }
    window.addEventListener('online', reportNetwork)
    window.addEventListener('offline', reportNetwork)
    window.addEventListener('focus', reportNetwork)
    const unsubscribePower = window.electronBridge?.onPowerState?.((state) => {
      if (state === 'resume') dispatch(localAiAppResumed())
    })
    return () => {
      active = false
      window.removeEventListener('online', reportNetwork)
      window.removeEventListener('offline', reportNetwork)
      window.removeEventListener('focus', reportNetwork)
      unsubscribePower?.()
    }
  }, [dispatch])
}
