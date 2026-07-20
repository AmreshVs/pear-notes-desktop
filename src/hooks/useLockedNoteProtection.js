import { useEffect } from 'react'
import { setContentProtection } from '../lib/contentProtection'
import { LOCK_SCREENSHOT_PROTECTION_KEY } from '@pear-notes/core/constant.js'
import { getLockPrivacyPreference } from '@pear-notes/core/utils.js'

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
