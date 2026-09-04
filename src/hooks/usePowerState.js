import { useEffect } from 'react'
import { useDispatch } from 'react-redux'

import { appResumed, appSuspended } from '@pear-notes/core/store/slices/uiSlice.js'

export function usePowerState() {
  const dispatch = useDispatch()

  useEffect(() => {
    if (!window.electronBridge?.onPowerState) return

    return window.electronBridge.onPowerState((state) => {
      if (state === 'suspend') dispatch(appSuspended())
      if (state === 'resume') dispatch(appResumed())
    })
  }, [dispatch])
}
