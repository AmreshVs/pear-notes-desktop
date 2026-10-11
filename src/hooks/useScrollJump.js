import { useCallback, useEffect, useRef, useState } from 'react'

export const SCROLL_JUMP = Object.freeze({ UP: 'up', DOWN: 'down' })

const LONG_CONTENT_VIEWPORTS = 2.5
const MIN_SCROLL_DELTA = 6
const HIDE_AFTER_MS = 1800
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

export function useScrollJump(el, resetKey) {
  const [shown, setShown] = useState({ key: resetKey, direction: null })
  const direction = shown.key === resetKey ? shown.direction : null
  const lastTopRef = useRef(0)
  const hideTimerRef = useRef(null)
  const currentRef = useRef(null)

  useEffect(() => {
    if (!el) return
    currentRef.current = null
    const setDirection = (next) => {
      if (currentRef.current === next) return
      currentRef.current = next
      setShown({ key: resetKey, direction: next })
    }
    lastTopRef.current = el.scrollTop
    const handleScroll = () => {
      const top = el.scrollTop
      const delta = top - lastTopRef.current
      if (Math.abs(delta) < MIN_SCROLL_DELTA) return
      lastTopRef.current = top
      const viewport = el.clientHeight
      const long = el.scrollHeight > viewport * LONG_CONTENT_VIEWPORTS
      const next = delta > 0 ? SCROLL_JUMP.DOWN : SCROLL_JUMP.UP
      const nearEnd =
        next === SCROLL_JUMP.DOWN ? el.scrollHeight - top - viewport < viewport : top < viewport
      setDirection(long && !nearEnd ? next : null)
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => setDirection(null), HIDE_AFTER_MS)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleScroll)
      clearTimeout(hideTimerRef.current)
    }
  }, [el, resetKey])

  const jump = useCallback(() => {
    if (!el || !direction) return
    const reduced = window.matchMedia?.(REDUCED_MOTION).matches
    el.scrollTo({
      top: direction === SCROLL_JUMP.DOWN ? el.scrollHeight : 0,
      behavior: reduced ? 'auto' : 'smooth'
    })
    currentRef.current = null
    setShown({ key: resetKey, direction: null })
  }, [el, direction, resetKey])

  return { direction, jump }
}
