const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

const dateOf = (task) => {
  const [year, month, day] = task.date.split('-').map(Number)
  const [hour, minute] = (task.time ?? '00:00').split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute)
}

export function formatDue(task, language) {
  const date = dateOf(task)
  const label = date.toLocaleDateString(language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
  if (!task.time) return label
  return `${label} · ${date.toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' })}`
}

export function yearlyLabel(task, t) {
  const age = task.sinceYear ? Number(task.date.slice(0, 4)) - task.sinceYear : 0
  return age > 0 ? t('upcoming.turns', { age }) : t('upcoming.everyYear')
}

/** "in 25 min", "in 3 hours", "tomorrow", "on Fri 16 Oct". */
export function formatWhenFromNow(task, language, now = Date.now()) {
  const at = dateOf(task).getTime()
  const relative = new Intl.RelativeTimeFormat(language, { numeric: 'auto' })
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  const days = Math.round((dateOf({ ...task, time: null }).getTime() - startOfToday) / DAY_MS)
  if (task.time && days === 0) {
    const diff = at - now
    if (diff < HOUR_MS) return relative.format(Math.max(1, Math.round(diff / MINUTE_MS)), 'minute')
    return relative.format(Math.round(diff / HOUR_MS), 'hour')
  }
  if (days <= 1) return relative.format(days, 'day')
  return formatDue({ ...task, time: null }, language)
}
