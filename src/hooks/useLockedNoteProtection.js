import { useEffect } from 'react'
import {
  setContentProtection,
  getLockPrivacyPreference,
  LOCK_SCREENSHOT_PROTECTION_KEY
} from '../lib/contentProtection'

export function useLockedNoteProtection (active) {
  useEffect(() => {
    let cancelled = false
    if (!active) {
      setContentProtection(false)
      return () => {}
    }
    getLockPrivacyPreference(LOCK_SCREENSHOT_PROTECTION_KEY).then((enabled) => {
      if (cancelled) return
      setContentProtection(enabled)
    })
    return () => {
      cancelled = true
      setContentProtection(false)
    }
  }, [active])
}
