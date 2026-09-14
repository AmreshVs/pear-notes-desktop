import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

import { LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'
import { getLocalAiFeatureConfig } from '@pear-notes/core/store/slices/localAiSlice.js'

import { downloadAsBlob } from '../lib/fileManager'
import { decodeAudioToPcm } from '../lib/localAi/audioPcm'
import {
  cancelLocalAiTask,
  extractTextFromImage,
  transcribePcm
} from '../lib/localAi/electronAdapter'
import { renderPdfPagesForOcr } from '../lib/pdfPreview'

const OCR_MAX_PDF_PAGES = 20

async function extractTextFromPdf(url, { signal, onProgress }) {
  const texts = []
  let ocrError = null
  try {
    await renderPdfPagesForOcr(url, {
      maxPages: OCR_MAX_PDF_PAGES,
      signal,
      onPage: async (image, page, total) => {
        onProgress({ page, total })
        try {
          const pageText = String((await extractTextFromImage(image)) ?? '').trim()
          if (pageText) texts.push(pageText)
        } catch (error) {
          ocrError = error
          throw error
        }
      }
    })
  } catch (error) {
    if (ocrError) throw ocrError
    throw Object.assign(new Error('download', { cause: error }), { code: 'download' })
  }
  return texts.join('\n\n')
}

const FEATURE_BY_MODE = {
  dictate: LOCAL_AI_FEATURE.VOICE_TYPING,
  transcribe: LOCAL_AI_FEATURE.TRANSCRIBE_RECORDINGS,
  extract: LOCAL_AI_FEATURE.EXTRACT_TEXT
}

export function useLocalAiSheet(request, { onInsert, onClose }) {
  const mode = request?.mode ?? 'dictate'
  const feature = FEATURE_BY_MODE[mode]
  const featureConfig = useSelector((state) => getLocalAiFeatureConfig(state, feature))

  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState(null)
  const [text, setText] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [pageProgress, setPageProgress] = useState(null)

  const abortRef = useRef(null)
  const phaseRef = useRef('idle')
  const runIdRef = useRef(0)
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  const updatePhase = useCallback((next) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  const releaseMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const fail = useCallback(
    (code, runId) => {
      if (runId !== runIdRef.current) return
      setError(code)
      updatePhase('error')
    },
    [updatePhase]
  )

  const run = useCallback(
    async (work) => {
      runIdRef.current += 1
      const runId = runIdRef.current
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setError(null)
      setPageProgress(null)
      updatePhase('working')
      try {
        const result = String((await work(controller.signal, runId)) ?? '').trim()
        if (runId !== runIdRef.current) return
        if (!result) {
          fail('empty', runId)
          return
        }
        setText(result)
        updatePhase('preview')
      } catch (err) {
        fail(err?.code === 'download' ? 'download' : 'failed', runId)
      }
    },
    [fail, updatePhase]
  )

  const processSource = useCallback(() => {
    if (!request?.url) return
    run(async (signal, runId) => {
      if (request.kind === 'pdf') {
        return extractTextFromPdf(request.url, {
          signal,
          onProgress: (progress) => {
            if (runId === runIdRef.current) setPageProgress(progress)
          }
        })
      }
      let blob
      try {
        blob = await downloadAsBlob(request.url)
      } catch {
        throw Object.assign(new Error('download'), { code: 'download' })
      }
      const buffer = await blob.arrayBuffer()
      if (mode === 'extract') return extractTextFromImage(new Uint8Array(buffer))
      return transcribePcm(await decodeAudioToPcm(buffer), feature, featureConfig ?? {})
    })
  }, [feature, featureConfig, mode, request, run])

  const handleRecord = useCallback(async () => {
    runIdRef.current += 1
    setError(null)
    setText('')
    setElapsed(0)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (event) => chunksRef.current.push(event.data)
      recorder.start()
      updatePhase('recording')
      const startedAt = Date.now()
      timerRef.current = setInterval(() => setElapsed(Date.now() - startedAt), 200)
    } catch {
      releaseMic()
      setError('micDenied')
      updatePhase('error')
    }
  }, [releaseMic, updatePhase])

  const stopRecorder = useCallback(() => {
    stopTimer()
    const recorder = recorderRef.current
    recorderRef.current = null
    if (!recorder || recorder.state !== 'recording') {
      releaseMic()
      return Promise.resolve(null)
    }
    return new Promise((resolve) => {
      recorder.onstop = () => {
        releaseMic()
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }))
      }
      recorder.stop()
    })
  }, [releaseMic, stopTimer])

  const handleStop = useCallback(async () => {
    const blob = await stopRecorder()
    if (!blob) {
      setError('failed')
      updatePhase('error')
      return
    }
    run(async () =>
      transcribePcm(
        await decodeAudioToPcm(await blob.arrayBuffer()),
        feature,
        featureConfig ?? {}
      )
    )
  }, [feature, featureConfig, run, stopRecorder, updatePhase])

  useEffect(() => {
    if (!request) return
    setText('')
    setError(null)
    setElapsed(0)
    if (request.mode === 'dictate') {
      handleRecord()
    } else {
      processSource()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id])

  useEffect(
    () => () => {
      runIdRef.current += 1
      abortRef.current?.abort()
      stopTimer()
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      releaseMic()
    },
    [releaseMic, stopTimer]
  )

  const handleAgain = useCallback(() => {
    if (mode === 'dictate') handleRecord()
    else processSource()
  }, [handleRecord, mode, processSource])

  const handleClose = useCallback(async () => {
    runIdRef.current += 1
    abortRef.current?.abort()
    if (phaseRef.current === 'recording') await stopRecorder()
    if (phaseRef.current === 'working') cancelLocalAiTask().catch(() => {})
    updatePhase('idle')
    onClose()
  }, [onClose, stopRecorder, updatePhase])

  const handleInsert = useCallback(() => {
    if (phaseRef.current !== 'preview' || !text) return
    updatePhase('idle')
    onInsert(text, mode)
  }, [mode, onInsert, text, updatePhase])

  return {
    mode,
    phase,
    error,
    text,
    elapsed,
    pageProgress,
    handleRecord,
    handleStop,
    handleAgain,
    handleClose,
    handleInsert
  }
}
