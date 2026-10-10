import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { dueReminders, reminderKey } from '@pear-notes/core/store/services/noteTasks.js'
import { selectNote } from '@pear-notes/core/store/slices/notesSlice.js'

import { useLocalToggle } from './useLocalToggle'

const CHECK_MS = 60 * 1000
const SENT_KEY = 'pear-notes:reminders-sent'
const SENT_LIMIT = 300

const readSent = () => {
  try {
    return JSON.parse(window.localStorage.getItem(SENT_KEY) || '[]')
  } catch {
    return []
  }
}

const writeSent = (keys) => {
  try {
    window.localStorage.setItem(SENT_KEY, JSON.stringify(keys.slice(-SENT_LIMIT)))
  } catch {
    return
  }
}

export function useReminders() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const [enabled] = useLocalToggle('reminders', false)

  useEffect(() => {
    const bridge = window.electronBridge
    if (!bridge?.onOpenNote) return
    return bridge.onOpenNote((noteKey) => dispatch(selectNote(noteKey)))
  }, [dispatch])

  useEffect(() => {
    const bridge = window.electronBridge
    if (!enabled || !bridge?.showNotification) return
    let since = Date.now()
    const check = async () => {
      const now = Date.now()
      const tasks = await backendApi.getUpcomingTasks().catch(() => [])
      const sent = readSent()
      const due = dueReminders(tasks, { since, now }).filter(
        (task) => !sent.includes(reminderKey(task))
      )
      since = now
      for (const task of due) {
        bridge.showNotification({
          title: task.text,
          body: task.title || t('noteCard.untitled'),
          noteKey: task.noteKey
        })
        sent.push(reminderKey(task))
      }
      if (due.length) writeSent(sent)
    }
    const timer = setInterval(check, CHECK_MS)
    return () => clearInterval(timer)
  }, [enabled, t])
}
