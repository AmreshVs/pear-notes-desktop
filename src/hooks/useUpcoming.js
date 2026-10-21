import { useCallback, useEffect, useRef, useState } from 'react'

import { loadUpcomingGroups, setTaskDone } from '@pear-notes/core/store/services/upcomingTasks.js'

import { useOnNotesChanged } from './useOnNotesChanged'

const REFRESH_MS = 30 * 1000

export function useUpcoming() {
  const [groups, setGroups] = useState(null)
  const [pending, setPending] = useState(() => new Set())
  const activeRef = useRef(true)

  const refresh = useCallback(() => {
    loadUpcomingGroups()
      .then((next) => activeRef.current && setGroups(next))
      .catch(() => activeRef.current && setGroups([]))
  }, [])

  useEffect(() => {
    activeRef.current = true
    refresh()
    const timer = setInterval(refresh, REFRESH_MS)
    window.addEventListener('focus', refresh)
    return () => {
      activeRef.current = false
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  useOnNotesChanged(refresh)

  const toggleDone = useCallback(
    async (task) => {
      const id = `${task.noteKey}|${task.date}|${task.text}`
      setPending((current) => new Set(current).add(id))
      try {
        await setTaskDone(task, !task.done)
      } finally {
        if (activeRef.current) {
          setPending((current) => {
            const next = new Set(current)
            next.delete(id)
            return next
          })
          refresh()
        }
      }
    },
    [refresh]
  )

  const isPending = useCallback(
    (task) => pending.has(`${task.noteKey}|${task.date}|${task.text}`),
    [pending]
  )

  return { groups, refresh, toggleDone, isPending }
}
