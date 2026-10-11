import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { reminderAt } from '@pear-notes/core/store/services/noteTasks.js'
import {
  loadTipRecords,
  pickTip,
  saveTipAnswer,
  selectStoreTips,
  setTipsEnabled,
  TIP,
  tipRecord
} from '@pear-notes/core/store/services/tips.js'

import { useLocalToggle } from './useLocalToggle'
import { REMINDERS_TOGGLE_KEY } from './useReminders'

const LOCAL_KEY = 'pear-notes:tips'
const REFRESH_MS = 5 * 60 * 1000
const SOON_MS = 3 * 24 * 60 * 60 * 1000
const TIPS_CHANGED = 'pear-notes:tips-changed'

const readLocal = () => {
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_KEY) || '{}')
  } catch {
    return {}
  }
}

const writeLocal = (value) => {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(value))
  } catch {
    return
  }
}

function taskTips(tasks, remindersOn, now) {
  const tips = []
  const open = tasks.filter((task) => !task.done)
  const soon = (task) => task.time && reminderAt(task) > now && reminderAt(task) - now < SOON_MS
  if (!remindersOn && open.some(soon)) tips.push(TIP.REMINDERS_OFF)
  if (open.some((task) => task.yearly)) tips.push(TIP.YEARLY_DATES)
  return tips
}

export function useTipsEnabled() {
  const [enabled, setEnabled] = useState(true)
  useEffect(() => {
    let active = true
    const load = () =>
      loadTipRecords()
        .then((loaded) => active && setEnabled(loaded.enabled))
        .catch(() => {})
    load()
    window.addEventListener(TIPS_CHANGED, load)
    return () => {
      active = false
      window.removeEventListener(TIPS_CHANGED, load)
    }
  }, [])
  const toggle = useCallback(() => {
    const next = !enabled
    setEnabled(next)
    setTipsEnabled(next)
      .then(() => window.dispatchEvent(new Event(TIPS_CHANGED)))
      .catch(() => {})
  }, [enabled])
  return [enabled, toggle]
}

export function useTips() {
  const storeTips = useSelector((state) => selectStoreTips(state, false))
  const [remindersOn] = useLocalToggle(REMINDERS_TOGGLE_KEY, false)
  const [tasks, setTasks] = useState([])
  const [loaded, setLoaded] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  const refresh = useCallback(() => {
    backendApi
      .getUpcomingTasks()
      .then((next) => {
        setTasks(next)
        setNow(Date.now())
      })
      .catch(() => {})
    loadTipRecords()
      .then(setLoaded)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const local = readLocal()
    if (!local.firstSeenAt) writeLocal({ ...local, firstSeenAt: Date.now() })
    refresh()
    const timer = setInterval(refresh, REFRESH_MS)
    window.addEventListener(TIPS_CHANGED, refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener(TIPS_CHANGED, refresh)
    }
  }, [refresh])

  const tip = useMemo(() => {
    if (!loaded) return null
    return pickTip({
      eligible: [...storeTips, ...taskTips(tasks, remindersOn, now)],
      records: loaded.records,
      local: readLocal(),
      now,
      enabled: loaded.enabled
    })
  }, [loaded, storeTips, tasks, remindersOn, now])

  useEffect(() => {
    if (!tip) return
    const local = readLocal()
    if (local.currentTip !== tip) writeLocal({ ...local, currentTip: tip, lastShownAt: Date.now() })
  }, [tip])

  const answer = useCallback(
    async (action) => {
      if (!tip || !loaded) return
      writeLocal({ ...readLocal(), currentTip: null })
      await saveTipAnswer(tip, tipRecord(loaded.records, tip), action).catch(() => {})
      window.dispatchEvent(new Event(TIPS_CHANGED))
    },
    [tip, loaded]
  )

  return { tip, answer }
}
