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
