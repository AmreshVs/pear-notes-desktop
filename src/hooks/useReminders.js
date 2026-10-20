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

const SENT_ID_RE = /^[0-9a-f]{32}$/

const readSent = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(SENT_KEY) || '[]')
    return Array.isArray(stored) ? stored.filter((id) => SENT_ID_RE.test(id)) : []
  } catch {
    return []
  }
}

const sentIdOf = async (key) => {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
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
    writeSent(readSent())
  }, [])

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
      const candidates = dueReminders(tasks, { since, now, prefs, doneIds })
      const ids = await Promise.all(candidates.map((reminder) => sentIdOf(reminder.key)))
      const due = candidates
        .map((reminder, index) => ({ ...reminder, sentId: ids[index] }))
        .filter((reminder) => !sent.includes(reminder.sentId))
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
        sent.push(reminder.sentId)
      }
      if (due.length) writeSent(sent)
    }
    const timer = setInterval(check, CHECK_MS)
    return () => clearInterval(timer)
  }, [enabled, t])
}
