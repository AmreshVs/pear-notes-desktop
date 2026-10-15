import { useCallback, useEffect, useRef, useState } from 'react'

import { backendApi } from '@pear-notes/core/backend/api.js'

const REFRESH_MS = 60 * 1000

export function useAttachments(enabled = true) {
  const [items, setItems] = useState(null)
  const activeRef = useRef(true)

  const refresh = useCallback(() => {
    backendApi
      .getAttachments()
      .then((next) => activeRef.current && setItems(next))
      .catch(() => activeRef.current && setItems([]))
  }, [])

  useEffect(() => {
    if (!enabled) return
    activeRef.current = true
    refresh()
    const timer = setInterval(refresh, REFRESH_MS)
    window.addEventListener('focus', refresh)
    return () => {
      activeRef.current = false
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [enabled, refresh])

  return { items, refresh }
}
