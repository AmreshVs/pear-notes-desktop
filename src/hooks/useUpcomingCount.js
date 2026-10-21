import { useCallback, useEffect, useRef, useState } from 'react'

import { countOpenUpcoming } from '@pear-notes/core/store/services/noteTasks.js'
import { loadUpcomingGroups } from '@pear-notes/core/store/services/upcomingTasks.js'

import { useOnNotesChanged } from './useOnNotesChanged'

const REFRESH_MS = 60 * 1000

export function useUpcomingCount(enabled) {
  const [count, setCount] = useState(0)
  const activeRef = useRef(true)

  const refresh = useCallback(() => {
    loadUpcomingGroups()
      .then((groups) => {
        if (activeRef.current) setCount(countOpenUpcoming(groups))
      })
      .catch(() => {})
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

  useOnNotesChanged(refresh, enabled)

  return count
}
