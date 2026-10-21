import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'

import { getNoteKeys, getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

const SETTLE_MS = 400

export function useOnNotesChanged(callback, enabled = true) {
  const notesData = useSelector(getNotesData)
  const noteKeys = useSelector(getNoteKeys)
  const seenRef = useRef(null)

  useEffect(() => {
    if (!enabled) return
    const seen = seenRef.current
    seenRef.current = { notesData, noteKeys }
    if (!seen || (seen.notesData === notesData && seen.noteKeys === noteKeys)) return
    const timer = setTimeout(callback, SETTLE_MS)
    return () => clearTimeout(timer)
  }, [notesData, noteKeys, enabled, callback])
}
