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

export function useAttachmentCount(enabled = true) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let active = true
    const refresh = () => {
      backendApi
        .getAttachmentCount()
        .then((next) => active && setCount(next))
        .catch(() => {})
    }
    refresh()
    const timer = setInterval(refresh, REFRESH_MS)
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [enabled])

  return count
}
