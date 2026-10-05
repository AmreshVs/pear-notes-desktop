import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'

import {
  LOCAL_AI_ERROR,
  LOCAL_AI_FEATURE,
  LOCAL_AI_MODEL_STATUS,
  LOCAL_AI_NOTICE
} from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  detectTextLanguage,
  getTranslationModelNames,
  normalizeLanguageCode,
  pickTranslationTarget,
  TRANSLATION_ALL_LANGUAGES
} from '@pear-notes/core/store/services/localAiLanguage.js'
import {
  isRewriteTask,
  NOTE_TASK,
  NOTE_TASK_MIN_CHARS,
  parseKeyPointsOutput,
  parseSummaryOutput,
  parseTitleOutput,
  REWRITE_MAX_CHARS
} from '@pear-notes/core/store/services/localAiPrompts.js'
import { diffRewriteText } from '@pear-notes/core/store/services/localAiRewriteDiff.js'
import { TRANSLATION_SOURCE_LANGUAGE } from '@pear-notes/core/store/services/localAiTranslationModels.js'
import {
  countWords,
  WORK_EVENT,
  WORK_KIND,
  WORK_SHORTER_TARGET_RATIO,
  WORK_STEP
} from '@pear-notes/core/store/services/localAiWorkProgress.js'
import {
  clearLocalAiNotice,
  downloadLocalAiModelNow,
  downloadLocalAiModels,
  getLocalAiFeatureConfig,
  getLocalAiNotice,
  getLocalAiTranslationTarget,
  selectLocalAiModelsStatus,
  setLocalAiTranslationTarget
} from '@pear-notes/core/store/slices/localAiSlice.js'

import { downloadAsBlob } from '../lib/fileManager'
import { decodeAudioToPcm } from '../lib/localAi/audioPcm'
import {
  cancelLocalAiTask,
  describeImage,
  extractTextFromImage,
  runNoteTask,
  summarizeTranscript,
  transcribePcm,
  translateParagraphs
} from '../lib/localAi/electronAdapter'
import { renderPdfPagesForOcr } from '../lib/pdfPreview'

import { useLocalAiWorkProgress } from './useLocalAiWorkProgress'

const OCR_MAX_PDF_PAGES = 20
const DESCRIBABLE_IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg' }
const EMPTY_PARAGRAPHS = []
const EMPTY_PROGRESS = { percent: 0, missingBytes: 0 }
const WAITING_STATUSES = [LOCAL_AI_MODEL_STATUS.WAITING_NETWORK, LOCAL_AI_MODEL_STATUS.PAUSED]

const joinPages = (pages) => pages.filter(Boolean).join('\n\n')

async function toDescribableImage(blob) {
  const extension = DESCRIBABLE_IMAGE_TYPES[blob.type]
  if (extension) return { bytes: new Uint8Array(await blob.arrayBuffer()), extension }
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d').drawImage(bitmap, 0, 0)
  bitmap.close?.()
  const png = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  return { bytes: new Uint8Array(await png.arrayBuffer()), extension: 'png' }
}

