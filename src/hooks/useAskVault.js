import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import { LOCAL_AI_ERROR, LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'
import { isIndexable } from '@pear-notes/core/store/services/localAiIndex.js'
import {
  askYourVault,
  createVaultTurn,
  retrieveVaultSources,
  vaultAnswerNote
} from '@pear-notes/core/store/services/localAiVaultAsk.js'
import { WORK_KIND } from '@pear-notes/core/store/services/localAiWorkProgress.js'
import {
  getLocalAiFeatureConfig,
  getMeaningSearchReady
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { createNote, getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

import { copyToClipboard } from '../lib/clipboard'
import { askVault, cancelLocalAiTask, embedTexts } from '../lib/localAi/electronAdapter'

import { useLocalAiFeatureReady } from './useLocalAiFeatureReady'
import { useLocalAiWorkProgress } from './useLocalAiWorkProgress'

const COPIED_RESET_MS = 2000

function errorFromCause(cause) {
  if (cause?.code === LOCAL_AI_ERROR.NOT_ENOUGH_MEMORY) return 'notEnoughMemory'
  if (cause?.code === LOCAL_AI_ERROR.MODEL_UNSTABLE) return 'unstable'
  if (cause?.code === LOCAL_AI_ERROR.MODEL_MISSING) return 'notReady'
  if (/model busy/i.test(String(cause?.message ?? ''))) return 'busy'
  return 'failed'
}

async function substringKeys(query) {
  const response = await backendApi.searchNotes({ query, folderKey: ALL_NOTES_KEY })
  return (response?.results ?? []).map((result) => result.key)
}

/** Ask your vault: one thread per open of the Ask bar. */
export function useAskVault({ initialQuestion = '', sourcesLabel, onClose }) {
  const dispatch = useDispatch()
  const summaryConfig = useSelector((state) =>
    getLocalAiFeatureConfig(state, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS)
  )
  const notesData = useSelector(getNotesData)
  const meaningReady = useSelector(getMeaningSearchReady)
  const askReady = useLocalAiFeatureReady(LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS)
  const { workView, beginWork, endWork } = useLocalAiWorkProgress()
  const [question, setQuestion] = useState(initialQuestion)
  const [turns, setTurns] = useState([])
  const [copiedId, setCopiedId] = useState(null)
  const [savedId, setSavedId] = useState(null)
  const turnIdRef = useRef(0)
  const runIdRef = useRef(0)
  const copiedTimerRef = useRef(null)
  const notesRef = useRef(notesData)
  notesRef.current = notesData

  const ready = meaningReady && askReady
  const busy = turns.some((turn) => turn.status === 'working')
  const canSend = ready && question.trim().length > 0 && !busy

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
    if (!asked || busy || !ready) return
    turnIdRef.current += 1
    const id = turnIdRef.current
    const runId = runIdRef.current
    const previous = turns
    setQuestion('')
    setTurns((current) => [...current, createVaultTurn(id, asked)])
    const onProgress = beginWork(WORK_KIND.NOTE_TASK, { input: asked })
    const noteOf = (key) => notesRef.current?.[key]
    try {
      const result = await askYourVault({
        question: asked,
        turns: previous,
        retrieve: (query, history) =>
          retrieveVaultSources({
            api: backendApi,
            embed: embedTexts,
            question: query,
            turns: history,
            searchSubstring: substringKeys,
            isAllowed: (key) => isIndexable(noteOf(key)),
            titleOf: (key) => noteOf(key)?.title ?? '',
            updatedAtOf: (key) => noteOf(key)?.updatedAt ?? 0
          }),
        answer: (sources, history) =>
          askVault(asked, sources, history, summaryConfig ?? {}, { onProgress })
      })
      if (runId !== runIdRef.current) return
      updateTurn(id, (turn) => ({ ...turn, status: 'done', result, sources: result.sources }))
    } catch (cause) {
      if (runId !== runIdRef.current) return
      updateTurn(id, (turn) => ({ ...turn, status: 'failed', error: errorFromCause(cause) }))
    } finally {
      if (runId === runIdRef.current) endWork()
    }
  }, [beginWork, busy, endWork, question, ready, summaryConfig, turns, updateTurn])

  const handleCopy = useCallback(
    async (id) => {
      const turn = turns.find((item) => item.id === id)
      if (!turn?.result?.answer) return
      if (!(await copyToClipboard(turn.result.answer))) return
      setCopiedId(id)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopiedId(null), COPIED_RESET_MS)
    },
    [turns]
  )

  const handleSave = useCallback(
    (id) => {
      const turn = turns.find((item) => item.id === id)
      if (!turn?.result?.answer || savedId === id) return
      dispatch(
        createNote(vaultAnswerNote({ question: turn.question, result: turn.result, sourcesLabel }))
      )
      setSavedId(id)
    },
    [dispatch, savedId, sourcesLabel, turns]
  )

  const handleClose = useCallback(() => {
    runIdRef.current += 1
    if (busy) cancelLocalAiTask().catch(() => {})
    endWork()
    onClose()
  }, [busy, endWork, onClose])

  return {
    question,
    setQuestion,
    turns,
    workView,
    busy,
    ready,
    meaningReady,
    canSend,
    copiedId,
    savedId,
    handleSend,
    handleCopy,
    handleSave,
    handleClose
  }
}
