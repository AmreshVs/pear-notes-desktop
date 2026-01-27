import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function getFingerprint(hex) {
  if (!hex) return ''
  const emojis = ['🥑', '🍐', '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥝', '🥥', '🍍', '🥭']
  const hash = hex.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  
  let fingerprint = ''
  for (let i = 0; i < 3; i++) {
    const index = (hash + i * 7) % emojis.length
    fingerprint += emojis[index]
  }
  
  return `${fingerprint} (${hex.slice(0, 5)})`
}

export function debounce(fn, ms) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), ms)
  }
}

const getDayDiff = (timestamp) => {
  if (!timestamp) return Infinity
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export const NOTES_LIST_GROUP = {
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  L7DAYS: 'Last 7 Days',
  L30DAYS: 'Last 30 Days'
}

export const getGroupTitle = (note) => {
  const timestamp = note.value?.updatedAt || note.value?.createdAt
  if (!timestamp) return 'No Date'
  
  const diff = getDayDiff(timestamp)
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const currentYear = new Date().getFullYear()

  if (diff === 0) return NOTES_LIST_GROUP.TODAY
  if (diff === 1) return NOTES_LIST_GROUP.YESTERDAY
  if (diff < 7) return NOTES_LIST_GROUP.L7DAYS
  if (diff < 30) return NOTES_LIST_GROUP.L30DAYS
  if (year === currentYear) return date.toLocaleString('default', { month: 'long' })
  return year.toString()
}

export const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes <= 1 ? 'Just now' : `${minutes}m ago`
    }
    return `${hours}h ago`
  } else if (days === 1) {
    return 'Yesterday'
  } else if (days < 7) {
    return `${days}d ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

export const getPreview = (content, contentHtml) => {
  if (!content && !contentHtml) return 'No additional text'

  let text = ''
  if (contentHtml) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(contentHtml, 'text/html')
    text = doc.body.textContent || doc.body.innerText || ''
  } else {
    text = content || ''
  }
  
  if (text) text = text.replace(/\n/g, ' ').trim()
  return text.length > 60 ? text.substring(0, 60) + '...' : text
}