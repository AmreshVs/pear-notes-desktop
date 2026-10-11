import { useEffect, useState } from 'react'

import { countOpenUpcoming } from '@pear-notes/core/store/services/noteTasks.js'
import { loadUpcomingGroups } from '@pear-notes/core/store/services/upcomingTasks.js'

const REFRESH_MS = 60 * 1000

export function useUpcomingCount(enabled) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let active = true
    const refresh = () =>
      loadUpcomingGroups()
        .then((groups) => {
          if (active) setCount(countOpenUpcoming(groups))
        })
        .catch(() => {})
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
