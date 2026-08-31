const MS_IN_MINUTE = 60 * 1000
const MS_IN_HOUR = 60 * MS_IN_MINUTE
const MS_IN_DAY = 24 * MS_IN_HOUR

export function getRelativeTime(timestamp, now = Date.now()) {
  if (!timestamp) return null
  const diff = Math.max(0, now - timestamp)
  if (diff < MS_IN_MINUTE) return { key: 'sync.confirm.justNow', count: 0 }
  if (diff < MS_IN_HOUR) {
    return { key: 'sync.confirm.minutesAgo', count: Math.floor(diff / MS_IN_MINUTE) }
  }
  if (diff < MS_IN_DAY) {
    return { key: 'sync.confirm.hoursAgo', count: Math.floor(diff / MS_IN_HOUR) }
  }
  return { key: 'sync.confirm.daysAgo', count: Math.floor(diff / MS_IN_DAY) }
}
