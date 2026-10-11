import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { AI_SUGGESTION } from '@pear-notes/core/store/services/aiSuggestionPrefs.js'
import { dueReminders } from '@pear-notes/core/store/services/noteTasks.js'
import { loadDoneIds, loadReminderPrefs } from '@pear-notes/core/store/services/upcomingTasks.js'
import { selectAiSuggestionOn } from '@pear-notes/core/store/slices/localAiSlice.js'
import { selectNote } from '@pear-notes/core/store/slices/notesSlice.js'

import { useLocalToggle } from './useLocalToggle'

const CHECK_MS = 60 * 1000
const SENT_KEY = 'pear-notes:reminders-sent'
const SENT_LIMIT = 300
export const REMINDERS_TOGGLE_KEY = 'reminders'

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
  const [remindersOn] = useLocalToggle(REMINDERS_TOGGLE_KEY, false)
  const tasksOn = useSelector((state) => selectAiSuggestionOn(state, AI_SUGGESTION.TASKS))
  const enabled = remindersOn && tasksOn

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
      const [tasks, prefs, doneIds] = await Promise.all([
        backendApi.getUpcomingTasks().catch(() => []),
        loadReminderPrefs().catch(() => undefined),
        loadDoneIds().catch(() => null)
      ])
      const sent = readSent()
      const due = dueReminders(tasks, { since, now, prefs, doneIds }).filter(
        (reminder) => !sent.includes(reminder.key)
      )
      since = now
      for (const reminder of due) {
        const title = reminder.title || t('noteCard.untitled')
        bridge.showNotification({
          title: reminder.text,
          body: reminder.offset
            ? t('upcoming.reminderBody', {
                lead: t(`upcoming.reminderLead.${reminder.offset}`),
                title
              })
            : title,
          noteKey: reminder.noteKey
        })
        sent.push(reminder.key)
      }
      if (due.length) writeSent(sent)
    }
    const timer = setInterval(check, CHECK_MS)
    return () => clearInterval(timer)
  }, [enabled, t])
}
