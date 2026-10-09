import { useEffect } from 'react'
import { useDispatch } from 'react-redux'

import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  enableLocalAiIndex,
  localAiConditionsChanged,
  localAiUserActivity,
  runLocalAiSchedulerProbe
} from '@pear-notes/core/store/slices/localAiSlice.js'

const ACTIVITY_THROTTLE_MS = 5000
const ACTIVITY_EVENTS = ['keydown', 'pointerdown', 'wheel']

export function useAiJobConditions() {
  const dispatch = useDispatch()

  useEffect(() => {
    if (!LOCAL_AI_ENABLED) return
    let active = true
    let battery = null
    let lastActivity = 0

    const report = () => {
      if (!active) return
      dispatch(
        localAiConditionsChanged({
          foreground: document.visibilityState === 'visible' && document.hasFocus(),
          charging: battery ? battery.charging : true
        })
      )
    }
    const onActivity = () => {
      const now = Date.now()
      if (now - lastActivity < ACTIVITY_THROTTLE_MS) return
      lastActivity = now
      dispatch(localAiUserActivity())
    }

    navigator
      .getBattery?.()
      .then((found) => {
        if (!active) return
        battery = found
        battery.addEventListener('chargingchange', report)
        report()
      })
      .catch(() => {})
    report()
    document.addEventListener('visibilitychange', report)
    window.addEventListener('focus', report)
    window.addEventListener('blur', report)
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, onActivity, true)
    if (import.meta.env.DEV && import.meta.env.VITE_AI_SCHEDULER_PROBE === '1') {
      dispatch(runLocalAiSchedulerProbe())
    }
    dispatch(enableLocalAiIndex())

    return () => {
      active = false
      battery?.removeEventListener('chargingchange', report)
      document.removeEventListener('visibilitychange', report)
      window.removeEventListener('focus', report)
      window.removeEventListener('blur', report)
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, onActivity, true)
    }
  }, [dispatch])
}
