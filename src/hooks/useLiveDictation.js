import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

import { LOCAL_AI_ERROR, LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'
import { getLocalAiFeatureConfig } from '@pear-notes/core/store/slices/localAiSlice.js'

import {
  endDictation,
  placeDictationCaret,
  startDictation,
  updateDictation
} from '../lib/dictationRange'
import { transcribePcm } from '../lib/localAi/electronAdapter'
import {
  joinPcmChunks,
  MIC_DENIED,
  pcmChunksToWav,
  startLiveTranscription
} from '../lib/localAi/liveDictation'

const TIMER_INTERVAL_MS = 200
const FEATURE = LOCAL_AI_FEATURE.VOICE_TYPING

const ERROR_BY_CODE = {
  [MIC_DENIED]: 'micDenied',
  [LOCAL_AI_ERROR.NOT_ENOUGH_MEMORY]: 'notEnoughMemory'
}

const errorFromCause = (cause) => ERROR_BY_CODE[cause?.code] ?? 'failed'

export function useLiveDictation(editor, { onDone, onAttachAudio }) {
  const featureConfig = useSelector((state) => getLocalAiFeatureConfig(state, FEATURE))
  const [phase, setPhase] = useState('preparing')
  const [error, setError] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const [hasSavedAudio, setHasSavedAudio] = useState(false)

  const dictationRef = useRef(null)
  const liveRef = useRef(null)
  const savedAudioRef = useRef(null)
  const timerRef = useRef(null)
  const runIdRef = useRef(0)
  const finishedRef = useRef(false)

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  const keepSavedAudio = useCallback((saved) => {
    savedAudioRef.current = saved
    setHasSavedAudio(!!saved)
  }, [])

  const fail = useCallback((code) => {
    setError(code)
    setPhase('error')
  }, [])

  const finish = useCallback(
    (commit) => {
      if (finishedRef.current) return
      finishedRef.current = true
      endDictation(editor, dictationRef.current, { commit })
      dictationRef.current = null
      onDone()
    },
    [editor, onDone]
  )

  const start = useCallback(async () => {
    runIdRef.current += 1
    const runId = runIdRef.current
    setError(null)
    setElapsed(0)
    setPhase('preparing')
    if (!dictationRef.current) dictationRef.current = startDictation(editor)
    try {
      const live = await startLiveTranscription(FEATURE, featureConfig ?? {}, {
        onText: (text) => {
          if (runId === runIdRef.current) updateDictation(editor, dictationRef.current, text)
        },
        onLevel: setLevel
      })
      if (runId !== runIdRef.current) {
        live.cancel()
        return
      }
      liveRef.current = live
      setPhase('recording')
      const startedAt = Date.now()
      timerRef.current = setInterval(() => setElapsed(Date.now() - startedAt), TIMER_INTERVAL_MS)
    } catch (cause) {
      if (runId !== runIdRef.current) return
      fail(errorFromCause(cause))
    }
  }, [editor, fail, featureConfig])

  const transcribeSaved = useCallback(async () => {
    const saved = savedAudioRef.current
    if (!saved) return
    runIdRef.current += 1
    const runId = runIdRef.current
    setError(null)
    setPhase('finishing')
    try {
      const text = String(
        (await transcribePcm(joinPcmChunks(saved.chunks), FEATURE, featureConfig ?? {})) ?? ''
      ).trim()
      if (runId !== runIdRef.current) return
      if (!text) {
        fail('dictationFailed')
        return
      }
      keepSavedAudio(null)
      updateDictation(editor, dictationRef.current, text)
      finish(true)
    } catch (cause) {
      if (runId !== runIdRef.current) return
      fail(cause?.code === LOCAL_AI_ERROR.NOT_ENOUGH_MEMORY ? 'notEnoughMemory' : 'dictationFailed')
    }
  }, [editor, fail, featureConfig, finish, keepSavedAudio])

  const handleStop = useCallback(async () => {
    const live = liveRef.current
    if (!live) return
    liveRef.current = null
    stopTimer()
    setLevel(0)
    setPhase('finishing')
    const durationSeconds = Math.round(elapsed / 1000)
    const text = await live.stop().catch(() => '')
    if (text) {
      updateDictation(editor, dictationRef.current, text)
      finish(true)
      return
    }
    const chunks = live.capturedChunks()
    if (chunks.length === 0) {
      fail('empty')
      return
    }
    keepSavedAudio({ chunks, durationSeconds })
    await transcribeSaved()
  }, [editor, elapsed, fail, finish, keepSavedAudio, stopTimer, transcribeSaved])

  const handleCancel = useCallback(() => {
    runIdRef.current += 1
    stopTimer()
    liveRef.current?.cancel()
    liveRef.current = null
    keepSavedAudio(null)
    finish(false)
  }, [finish, keepSavedAudio, stopTimer])

  const handleRetry = useCallback(() => {
    if (savedAudioRef.current) transcribeSaved()
    else start()
  }, [start, transcribeSaved])

  const handleAttachAudio = useCallback(() => {
    const saved = savedAudioRef.current
    if (!saved || !onAttachAudio) return
    const wav = pcmChunksToWav(saved.chunks)
    keepSavedAudio(null)
    finish(true)
    if (wav) onAttachAudio(wav, saved.durationSeconds)
  }, [finish, keepSavedAudio, onAttachAudio])

  useEffect(() => {
    start()
    const reposition = () => placeDictationCaret(editor, dictationRef.current)
    window.addEventListener('scroll', reposition, { capture: true, passive: true })
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, { capture: true })
      window.removeEventListener('resize', reposition)
      runIdRef.current += 1
      stopTimer()
      liveRef.current?.cancel()
      liveRef.current = null
      if (!finishedRef.current) endDictation(editor, dictationRef.current, { commit: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    phase,
    error,
    elapsed,
    level,
    isRecording: phase === 'recording',
    isBusy: phase === 'preparing' || phase === 'finishing',
    isError: phase === 'error',
    canAttachAudio: hasSavedAudio && !!onAttachAudio,
    handleStop,
    handleCancel,
    handleRetry,
    handleAttachAudio
  }
}
