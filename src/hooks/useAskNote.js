import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

import {
  applyTextEdits,
  ASK_KIND,
  createAskTurn,
  getAskHistory,
  getAskScopeInfo,
  hasDroppedAskTurns,
  resolveAskTurn
} from '@pear-notes/core/store/services/localAiAsk.js'
import { LOCAL_AI_ERROR, LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'
import { WORK_KIND } from '@pear-notes/core/store/services/localAiWorkProgress.js'
import { getLocalAiFeatureConfig } from '@pear-notes/core/store/slices/localAiSlice.js'

import { copyToClipboard } from '../lib/clipboard'
import { askAboutNote, cancelLocalAiTask } from '../lib/localAi/electronAdapter'

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

export function useAskNote({ selectionText, noteText, onApplyEdits, onClose }) {
  const summaryConfig = useSelector((state) =>
    getLocalAiFeatureConfig(state, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS)
  )
  const { workView, beginWork, endWork } = useLocalAiWorkProgress()
  const initialSelection = String(selectionText ?? '').trim()
  const [scope, setScope] = useState(initialSelection ? 'selection' : 'note')
  const [texts, setTexts] = useState({ selection: initialSelection, note: noteText ?? '' })
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState([])
  const [copiedId, setCopiedId] = useState(null)
  const turnIdRef = useRef(0)
  const runIdRef = useRef(0)
  const copiedTimerRef = useRef(null)

  const hasSelection = texts.selection.length > 0
  const busy = turns.some((turn) => turn.status === 'working')
  const sourceText = scope === 'selection' ? texts.selection : texts.note
  const scopeInfo = useMemo(() => getAskScopeInfo(scope, sourceText), [scope, sourceText])
  const droppedTurns = useMemo(() => hasDroppedAskTurns(turns), [turns])
  const emptySource = sourceText.trim().length === 0
  const canSend = question.trim().length > 0 && !busy && !emptySource

  useEffect(
    () => () => {
      runIdRef.current += 1
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    },
    []
  )

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
    setTurns((current) => [...current, createAskTurn(id, asked)])
    const onProgress = beginWork(WORK_KIND.NOTE_TASK, { input: text })
    try {
      const raw = await askAboutNote(text, history, asked, summaryConfig ?? {}, { onProgress })
      if (runId !== runIdRef.current) return
      updateTurn(id, (turn) => resolveAskTurn(turn, text, raw))
    } catch (cause) {
      if (runId !== runIdRef.current) return
      updateTurn(id, (turn) => ({ ...turn, status: 'failed', error: errorFromCause(cause) }))
    } finally {
      if (runId === runIdRef.current) endWork()
    }
  }, [beginWork, busy, endWork, question, sourceText, summaryConfig, turns, updateTurn])

  const handleToggleScope = useCallback(() => {
    if (busy || !hasSelection) return
    runIdRef.current += 1
    setScope((current) => (current === 'selection' ? 'note' : 'selection'))
    setTurns([])
  }, [busy, hasSelection])

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
      const turn = turns.find((item) => item.id === id)
      if (!turn?.answer) return
      const ok = await copyToClipboard(turn.answer)
      if (!ok) return
      setCopiedId(id)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopiedId(null), COPIED_RESET_MS)
    },
    [turns]
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
    handleClose
  }
}
