import { useEffect } from 'react'
import { useDispatch } from 'react-redux'

import { appResumed, appSuspended } from '@pear-notes/core/store/slices/uiSlice.js'

export function usePowerState() {
  const dispatch = useDispatch()

  useEffect(() => {
    if (!window.electronBridge?.onPowerState) return

    let cancelled = false

    // The machine may have woken while this window did not exist yet; main
    // holds that resume until someone is listening for it.
    window.electronBridge
      .takePendingPowerState?.()
      .then((state) => {
        if (!cancelled && state === 'resume') dispatch(appResumed())
      })
      .catch(() => {})

    const unsubscribe = window.electronBridge.onPowerState((state) => {
      if (state === 'suspend') dispatch(appSuspended())
      if (state === 'resume') dispatch(appResumed())
    })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [dispatch])
}
