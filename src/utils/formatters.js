import i18next from 'i18next'

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatRelativeDate(timestamp, t) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  const translate = t || ((key, options) => i18next.t(key, options))

  if (days === 0) {
    const timeStr = date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    return translate('formatters.todayAt', { time: timeStr })
  } else if (days === 1) {
    const timeStr = date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    return translate('formatters.yesterdayAt', { time: timeStr })
  } else {
    return date.toLocaleDateString([], {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
}
