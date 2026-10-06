import { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'

import { setVisibleNotes } from '@pear-notes/core/store/slices/notesSlice.js'

const ROOT_MARGIN = '300px 0px 900px 0px'
const REPORT_DEBOUNCE_MS = 80

export function useVisibleNotes(scrollRef, notes) {
  const dispatch = useDispatch()
  const observerRef = useRef(null)
  const visibleRef = useRef(new Set())
  const reportedRef = useRef('')
  const timerRef = useRef(null)
  const reportRef = useRef(() => {})

  useEffect(() => {
    const root = scrollRef.current
    if (!root) return

    const report = () => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const keys = [...visibleRef.current].sort()
        const signature = keys.join(',')
        if (signature === reportedRef.current) return
        reportedRef.current = signature
        dispatch(setVisibleNotes(keys))
      }, REPORT_DEBOUNCE_MS)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = entry.target.dataset.noteKey
          if (!key) continue
          if (entry.isIntersecting) visibleRef.current.add(key)
          else visibleRef.current.delete(key)
        }
        report()
      },
      { root, rootMargin: ROOT_MARGIN }
    )
    observerRef.current = observer
    reportRef.current = report

    return () => {
      clearTimeout(timerRef.current)
      observer.disconnect()
      observerRef.current = null
    }
  }, [scrollRef, dispatch])

  useEffect(() => {
    const root = scrollRef.current
    const observer = observerRef.current
    if (!root || !observer) return
    const live = new Set(notes.map((note) => note.key))
    for (const key of [...visibleRef.current]) {
      if (!live.has(key)) visibleRef.current.delete(key)
    }
    for (const row of root.querySelectorAll('[data-note-key]')) observer.observe(row)
    reportRef.current()
  }, [scrollRef, notes])
}
