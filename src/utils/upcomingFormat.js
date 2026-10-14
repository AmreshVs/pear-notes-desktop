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

/** "in 25 min", "in 3 hours", "tomorrow", "Fri 16 Oct". */
export function formatWhenFromNow(task, t, language, now = Date.now()) {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  const days = Math.round((dateOf({ ...task, time: null }).getTime() - startOfToday) / DAY_MS)
  if (task.time && days === 0) {
    const diff = dateOf(task).getTime() - now
    if (diff < HOUR_MS) {
      return t('upcoming.when.inMinutes', { count: Math.max(1, Math.round(diff / MINUTE_MS)) })
    }
    return t('upcoming.when.inHours', { count: Math.round(diff / HOUR_MS) })
  }
  if (days <= 0) return t('upcoming.when.today')
  if (days === 1) return t('upcoming.when.tomorrow')
  return formatDue({ ...task, time: null }, language)
}

/** The right-hand label of an Upcoming row: the time today, a weekday this week, else the date. */
export function formatWhenShort(task, language, now = Date.now()) {
  const date = dateOf(task)
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  const days = Math.round((dateOf({ ...task, time: null }).getTime() - startOfToday) / DAY_MS)
  const time = task.time
    ? date.toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' })
    : ''
  if (days === 0) return time
  const day =
    days > 0 && days < 7
      ? date.toLocaleDateString(language, { weekday: 'short' })
      : date.toLocaleDateString(language, { month: 'short', day: 'numeric' })
  return time ? `${day} ${time}` : day
}

export const upcomingText = (task) => task.name || task.text

/** "Turns 64 · in 4 days" */
export function birthdayMeta(task, t, now = Date.now()) {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  const days = Math.round((dateOf({ ...task, time: null }).getTime() - startOfToday) / DAY_MS)
  const when =
    days <= 0
      ? t('upcoming.when.today')
      : days === 1
        ? t('upcoming.when.tomorrow')
        : t('upcoming.when.inDays', { count: days })
  return `${yearlyLabel(task, t)} · ${when}`
}

/** Yearly dates grouped by month, in order; a month in another year names the year. */
export function birthdaysByMonth(tasks, language) {
  const thisYear = new Date().getFullYear()
  const months = []
  for (const task of tasks) {
    const key = task.date.slice(0, 7)
    let month = months[months.length - 1]
    if (month?.key !== key) {
      const [year, index] = key.split('-').map(Number)
      const title = new Date(year, index - 1, 1).toLocaleDateString(language, {
        month: 'long',
        ...(year !== thisYear ? { year: 'numeric' } : {})
      })
      month = { key, title, items: [] }
      months.push(month)
    }
    month.items.push(task)
  }
  return months
}
