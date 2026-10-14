import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

import { backendApi } from '@pear-notes/core/backend/api.js'
import {
  askNoteThreadFromTurns,
  clearAskNoteThread,
  loadAskNoteThread,
  saveAskNoteThread,
  savedAskNoteTurns
} from '@pear-notes/core/store/services/askThreads.js'
import {
  applyTextEdits,
  ASK_KIND,
  ASK_KV_CACHE_ENABLED,
  createAskTurn,
  getAskHistory,
  getAskScopeInfo,
  hasDroppedAskTurns,
  resolveAskTurn
} from '@pear-notes/core/store/services/localAiAsk.js'
import { LOCAL_AI_ERROR, LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'
import { WORK_KIND } from '@pear-notes/core/store/services/localAiWorkProgress.js'
import { getLocalAiFeatureConfig } from '@pear-notes/core/store/slices/localAiSlice.js'
import { getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

import { copyToClipboard } from '../lib/clipboard'
import { askAboutNote, cancelLocalAiTask, clearAskCache } from '../lib/localAi/electronAdapter'

import { useLocalAiWorkProgress } from './useLocalAiWorkProgress'

const COPIED_RESET_MS = 2000

function errorFromCause(cause) {
  if (cause?.code === LOCAL_AI_ERROR.NOT_ENOUGH_MEMORY) return 'notEnoughMemory'
  if (cause?.code === LOCAL_AI_ERROR.MODEL_UNSTABLE) return 'unstable'
  return 'failed'
}

const applyEditsToText = (text, edits) => applyTextEdits(text, edits).after

export const canApplyAskTurn = (turn, scope) =>
  turn.editedText !== null &&
  (turn.kind === ASK_KIND.EDITS || (turn.kind === ASK_KIND.REWRITE && scope === 'selection'))

function replaceOnce(text, find, replace) {
  const index = text.indexOf(find)
  return index === -1 ? text : `${text.slice(0, index)}${replace}${text.slice(index + find.length)}`
}

const asEarlier = (saved) => saved.map((turn, index) => ({ ...turn, id: index - saved.length }))

export function useAskNote({ noteKey, selectionText, noteText, onApplyEdits, onClose }) {
  const summaryConfig = useSelector((state) =>
    getLocalAiFeatureConfig(state, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS)
  )
  const notesData = useSelector(getNotesData)
  const notesRef = useRef(notesData)
  notesRef.current = notesData
  const { workView, beginWork, endWork } = useLocalAiWorkProgress()
  const initialSelection = String(selectionText ?? '').trim()
  const [scope, setScope] = useState(initialSelection ? 'selection' : 'note')
  const [texts, setTexts] = useState({ selection: initialSelection, note: noteText ?? '' })
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState([])
  const [earlier, setEarlier] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [threadKey] = useState(noteKey ?? null)
  const [copiedId, setCopiedId] = useState(null)
  const turnIdRef = useRef(0)
  const runIdRef = useRef(0)
  const copiedTimerRef = useRef(null)

  const hasSelection = texts.selection.length > 0
  const busy = turns.some((turn) => turn.status === 'working')
  const sourceText = scope === 'selection' ? texts.selection : texts.note
  const scopeInfo = useMemo(() => getAskScopeInfo(scope, sourceText), [scope, sourceText])
  const droppedTurns = useMemo(() => hasDroppedAskTurns(turns, sourceText), [turns, sourceText])
  const emptySource = sourceText.trim().length === 0
  const canSend = question.trim().length > 0 && !busy && !emptySource
  const allTurns = useMemo(() => [...earlier, ...turns], [earlier, turns])
  const isLocked = useCallback((key) => notesRef.current?.[key]?.locked === true, [])

  useEffect(
    () => () => {
      runIdRef.current += 1
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    },
    []
  )

  useEffect(() => {
    let live = true
    loadAskNoteThread(backendApi, threadKey, isLocked)
      .then((saved) => live && setEarlier(asEarlier(saved)))
      .catch(() => {})
      .finally(() => live && setLoaded(true))
    return () => {
      live = false
    }
  }, [isLocked, threadKey])

  useEffect(() => {
    if (!loaded || !threadKey || !turns.length || turns.some((turn) => turn.status === 'working')) {
      return
    }
    const thread = askNoteThreadFromTurns({ noteKey: threadKey, turns: [...earlier, ...turns] })
    if (thread) saveAskNoteThread(backendApi, thread, isLocked).catch(() => {})
  }, [earlier, isLocked, loaded, threadKey, turns])

  const updateTurn = useCallback((id, update) => {
    setTurns((current) => current.map((turn) => (turn.id === id ? update(turn) : turn)))
  }, [])

  const handleSend = useCallback(async () => {
    const asked = question.trim()
    if (!asked || busy) return
    turnIdRef.current += 1
    const id = turnIdRef.current
    const runId = runIdRef.current
    const history = getAskHistory(turns)
    const text = sourceText
    setQuestion('')
    setTurns((current) => [...current, { ...createAskTurn(id, asked), scope }])
    const onProgress = beginWork(WORK_KIND.NOTE_TASK, { input: text })
    try {
      const cache = ASK_KV_CACHE_ENABLED && threadKey !== null && !isLocked(threadKey)
      const raw = await askAboutNote(text, history, asked, summaryConfig ?? {}, {
        onProgress,
        cache
      })
      if (runId !== runIdRef.current) return
      updateTurn(id, (turn) => resolveAskTurn(turn, text, raw))
    } catch (cause) {
      if (runId !== runIdRef.current) return
      updateTurn(id, (turn) => ({ ...turn, status: 'failed', error: errorFromCause(cause) }))
    } finally {
      if (runId === runIdRef.current) endWork()
    }
  }, [
    beginWork,
    busy,
    endWork,
    isLocked,
    question,
    scope,
    sourceText,
    summaryConfig,
    threadKey,
    turns,
    updateTurn
  ])

  const handleToggleScope = useCallback(() => {
    if (busy || !hasSelection) return
    runIdRef.current += 1
    setScope((current) => (current === 'selection' ? 'note' : 'selection'))
    setEarlier((current) => asEarlier(savedAskNoteTurns([...current, ...turns])))
    setTurns([])
  }, [busy, hasSelection, turns])

  const handleClear = useCallback(() => {
    if (busy) return
    runIdRef.current += 1
    setEarlier([])
    setTurns([])
    clearAskCache().catch(() => {})
    if (threadKey) clearAskNoteThread(backendApi, threadKey).catch(() => {})
  }, [busy, threadKey])

  const handleApply = useCallback(
    (id) => {
      const turn = turns.find((item) => item.id === id)
      if (!turn || turn.applied || !canApplyAskTurn(turn, scope) || busy) return
      const isRewrite = turn.kind === ASK_KIND.REWRITE
      onApplyEdits({
        scope,
        edits: turn.edits,
        replaceText: isRewrite ? turn.editedText : null,
        lengthDelta: turn.editedText.length - sourceText.length
      })
      setTexts((current) => ({
        selection:
          scope === 'selection' ? turn.editedText : applyEditsToText(current.selection, turn.edits),
        note:
          scope === 'note'
            ? turn.editedText
            : isRewrite
              ? replaceOnce(current.note, current.selection, turn.editedText)
              : applyEditsToText(current.note, turn.edits)
      }))
      updateTurn(id, (item) => ({ ...item, applied: true }))
    },
    [busy, onApplyEdits, scope, sourceText, turns, updateTurn]
  )

  const handleCopy = useCallback(
    async (id) => {
      const turn = allTurns.find((item) => item.id === id)
      if (!turn?.answer) return
      const ok = await copyToClipboard(turn.answer)
      if (!ok) return
      setCopiedId(id)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopiedId(null), COPIED_RESET_MS)
    },
    [allTurns]
  )

  const handleClose = useCallback(() => {
    runIdRef.current += 1
    if (busy) cancelLocalAiTask().catch(() => {})
    endWork()
    onClose()
  }, [busy, endWork, onClose])

  return {
    scope,
    scopeInfo,
    hasSelection,
    question,
    setQuestion,
    turns,
    earlier,
    workView,
    busy,
    canSend,
    droppedTurns,
    emptySource,
    copiedId,
    handleSend,
    handleToggleScope,
    handleApply,
    handleCopy,
    handleClear,
    handleClose
  }
}