async function extractTextFromPdf(url, { signal, onProgress }) {
  const texts = []
  let words = 0
  let ocrError = null
  try {
    await renderPdfPagesForOcr(url, {
      maxPages: OCR_MAX_PDF_PAGES,
      signal,
      onPage: async (image, page, total) => {
        const reportPage = (done) =>
          onProgress({ type: WORK_EVENT.PAGE, page, total, done, words })
        const forwardPageEvent = (event) => {
          if (event.step === WORK_STEP.LOAD_MODEL) onProgress(event)
          if (event.step === WORK_STEP.READ_TEXT) reportPage(page - 1)
          if (event.type === WORK_EVENT.TEXT) {
            onProgress({ type: WORK_EVENT.TEXT, text: joinPages([...texts, event.text ?? '']) })
          }
        }
        try {
          const pageText = String(
            (await extractTextFromImage(image, { onProgress: forwardPageEvent })) ?? ''
          ).trim()
          if (pageText) texts.push(pageText)
          words += countWords(pageText)
          reportPage(page)
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
  return joinPages(texts)
}

const NOTE_TASK_BY_MODE = {
  summarizeNote: NOTE_TASK.NOTE_SUMMARY,
  suggestTitle: NOTE_TASK.TITLE,
  keyPoints: NOTE_TASK.KEY_POINTS,
  fixGrammar: NOTE_TASK.FIX_GRAMMAR,
  rewrite: NOTE_TASK.REWRITE,
  makeShorter: NOTE_TASK.MAKE_SHORTER,
  makeProfessional: NOTE_TASK.MAKE_PROFESSIONAL,
  makeFriendly: NOTE_TASK.MAKE_FRIENDLY
}

const FEATURE_BY_MODE = {
  dictate: LOCAL_AI_FEATURE.VOICE_TYPING,
  transcribe: LOCAL_AI_FEATURE.TRANSCRIBE_RECORDINGS,
  extract: LOCAL_AI_FEATURE.EXTRACT_TEXT,
  describe: LOCAL_AI_FEATURE.DESCRIBE_IMAGES,
  translate: LOCAL_AI_FEATURE.TRANSLATE_NOTES,
  summarizeNote: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
  suggestTitle: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
  keyPoints: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
  fixGrammar: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
  rewrite: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
  makeShorter: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
  makeProfessional: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
  makeFriendly: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS
}

const getDeviceLanguage = () =>
  normalizeLanguageCode(typeof navigator !== 'undefined' ? navigator.language : null)

export function useLocalAiSheet(request, { onInsert, onAttachAudio, onClose }) {
  const mode = request?.mode ?? 'dictate'
  const feature = FEATURE_BY_MODE[mode]
  const paragraphs = request?.paragraphs ?? EMPTY_PARAGRAPHS
  const scope = request?.scope ?? 'note'
  const dispatch = useDispatch()
  const store = useStore()
  const featureConfig = useSelector((state) => getLocalAiFeatureConfig(state, feature))
  const summaryConfig = useSelector((state) =>
    getLocalAiFeatureConfig(state, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS)
  )
  const lastTarget = useSelector(getLocalAiTranslationTarget)

  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState(null)
  const [text, setText] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const { workView, beginWork, endWork } = useLocalAiWorkProgress()
  const [summary, setSummary] = useState(null)
  const [summaryPhase, setSummaryPhase] = useState('idle')
  const [keyPoints, setKeyPoints] = useState([])
  const [sourceLanguage, setSourceLanguage] = useState(null)
  const [targetLanguage, setTargetLanguage] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(EMPTY_PROGRESS)
  const [noSpaceBytes, setNoSpaceBytes] = useState(0)
  const [savedAudio, setSavedAudio] = useState(null)

  const abortRef = useRef(null)
  const phaseRef = useRef('idle')
  const summaryPhaseRef = useRef('idle')
  const runIdRef = useRef(0)
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const downloadNamesRef = useRef([])
  const translateRequestRef = useRef(null)
  const savedAudioRef = useRef(null)
  const startedAtRef = useRef(0)

  const keepSavedAudio = useCallback((next) => {
    savedAudioRef.current = next
    setSavedAudio(next)
  }, [])

  const updatePhase = useCallback((next) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const updateSummaryPhase = useCallback((next) => {
    summaryPhaseRef.current = next
    setSummaryPhase(next)
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
    async (work, failCode = 'failed', workKind = null, workOptions = {}) => {
      runIdRef.current += 1
      const runId = runIdRef.current
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setError(null)
      setSummary(null)
      const onProgress = workKind ? beginWork(workKind, workOptions) : () => {}
      updateSummaryPhase('idle')
      updatePhase('working')
      try {
        const result = String((await work(controller.signal, runId, onProgress)) ?? '').trim()
        if (runId !== runIdRef.current) return
        if (!result) {
          fail(failCode, runId)
          return
        }
        setText(result)
        updatePhase('preview')
      } catch (err) {
        fail(
          err?.code === LOCAL_AI_ERROR.NOT_ENOUGH_MEMORY
            ? 'notEnoughMemory'
            : err?.code === 'download'
              ? 'download'
              : failCode,
          runId
        )
      }
    },
    [beginWork, fail, updatePhase, updateSummaryPhase]
  )

  const processSource = useCallback(() => {
    if (!request?.url) return
    const isPdf = request.kind === 'pdf'
    const workKind =
      mode === 'describe'
        ? WORK_KIND.DESCRIBE
        : mode !== 'extract'
          ? WORK_KIND.TRANSCRIBE
          : isPdf
            ? WORK_KIND.EXTRACT_PDF
            : WORK_KIND.EXTRACT_IMAGE
    run(
      async (signal, runId, onProgress) => {
        if (isPdf) return extractTextFromPdf(request.url, { signal, onProgress })
        onProgress({
          type: WORK_EVENT.STEP,
          step: mode === 'transcribe' ? WORK_STEP.PREPARE_AUDIO : WORK_STEP.PREPARE_PHOTO
        })
        let blob
        try {
          blob = await downloadAsBlob(request.url)
        } catch {
          throw Object.assign(new Error('download'), { code: 'download' })
        }
        if (mode === 'describe') {
          const { bytes, extension } = await toDescribableImage(blob)
          return describeImage(bytes, extension, { onProgress })
        }
        const buffer = await blob.arrayBuffer()
        if (mode === 'extract') return extractTextFromImage(new Uint8Array(buffer), { onProgress })
        return transcribePcm(await decodeAudioToPcm(buffer), feature, featureConfig ?? {}, {
          onProgress
        })
      },
      'failed',
      workKind
    )
  }, [feature, featureConfig, mode, request, run])

  const runTranslation = useCallback(() => {
    const pending = translateRequestRef.current
    if (!pending) return
    run(
      async (signal, runId, onProgress) => {
        const translations = await translateParagraphs(paragraphs, pending.source, pending.target, {
          onProgress
        })
        return translations
          .map((line) => String(line ?? '').trim())
          .filter(Boolean)
          .join('\n')
      },
      'failed',
      WORK_KIND.TRANSLATE
    )
  }, [paragraphs, run])

  const checkDownload = useCallback(() => {
    if (phaseRef.current !== 'downloading' && phaseRef.current !== 'waiting') return
    const names = downloadNamesRef.current
    if (names.length === 0) return
    const state = store.getState()
    const notice = getLocalAiNotice(state)
    if (
      notice?.type === LOCAL_AI_NOTICE.INSUFFICIENT_SPACE &&
      notice.names?.some((name) => names.includes(name))
    ) {
      setNoSpaceBytes(notice.requiredBytes ?? 0)
      setError('noSpace')
      updatePhase('error')
      dispatch(clearLocalAiNotice())
      return
    }
    const status = selectLocalAiModelsStatus(state, names)
    setDownloadProgress((previous) =>
      previous.percent === status.percent && previous.missingBytes === status.missingBytes
        ? previous
        : { percent: status.percent, missingBytes: status.missingBytes }
    )
    if (status.status === LOCAL_AI_MODEL_STATUS.READY) {
      runTranslation()
      return
    }
    if (status.status === LOCAL_AI_MODEL_STATUS.FAILED) {
      setError('downloadFailed')
      updatePhase('error')
      return
    }
    updatePhase(WAITING_STATUSES.includes(status.status) ? 'waiting' : 'downloading')
  }, [dispatch, runTranslation, store, updatePhase])

  useEffect(() => store.subscribe(checkDownload), [checkDownload, store])

  const startTranslate = useCallback(
    (source, target) => {
      runIdRef.current += 1
      abortRef.current?.abort()
      setError(null)
      setText('')
      setSummary(null)
      setSourceLanguage(source)
      setTargetLanguage(target)
      setDownloadProgress(EMPTY_PROGRESS)
      translateRequestRef.current = null
      downloadNamesRef.current = []
      if (paragraphs.length === 0) {
        setError('empty')
        updatePhase('error')
        return
      }
      if (!target) {
        updatePhase('choose')
        return
      }
      translateRequestRef.current = { source, target }
      downloadNamesRef.current = getTranslationModelNames(source, target)
      updatePhase('downloading')
      dispatch(setLocalAiTranslationTarget(target))
      dispatch(downloadLocalAiModels({ names: downloadNamesRef.current }))
      checkDownload()
    },
    [checkDownload, dispatch, paragraphs, updatePhase]
  )

  const beginTranslate = useCallback(() => {
    const source = detectTextLanguage(paragraphs.join('\n')) ?? TRANSLATION_SOURCE_LANGUAGE
    startTranslate(
      source,
      pickTranslationTarget({ source, lastTarget, deviceLanguage: getDeviceLanguage() })
    )
  }, [lastTarget, paragraphs, startTranslate])

  const runNoteTaskMode = useCallback(() => {
    const task = NOTE_TASK_BY_MODE[mode]
    if (!task) return
    const input = paragraphs.join('\n')
    setKeyPoints([])
    const tooLong = isRewriteTask(task) && input.length > REWRITE_MAX_CHARS
    if (input.trim().length < (scope === 'selection' ? 1 : NOTE_TASK_MIN_CHARS) || tooLong) {
      runIdRef.current += 1
      setSummary(null)
      setError(tooLong ? 'tooLong' : 'empty')
      updatePhase('error')
      return
    }
    const workOptions = {
      input,
      targetRatio: mode === 'makeShorter' ? WORK_SHORTER_TARGET_RATIO : 1
    }
    run(async (signal, runId, onProgress) => {
      const output = await runNoteTask(task, input, summaryConfig ?? {}, { onProgress })
      if (mode === 'summarizeNote') {
        const parsed = parseSummaryOutput(output)
        if (!parsed.summary && parsed.actionItems.length === 0) return ''
        if (runId === runIdRef.current) setSummary(parsed)
        return [parsed.summary, ...parsed.actionItems.map((item) => `• ${item}`)]
          .filter(Boolean)
          .join('\n')
      }
      if (mode === 'keyPoints') {
        const points = parseKeyPointsOutput(output)
        if (runId === runIdRef.current) setKeyPoints(points)
        return points.map((point) => `• ${point}`).join('\n')
      }
      return isRewriteTask(task) ? output : parseTitleOutput(output)
    }, 'failed', isRewriteTask(task) ? WORK_KIND.REWRITE : WORK_KIND.NOTE_TASK, workOptions)
  }, [mode, paragraphs, run, scope, summaryConfig, updatePhase])

  const handleRecord = useCallback(async () => {
    if (recorderRef.current || streamRef.current) return
    runIdRef.current += 1
    const runId = runIdRef.current
    setError(null)
    setText('')
    setElapsed(0)
    keepSavedAudio(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (runId !== runIdRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (event) => chunksRef.current.push(event.data)
      recorder.start()
      updatePhase('recording')
      const startedAt = Date.now()
      startedAtRef.current = startedAt
      timerRef.current = setInterval(() => setElapsed(Date.now() - startedAt), 200)
    } catch {
      releaseMic()
      if (runId !== runIdRef.current) return
      setError('micDenied')
      updatePhase('error')
    }
  }, [keepSavedAudio, releaseMic, updatePhase])

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

  const transcribeSavedAudio = useCallback(() => {
    const saved = savedAudioRef.current
    if (!saved) return
    run(
      async (signal, runId, onProgress) => {
        onProgress({ type: WORK_EVENT.STEP, step: WORK_STEP.PREPARE_AUDIO })
        const transcript = String(
          (await transcribePcm(
            await decodeAudioToPcm(await saved.blob.arrayBuffer()),
            feature,
            featureConfig ?? {},
            { onProgress }
          )) ?? ''
        ).trim()
        if (transcript && runId === runIdRef.current) keepSavedAudio(null)
        return transcript
      },
      'dictationFailed',
      WORK_KIND.TRANSCRIBE
    )
  }, [feature, featureConfig, keepSavedAudio, run])

  const handleStop = useCallback(async () => {
    const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000)
    const blob = await stopRecorder()
    if (!blob || blob.size === 0) {
      setError('failed')
      updatePhase('error')
      return
    }
    keepSavedAudio({ blob, durationSeconds })
    transcribeSavedAudio()
  }, [keepSavedAudio, stopRecorder, transcribeSavedAudio, updatePhase])

  const handleAttachAudio = useCallback(() => {
    const saved = savedAudioRef.current
    if (!saved || !onAttachAudio) return
    runIdRef.current += 1
    keepSavedAudio(null)
    updatePhase('idle')
    onAttachAudio(saved.blob, saved.durationSeconds)
  }, [keepSavedAudio, onAttachAudio, updatePhase])

  useEffect(() => {
    if (!request) return
    setText('')
    setError(null)
    setElapsed(0)
    if (request.mode === 'dictate') {
      handleRecord()
    } else if (request.mode === 'translate') {
      beginTranslate()
    } else if (NOTE_TASK_BY_MODE[request.mode]) {
      runNoteTaskMode()
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

  const handleChooseTarget = useCallback(
    (language) => {
      if (!sourceLanguage || !language || language === sourceLanguage) return
      if (phaseRef.current === 'working') return
      startTranslate(sourceLanguage, language)
    },
    [sourceLanguage, startTranslate]
  )

  const handleChooseSource = useCallback(
    (language) => {
      if (!language || language === sourceLanguage || phaseRef.current === 'working') return
      const target =
        targetLanguage && targetLanguage !== language
          ? targetLanguage
          : pickTranslationTarget({ source: language, lastTarget, deviceLanguage: getDeviceLanguage() })
      startTranslate(language, target)
    },
    [lastTarget, sourceLanguage, startTranslate, targetLanguage]
  )

  const handleDownloadNow = useCallback(() => {
    for (const name of downloadNamesRef.current) dispatch(downloadLocalAiModelNow({ name }))
  }, [dispatch])

  const handleAgain = useCallback(() => {
    if (mode === 'dictate') handleRecord()
    else if (mode === 'translate') {
      if (sourceLanguage) startTranslate(sourceLanguage, targetLanguage)
      else beginTranslate()
    } else if (NOTE_TASK_BY_MODE[mode]) runNoteTaskMode()
    else processSource()
  }, [
    beginTranslate,
    handleRecord,
    mode,
    processSource,
    runNoteTaskMode,
    sourceLanguage,
    startTranslate,
    targetLanguage
  ])

  const handleSummarize = useCallback(async () => {
    if (!text || summaryPhaseRef.current === 'working') return
    const runId = runIdRef.current
    updateSummaryPhase('working')
    try {
      const parsed = parseSummaryOutput(await summarizeTranscript(text, summaryConfig ?? {}))
      if (runId !== runIdRef.current) return
      if (!parsed.summary && parsed.actionItems.length === 0) {
        updateSummaryPhase('failed')
        return
      }
      setSummary(parsed)
      updateSummaryPhase('idle')
    } catch {
      if (runId !== runIdRef.current) return
      updateSummaryPhase('failed')
    }
  }, [summaryConfig, text, updateSummaryPhase])

  const handleClose = useCallback(async () => {
    runIdRef.current += 1
    abortRef.current?.abort()
    if (phaseRef.current === 'recording') await stopRecorder()
    if (phaseRef.current === 'working' || summaryPhaseRef.current === 'working') {
      cancelLocalAiTask().catch(() => {})
    }
    translateRequestRef.current = null
    downloadNamesRef.current = []
    keepSavedAudio(null)
    updatePhase('idle')
    updateSummaryPhase('idle')
    onClose()
  }, [keepSavedAudio, onClose, stopRecorder, updatePhase, updateSummaryPhase])

  useEffect(() => {
    if (phase !== 'working') endWork()
  }, [endWork, phase])

  const isRewrite = isRewriteTask(NOTE_TASK_BY_MODE[mode])
  const rewriteDiff = useMemo(
    () =>
      phase === 'preview' && scope === 'selection' && isRewrite && text
        ? diffRewriteText(paragraphs.join('\n'), text)
        : null,
    [isRewrite, paragraphs, phase, scope, text]
  )

  const handleInsert = useCallback(
    (action = 'insert') => {
      if (phaseRef.current !== 'preview' || !text || summaryPhaseRef.current === 'working') return
      updatePhase('idle')
      onInsert(text, mode, summary, {
        language: mode === 'translate' ? targetLanguage : null,
        bullets: mode === 'keyPoints' ? keyPoints : [],
        action
      })
    },
    [keyPoints, mode, onInsert, summary, targetLanguage, text, updatePhase]
  )

  return {
    mode,
    phase,
    error,
    text,
    elapsed,
    workView,
    summary,
    summaryPhase,
    sourceLanguage,
    targetLanguage,
    scope,
    canReplace: scope === 'selection' && (mode === 'translate' || isRewrite),
    isRewrite,
    rewriteDiff,
    translateLanguages: TRANSLATION_ALL_LANGUAGES,
    downloadProgress,
    noSpaceBytes,
    handleChooseTarget,
    handleChooseSource,
    handleDownloadNow,
    handleRecord,
    handleStop,
    handleAgain,
    handleSummarize,
    handleClose,
    handleInsert,
    hasSavedAudio: !!savedAudio,
    canAttachAudio: !!savedAudio && !!onAttachAudio,
    handleRetrySavedAudio: transcribeSavedAudio,
    handleAttachAudio
  }
}
