import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useSelector } from 'react-redux'

import { SEARCH_HIGHLIGHT_MS } from '@pear-notes/core/backend/noteSearch.js'
import { getSearchQuery } from '@pear-notes/core/store/slices/uiSlice.js'

import {
  clearFind,
  getFindState,
  moveFindMatch,
  revealFindMatch,
  setFindQuery
} from '../lib/findInNote'

const NO_MATCHES = '0:-1'
const OPEN_DIALOG_SELECTOR = '[role="dialog"], [aria-modal="true"]'

const findFor = (noteKey, listQuery) => {
  const query = (listQuery || '').trim()
  return { noteKey, open: !!query, query, fromList: !!query }
}

export function useFindInNote({ editor, noteKey, enabled }) {
  const listQuery = useSelector(getSearchQuery)
  const [find, setFind] = useState(() => findFor(noteKey, listQuery))
  const inputRef = useRef(null)
  const pendingRevealRef = useRef(false)

  let current = find
  if (find.noteKey !== noteKey) {
    current = findFor(noteKey, listQuery)
    setFind(current)
  }
  const { open, query, fromList } = current

  const subscribe = useCallback(
    (onChange) => {
      if (!editor) return () => {}
      const onTransaction = () => {
        if (pendingRevealRef.current && getFindState(editor).count > 0) {
          pendingRevealRef.current = false
          revealFindMatch(editor)
        }
        onChange()
      }
      editor.on('transaction', onTransaction)
      return () => editor.off('transaction', onTransaction)
    },
    [editor]
  )
  const snapshot = useSyncExternalStore(subscribe, () => {
    const state = getFindState(editor)
    return `${state.count}:${state.active}`
  })
  const [count, active] = (snapshot || NO_MATCHES).split(':').map(Number)

  useEffect(() => {
    if (!editor || !enabled) return
    if (open && query.trim()) {
      setFindQuery(editor, query)
      pendingRevealRef.current = getFindState(editor).count === 0
    } else {
      pendingRevealRef.current = false
      clearFind(editor)
    }
  }, [editor, enabled, open, query])

  const dismiss = useCallback(() => {
    setFind((state) => ({ ...state, open: false, query: '', fromList: false }))
  }, [])

  useEffect(() => {
    if (!editor || !open || !fromList) return
    const timer = setTimeout(dismiss, SEARCH_HIGHLIGHT_MS)
    const dom = editor.isDestroyed ? null : editor.view.dom
    dom?.addEventListener('beforeinput', dismiss)
    return () => {
      clearTimeout(timer)
      dom?.removeEventListener('beforeinput', dismiss)
    }
  }, [editor, open, fromList, dismiss])

  const keepFind = useCallback(() => {
    setFind((state) => (state.fromList ? { ...state, fromList: false } : state))
  }, [])

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [])

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return
      if (event.key.toLowerCase() !== 'f') return
      if (document.querySelector(OPEN_DIALOG_SELECTOR)) return
      event.preventDefault()
      setFind((state) => ({ ...state, open: true, fromList: false }))
      focusInput()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, focusInput])

  const setQuery = useCallback(
    (value) => setFind((state) => ({ ...state, query: value, fromList: false })),
    []
  )

  const close = useCallback(() => {
    dismiss()
    if (editor && !editor.isDestroyed) editor.commands.focus()
  }, [editor, dismiss])

  const next = useCallback(() => {
    keepFind()
    moveFindMatch(editor, 1)
  }, [editor, keepFind])

  const previous = useCallback(() => {
    keepFind()
    moveFindMatch(editor, -1)
  }, [editor, keepFind])

  return {
    open: open && enabled && !fromList,
    query,
    setQuery,
    count,
    active,
    inputRef,
    keepFind,
    next,
    previous,
    close
  }
}
