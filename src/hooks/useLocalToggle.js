import { useCallback, useEffect, useState } from 'react'

const CHANGED_EVENT = 'pear-notes:local-toggle-changed'

const read = (key, fallback) => {
  try {
    const value = window.localStorage.getItem(`pear-notes:${key}`)
    return value === null ? fallback : value === 'on'
  } catch {
    return fallback
  }
}

export function useLocalToggle(key, fallback) {
  const [enabled, setEnabled] = useState(() => read(key, fallback))

  useEffect(() => {
    const sync = () => setEnabled(read(key, fallback))
    window.addEventListener(CHANGED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [key, fallback])

  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(`pear-notes:${key}`, read(key, fallback) ? 'off' : 'on')
    } catch {
      return
    }
    window.dispatchEvent(new Event(CHANGED_EVENT))
  }, [key, fallback])

  return [enabled, toggle]
}
