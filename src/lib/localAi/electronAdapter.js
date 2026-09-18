import { METERED_CONNECTION_KEY } from '@pear-notes/core/constant.js'
import {
  LOCAL_AI_DEVICE_STATUS,
  LOCAL_AI_ERROR,
  LOCAL_AI_NETWORK,
  LOCAL_AI_UNSUPPORTED_REASON
} from '@pear-notes/core/store/services/localAiCatalog.js'
import { getMediaSyncFlag } from '@pear-notes/core/utils.js'

export class LocalAiError extends Error {
  constructor(code, message) {
    super(message ?? code)
    this.code = code
  }
}

let downloadCounter = 0
let taskCounter = 0

function getBridge() {
  return typeof window !== 'undefined' ? window.electronBridge : null
}

async function invoke(method, payload, fallbackCode = LOCAL_AI_ERROR.TASK_FAILED) {
  const bridge = getBridge()
  if (typeof bridge?.[method] !== 'function') throw new LocalAiError(LOCAL_AI_ERROR.MODEL_MISSING)
  const result = await bridge[method](payload)
  if (!result?.ok) throw new LocalAiError(result?.code ?? fallbackCode, result?.message)
  return result
}

async function invokeWithProgress(method, payload, onProgress) {
  taskCounter += 1
  const taskId = `local-ai-task-${Date.now()}-${taskCounter}`
  const unsubscribe = onProgress
    ? getBridge()?.onLocalAiTaskProgress?.((progress) => {
        if (progress?.taskId === taskId) onProgress(progress)
      })
    : null
  try {
    return await invoke(method, { ...payload, taskId })
  } finally {
    unsubscribe?.()
  }
}

async function getDeviceSupport() {
  if (typeof getBridge()?.localAiGetDeviceSupport !== 'function') {
    return {
      status: LOCAL_AI_DEVICE_STATUS.UNSUPPORTED,
      reason: LOCAL_AI_UNSUPPORTED_REASON.STORE_BUILD,
      totalMemoryBytes: 0,
      freeDiskBytes: 0
    }
  }
  const { support } = await invoke('localAiGetDeviceSupport')
  return support
}

export async function getLocalAiNetworkKind() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return LOCAL_AI_NETWORK.OFFLINE
  try {
    if (await getMediaSyncFlag(METERED_CONNECTION_KEY)) return LOCAL_AI_NETWORK.METERED
  } catch {
    return LOCAL_AI_NETWORK.OTHER
  }
  return LOCAL_AI_NETWORK.OTHER
}

async function getDiskSpace() {
  const { disk } = await invoke('localAiGetDiskSpace')
  return disk
}

function download(name, { onProgress } = {}) {
  downloadCounter += 1
  const requestId = `local-ai-download-${Date.now()}-${downloadCounter}`
  const unsubscribe = getBridge()?.onLocalAiDownloadProgress?.((progress) => {
    if (progress?.requestId !== requestId) return
    onProgress?.({ downloadedBytes: progress.downloadedBytes, totalBytes: progress.totalBytes })
  })
  const done = invoke('localAiDownload', { requestId, name }, LOCAL_AI_ERROR.DOWNLOAD_FAILED)
    .then((result) => ({ bytes: result.bytes ?? 0 }))
    .finally(() => unsubscribe?.())
  return { requestId, done }
}

async function cancel(requestId, { discard = false } = {}) {
  await invoke('localAiCancel', { requestId, discard })
}

async function deleteModel(name) {
  await invoke('localAiDeleteModel', { name })
}

async function closeAndWipe() {
  await invoke('localAiCloseAndWipe')
}

export async function transcribePcm(pcm, feature, featureConfig, { onProgress } = {}) {
  const { text } = await invokeWithProgress(
    'localAiTranscribe',
    { pcm, feature, featureConfig },
    onProgress
  )
  return text
}

export async function extractTextFromImage(image, { onProgress } = {}) {
  const { text } = await invokeWithProgress('localAiExtractText', { image }, onProgress)
  return text
}

export async function describeImage(image, extension, { onProgress } = {}) {
  const { text } = await invokeWithProgress('localAiDescribeImage', { image, extension }, onProgress)
  return text
}

export async function runNoteTask(task, input, featureConfig = {}, { onProgress } = {}) {
  const { text } = await invokeWithProgress(
    'localAiSummarize',
    { text: input, task, featureConfig },
    onProgress
  )
  return text
}

export const summarizeTranscript = (transcript, featureConfig = {}) =>
  runNoteTask('transcriptSummary', transcript, featureConfig)

export async function translateParagraphs(paragraphs, from, to, { onProgress } = {}) {
  const { translations } = await invokeWithProgress(
    'localAiTranslate',
    { paragraphs, from, to },
    onProgress
  )
  return Array.isArray(translations) ? translations : []
}

export async function askAboutNote(note, turns, question, featureConfig = {}, { onProgress } = {}) {
  const { text } = await invokeWithProgress(
    'localAiAsk',
    { note, turns, question, featureConfig },
    onProgress
  )
  return text
}

export async function cancelLocalAiTask() {
  await invoke('localAiCancelTask')
}

export const electronAdapter = {
  getDeviceSupport,
  getNetworkKind: getLocalAiNetworkKind,
  getDiskSpace,
  download,
  cancel,
  deleteModel,
  closeAndWipe
}
