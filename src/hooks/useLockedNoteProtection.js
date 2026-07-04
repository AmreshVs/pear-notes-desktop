import { useEffect } from 'react'
import {
  setContentProtection,
  getLockPrivacyPreference,
  LOCK_SCREENSHOT_PROTECTION_KEY,
  LOCK_SWITCHER_HIDE_KEY
} from '../lib/contentProtection'

export function useLockedNoteProtection (active) {
  useEffect(() => {
    let cancelled = false
    if (!active) {
      setContentProtection(false)
      return () => {}
    }
    Promise.all([
      getLockPrivacyPreference(LOCK_SCREENSHOT_PROTECTION_KEY),
      getLockPrivacyPreference(LOCK_SWITCHER_HIDE_KEY)
    ]).then(([screenshot, switcher]) => {
      if (cancelled) return
      setContentProtection(screenshot || switcher)
    })
    return () => {
      cancelled = true
      setContentProtection(false)
    }
  }, [active])
}
