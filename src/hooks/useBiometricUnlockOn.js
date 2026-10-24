import { useEffect, useState } from 'react'

import { isBiometricUnlockOn, subscribeBiometricUnlock } from '../lib/noteLockSession'

export function useBiometricUnlockOn(enabled) {
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let active = true
    const refresh = () =>
      isBiometricUnlockOn().then((value) => {
        if (active) setOn(value)
      })
    refresh()
    const unsubscribe = subscribeBiometricUnlock(refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [enabled])

  return enabled && on
}
