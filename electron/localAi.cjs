const { AsyncLocalStorage } = require('async_hooks')
const { ipcMain, nativeImage, powerMonitor } = require('electron')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { pathToFileURL } = require('url')

const RUNTIME_DIR = path.join(__dirname, '..', 'local-ai')
const RUNTIME_MODULES = path.join(RUNTIME_DIR, 'node_modules')
const SDK_ENTRY = path.join(RUNTIME_MODULES, '@qvac', 'sdk', 'dist', 'src', 'index.js')
const WORKER_ENTRY = path.join(RUNTIME_DIR, 'qvac', 'worker.entry.mjs')
const MODELS_DIR_NAME = 'models'
const RUNTIME_CONFIG_NAME = 'qvac.config.json'
const PCM_FILE_PREFIX = 'pear-notes-local-ai-'
const PCM_FILE_EXTENSION = '.raw'
const MIN_DARWIN_MAJOR = 23
const INTERRUPT_WINDOW_MS = 60 * 1000
const WHISPER_AUDIO_FORMAT = 's16le'
const PARAKEET_ENGINE = 'parakeet'
const IMAGE_FILE_PREFIX = 'pear-notes-local-ai-image-'
const IMAGE_EXTENSION_PATTERN = /^[a-z0-9]{2,5}$/i
const DEFAULT_IMAGE_EXTENSION = 'png'
const RESIZED_IMAGE_QUALITY = 90
const OCR_MAG_RATIO = 1
const OCR_CANVAS_SIZE = 1600
const PCM_SAMPLE_RATE = 16000
const PCM_BYTES_PER_SAMPLE = 2
const TRANSLATE_BATCH_PARAGRAPHS = 8
const TASK_PROGRESS_CHANNEL = 'local-ai:task-progress'
const LIVE_TEXT_CHANNEL = 'local-ai:live-text'

let options = null
let catalogPromise = null
let promptsPromise = null
let textPromise = null
let workPromise = null
let tiersPromise = null
let sdkPromise = null
let loadedModel = null
let loadedEmbedding = null
let embedInFlight = null
let systemSuspended = false
let lastResumeAt = 0
let pcmCounter = 0
const pendingDownloads = new Map()
const liveSessions = new Map()

class LocalAiError extends Error {
  constructor(code, message) {
    super(message ?? code)
    this.code = code
  }
}

function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = import('@pear-notes/core/store/services/localAiCatalog.js').then((catalog) => {
      catalog.configureLocalAiDevice({ platform: process.platform, totalMemoryBytes: os.totalmem() })
      return catalog
    })
  }
  return catalogPromise
}

function loadWork() {
  if (!workPromise) workPromise = import('@pear-notes/core/store/services/localAiWorkProgress.js')
  return workPromise
}

function progressSender(event, taskId) {
  return (payload) => {
    if (!taskId || event.sender.isDestroyed()) return
    event.sender.send(TASK_PROGRESS_CHANNEL, { taskId, ...payload })
  }
}

function joinTranscript(current, next) {
  const piece = String(next ?? '').trim()
  if (!piece) return current
  return current ? `${current} ${piece}` : piece
}

const completionsInFlight = new Set()

const taskContext = new AsyncLocalStorage()
const taskRequests = new Map()
const cancelledTasks = new Set()
const modelUsers = new Map()
const MODEL_RELEASE_WAIT_MS = 60 * 1000
let anonymousTask = 0

function trackCompletion(sdk, params, onText, finish, stopWhen) {
  const taskId = taskContext.getStore()?.taskId
  if (taskId && cancelledTasks.has(taskId)) return Promise.reject(new Error('cancelled'))
  const work = (async () => {
    const run = sdk.completion({ ...params, stream: true })
    if (taskId && run.requestId) {
      if (!taskRequests.has(taskId)) taskRequests.set(taskId, new Set())
      taskRequests.get(taskId).add(run.requestId)
    }
    let streamed = ''
    for await (const event of run.events) {
      if (event.type !== 'contentDelta') continue
      streamed += event.text
      onText(streamed)
      if (stopWhen?.(streamed)) {
        await sdk.cancel({ requestId: run.requestId }).catch(() => {})
        await run.final.catch(() => {})
        if (taskId && cancelledTasks.has(taskId)) throw new Error('cancelled')
        return finish({ contentText: streamed })
      }
    }
    return finish(await run.final)
  })()
  completionsInFlight.add(work)
  work.then(
    () => completionsInFlight.delete(work),
    () => completionsInFlight.delete(work)
  )
  return work
}

function streamCompletion(sdk, params, onText, stopWhen) {
  return trackCompletion(sdk, params, onText, (final) => final.contentText, stopWhen)
}

function toolStep(sdk, params) {
  return trackCompletion(
    sdk,
    params,
    () => {},
    (final) => {
      const text = String(final.contentText ?? '')
      const toolCalls = params.tools ? (final.toolCalls ?? []) : []
      return {
        text,
        toolCalls: toolCalls.map(({ name, arguments: args }) => ({ name, arguments: args }))
      }
    }
  )
}

function loadText() {
  if (!textPromise) textPromise = import('@pear-notes/core/store/services/localAiText.js')
  return textPromise
}

function loadPrompts() {
  if (!promptsPromise) promptsPromise = import('@pear-notes/core/store/services/localAiPrompts.js')
  return promptsPromise
}

function getLocalAiRoot(storagePath) {
  return path.join(path.dirname(storagePath), `${path.basename(storagePath)}-local-ai`)
}

function getRuntimeRoot() {
  return getLocalAiRoot(options.getStoragePath())
}

function getModelsDir() {
  return path.join(getRuntimeRoot(), MODELS_DIR_NAME)
}

function isRuntimeHostInstalled() {
  const hostPackage = `bare-runtime-${process.platform}-${process.arch}`
  return [
    path.join(RUNTIME_MODULES, hostPackage),
    path.join(RUNTIME_MODULES, 'bare-runtime', 'node_modules', hostPackage)
  ].some((candidate) => fs.existsSync(candidate))
}

function getUnsupportedReason(catalog) {
  const reasons = catalog.LOCAL_AI_UNSUPPORTED_REASON
  if (!fs.existsSync(SDK_ENTRY)) return reasons.STORE_BUILD
  if (!isRuntimeHostInstalled()) return reasons.ARCHITECTURE
  if (process.platform === 'darwin' && Number.parseInt(os.release(), 10) < MIN_DARWIN_MAJOR) {
    return reasons.OS_VERSION
  }
  return null
}

async function getDiskSpace() {
  const root = getRuntimeRoot()
  try {
    const stats = await fs.promises.statfs(fs.existsSync(root) ? root : path.dirname(root))
    return { freeBytes: stats.bavail * stats.bsize, totalBytes: stats.blocks * stats.bsize }
  } catch {
    return { freeBytes: 0, totalBytes: 0 }
  }
}

async function getDeviceSupport() {
  const catalog = await loadCatalog()
  const totalMemoryBytes = os.totalmem()
  const disk = await getDiskSpace()
  const reason = getUnsupportedReason(catalog)
  const statuses = catalog.LOCAL_AI_DEVICE_STATUS
  const status = reason
    ? statuses.UNSUPPORTED
    : totalMemoryBytes < catalog.LOCAL_AI_LIMITED_MEMORY_BYTES
      ? statuses.LIMITED
      : statuses.SUPPORTED
  return {
    status,
    reason,
    totalMemoryBytes,
    freeDiskBytes: disk.freeBytes,
    platform: process.platform
  }
}

function loadSdk() {
  if (!sdkPromise) {
    const pending = (async () => {
      if (!fs.existsSync(SDK_ENTRY)) {
        const { LOCAL_AI_ERROR } = await loadCatalog()
        throw new LocalAiError(LOCAL_AI_ERROR.MODEL_MISSING)
      }
      const modelsDir = getModelsDir()
      await fs.promises.mkdir(modelsDir, { recursive: true })
      await removeRetiredModelFiles(modelsDir)
      process.env.QVAC_HOME_DIR = getRuntimeRoot()
      await removeAskCacheFiles()
      const configPath = path.join(getRuntimeRoot(), RUNTIME_CONFIG_NAME)
      await fs.promises.writeFile(configPath, JSON.stringify({ cacheDirectory: modelsDir }))
      process.env.QVAC_CONFIG_PATH = configPath
      if (fs.existsSync(WORKER_ENTRY)) process.env.QVAC_WORKER_PATH = WORKER_ENTRY
      return import(pathToFileURL(SDK_ENTRY).href)
    })()
    sdkPromise = pending
    pending.catch(() => {
      if (sdkPromise === pending) sdkPromise = null
    })
  }
  return sdkPromise
}

const getAskCacheDir = () => path.join(getRuntimeRoot(), '.qvac', 'kv-cache')

function removeAskCacheFiles() {
  return fs.promises.rm(getAskCacheDir(), { recursive: true, force: true }).catch(() => {})
}

async function clearAskCache() {
  await Promise.allSettled([...completionsInFlight])
  if (loadedModel && sdkPromise) {
    const sdk = await sdkPromise.catch(() => null)
    await sdk?.deleteCache({ all: true }).catch(() => {})
  }
  await removeAskCacheFiles()
  return {}
}

async function removeRetiredModelFiles(modelsDir) {
  const { LOCAL_AI_RETIRED_MODEL_FILES } = await loadCatalog()
  await Promise.all(
    LOCAL_AI_RETIRED_MODEL_FILES.map(({ file }) =>
      fs.promises.rm(path.join(modelsDir, file), { force: true }).catch(() => {})
    )
  )
}

function registryAsset(sdk, catalog, name) {
  const asset = sdk[name]
  if (!asset) throw new LocalAiError(catalog.LOCAL_AI_ERROR.MODEL_MISSING)
  return asset
}

async function unloadCurrentModel(sdk) {
  const current = loadedModel
  loadedModel = null
  if (!current) return
  try {
    await sdk.unloadModel({ modelId: current.modelId })
  } catch {}
  await removeAskCacheFiles()
}

async function unloadEmbedding(sdk) {
  await embedInFlight?.catch(() => {})
  const current = loadedEmbedding
  loadedEmbedding = null
  if (!current) return
  try {
    await sdk.unloadModel({ modelId: current.modelId })
  } catch {}
}

async function unloadAllModels(sdk) {
  await unloadCurrentModel(sdk)
  await unloadEmbedding(sdk)
}

async function canKeepBoth(modelKey, embeddingName) {
  const catalog = await loadCatalog()
  return catalog.canRunModels([...modelKey.split('|'), embeddingName], os.totalmem())
}

const MODEL_IDLE_UNLOAD_MS = 2 * 60 * 1000
let activeModelWork = 0
let idleUnloadTimer = null

function clearIdleUnload() {
  if (idleUnloadTimer) clearTimeout(idleUnloadTimer)
  idleUnloadTimer = null
}

function beginModelWork() {
  activeModelWork += 1
  clearIdleUnload()
}

function endModelWork() {
  activeModelWork = Math.max(0, activeModelWork - 1)
  if (activeModelWork > 0) return
  idleUnloadTimer = setTimeout(() => {
    idleUnloadTimer = null
    if (activeModelWork === 0 && sdkPromise) sdkPromise.then(unloadAllModels).catch(() => {})
  }, MODEL_IDLE_UNLOAD_MS)
}

function withModelWork(handler) {
  return async (event, payload) => {
    beginModelWork()
    const taskId = payload?.taskId || `anonymous-${++anonymousTask}`
    try {
      return await taskContext.run({ taskId }, () => handler(event, payload))
    } finally {
      modelUsers.delete(taskId)
      taskRequests.delete(taskId)
      cancelledTasks.delete(taskId)
      endModelWork()
    }
  }
}

async function cancelTaskRun(event, { taskId } = {}) {
  if (typeof taskId !== 'string' || !taskId || !sdkPromise) return {}
  cancelledTasks.add(taskId)
  const sdk = await sdkPromise
  for (const requestId of taskRequests.get(taskId) ?? []) {
    await sdk.cancel({ requestId }).catch(() => {})
  }
  return {}
}

async function waitForModelRelease(key) {
  const self = taskContext.getStore()?.taskId
  const started = Date.now()
  const inUse = () => [...modelUsers].some(([taskId, used]) => used === key && taskId !== self)
  while (inUse() && Date.now() - started < MODEL_RELEASE_WAIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

async function ensureModelLoaded(sdk, key, load) {
  // No pre-emptive memory refusal: quality is the user's choice even on a
  // machine under the bar for it, and the settings row warns them.
  const taskId = taskContext.getStore()?.taskId
  const modelId =
    loadedModel?.key === key ? loadedModel.modelId : await withModelLock(() => switchModel(sdk, key, load))
  if (taskId) modelUsers.set(taskId, key)
  return modelId
}

let modelLock = Promise.resolve()

function withModelLock(work) {
  const run = modelLock.then(work)
  modelLock = run.catch(() => {})
  return run
}

async function switchModel(sdk, key, load) {
  if (loadedModel?.key === key) return loadedModel.modelId
  if (loadedModel) await waitForModelRelease(loadedModel.key)
  await Promise.allSettled([...completionsInFlight])
  await unloadCurrentModel(sdk)
  if (loadedEmbedding && !(await canKeepBoth(key, loadedEmbedding.key))) await unloadEmbedding(sdk)
  const modelId = await load()
  loadedModel = { key, modelId }
  return modelId
}

async function getDownloadedBytes(sdk, catalog, name) {
  try {
    const info = await sdk.getModelInfo({ name })
    const bytes = Number(info?.actualSize) || Number(info?.expectedSize)
    if (bytes > 0) return bytes
  } catch {}
  return catalog.LOCAL_AI_REGISTRY_MODELS[name]?.bytes ?? 0
}

async function download(event, { requestId, name }) {
  const pending = { sdkRequestId: null, cancelled: false, discard: false }
  pendingDownloads.set(requestId, pending)
  try {
    const [sdk, catalog] = await Promise.all([loadSdk(), loadCatalog()])
    const operation = sdk.downloadAsset({
      assetSrc: registryAsset(sdk, catalog, name),
      onProgress: (progress) => {
        if (event.sender.isDestroyed()) return
        event.sender.send('local-ai:download-progress', {
          requestId,
          downloadedBytes: progress.downloaded,
          totalBytes: progress.total
        })
      },
      requireSecureTransport: true,
      requireHttpChecksum: true
    })
    pending.sdkRequestId = operation.requestId
    if (pending.cancelled) {
      sdk.cancel({ requestId: operation.requestId, clearCache: pending.discard }).catch(() => {})
    }
    await operation
    return { bytes: await getDownloadedBytes(sdk, catalog, name) }
  } finally {
    pendingDownloads.delete(requestId)
  }
}

async function cancel(event, { requestId, discard = false }) {
  const pending = pendingDownloads.get(requestId)
  if (!pending) return {}
  pending.cancelled = true
  pending.discard = discard
  if (!pending.sdkRequestId || !sdkPromise) return {}
  const sdk = await sdkPromise
  await sdk.cancel({ requestId: pending.sdkRequestId, clearCache: discard })
  return {}
}

async function deleteModel(event, { name }) {
  const sdk = await loadSdk()
  await unloadAllModels(sdk)
  const info = await sdk.getModelInfo({ name })
  for (const cacheFile of info?.cacheFiles ?? []) {
    if (cacheFile?.path) await fs.promises.rm(cacheFile.path, { force: true })
  }
  return {}
}

async function closeAndWipe() {
  for (const pending of pendingDownloads.values()) pending.cancelled = true
  const pendingSdk = sdkPromise
  sdkPromise = null
  if (pendingSdk) {
    try {
      const sdk = await pendingSdk
      await unloadAllModels(sdk)
      await sdk.close()
    } catch {}
  }
  loadedModel = null
  loadedEmbedding = null
  pendingDownloads.clear()
  if (options) await fs.promises.rm(getRuntimeRoot(), { recursive: true, force: true })
  return {}
}

function loadSpeechModel(sdk, catalog, feature, featureConfig) {
  const names = catalog.getFeatureRegistryNames(feature, featureConfig)
  const [modelName, vadName] = names
  return ensureModelLoaded(sdk, names.join('|'), () => {
    if (catalog.LOCAL_AI_REGISTRY_MODELS[modelName]?.engine === PARAKEET_ENGINE) {
      return sdk.loadModel({ modelSrc: registryAsset(sdk, catalog, modelName), modelType: PARAKEET_ENGINE })
    }
    const englishOnly = featureConfig.language === catalog.LOCAL_AI_LANGUAGE.ENGLISH
    return sdk.loadModel({
      modelSrc: registryAsset(sdk, catalog, modelName),
      modelType: 'whisper',
      modelConfig: {
        vadModelSrc: registryAsset(sdk, catalog, vadName),
        audio_format: WHISPER_AUDIO_FORMAT,
        ...(englishOnly ? { language: catalog.LOCAL_AI_LANGUAGE.ENGLISH } : {})
      }
    })
  })
}

async function transcribeWithPosition(sdk, modelId, audioPath, totalMs, send, work) {
  let transcript = ''
  let received = false
  try {
    for await (const segment of sdk.transcribeStream({ modelId, audioChunk: audioPath, metadata: true })) {
      received = true
      transcript = joinTranscript(transcript, segment?.text)
      send({ type: work.WORK_EVENT.TEXT, text: transcript })
      if (Number(segment?.endMs) > 0) {
        send({ type: work.WORK_EVENT.POSITION, doneMs: Number(segment.endMs), totalMs })
      }
    }
  } catch (error) {
    if (received) throw error
    return String((await sdk.transcribe({ modelId, audioChunk: audioPath })) ?? '').trim()
  }
  return transcript.trim()
}

async function transcribe(event, { pcm, feature, featureConfig, taskId }) {
  const [sdk, catalog, work] = await Promise.all([loadSdk(), loadCatalog(), loadWork()])
  const send = progressSender(event, taskId)
  const config = featureConfig ?? {}
  const [modelName] = catalog.getFeatureRegistryNames(feature, config)
  send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.LOAD_MODEL, model: modelName })
  const modelId = await loadSpeechModel(sdk, catalog, feature, config)
  send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.TRANSCRIBE })
  pcmCounter += 1
  const pcmPath = path.join(
    os.tmpdir(),
    `${PCM_FILE_PREFIX}${process.pid}-${pcmCounter}${PCM_FILE_EXTENSION}`
  )
  try {
    const bytes = Buffer.from(pcm)
    await fs.promises.writeFile(pcmPath, bytes)
    if (catalog.LOCAL_AI_REGISTRY_MODELS[modelName]?.engine === PARAKEET_ENGINE) {
      const text = await sdk.transcribe({ modelId, audioChunk: pcmPath })
      return { text: String(text ?? '').trim() }
    }
    const totalMs = Math.round((bytes.length / (PCM_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE)) * 1000)
    return { text: await transcribeWithPosition(sdk, modelId, pcmPath, totalMs, send, work) }
  } finally {
    await fs.promises.rm(pcmPath, { force: true })
  }
}

function streamItemText(item) {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object' && item.type === 'text') return String(item.text ?? '')
  return ''
}

function closeLiveSession(sessionId, { destroy }) {
  const entry = liveSessions.get(sessionId)
  if (!entry) return null
  liveSessions.delete(sessionId)
  entry.sender.removeListener('destroyed', entry.onSenderGone)
  try {
    if (destroy) entry.session.destroy()
    else entry.session.end()
  } catch {}
  endModelWork()
  return entry
}

async function liveStart(event, { sessionId, feature, featureConfig }) {
  if (!sessionId || liveSessions.has(sessionId)) throw new Error('invalid live session')
  beginModelWork()
  let started = false
  try {
    const [sdk, catalog] = await Promise.all([loadSdk(), loadCatalog()])
    const config = featureConfig ?? {}
    const modelId = await loadSpeechModel(sdk, catalog, feature, config)
    const [modelName] = catalog.getFeatureRegistryNames(feature, config)
    const isParakeet = catalog.LOCAL_AI_REGISTRY_MODELS[modelName]?.engine === PARAKEET_ENGINE
    const session = await sdk.transcribeStream({
      modelId,
      ...(isParakeet ? { parakeetStreamingConfig: {} } : {})
    })
    const sender = event.sender
    const entry = { session, sender, transcript: '', reading: null, onSenderGone: null }
    entry.onSenderGone = () => closeLiveSession(sessionId, { destroy: true })
    sender.once('destroyed', entry.onSenderGone)
    entry.reading = (async () => {
      for await (const item of session) {
        const next = joinTranscript(entry.transcript, streamItemText(item))
        if (next === entry.transcript) continue
        entry.transcript = next
        if (!sender.isDestroyed()) sender.send(LIVE_TEXT_CHANNEL, { sessionId, text: next })
      }
    })().catch(() => {})
    liveSessions.set(sessionId, entry)
    started = true
    return {}
  } finally {
    if (!started) endModelWork()
  }
}

function liveChunk(event, { sessionId, pcm }) {
  const entry = liveSessions.get(sessionId)
  if (!entry || !pcm) return
  try {
    entry.session.write(Buffer.from(pcm))
  } catch {}
}

async function liveStop(event, { sessionId }) {
  const entry = closeLiveSession(sessionId, { destroy: false })
  if (!entry) return { text: '' }
  await entry.reading
  return { text: entry.transcript.trim() }
}

async function liveCancel(event, { sessionId }) {
  closeLiveSession(sessionId, { destroy: true })
  return {}
}

async function extractText(event, { image, extension, featureConfig = {}, taskId }) {
  const catalog = await loadCatalog()
  const names = catalog.getFeatureRegistryNames(catalog.LOCAL_AI_FEATURE.EXTRACT_TEXT, featureConfig)
  return catalog.isOcrModel(names[0])
    ? ocrImageText(event, { image, extension, names, taskId })
    : readImageTextWithVision(event, { image, extension, featureConfig, taskId })
}

async function ocrImageText(event, { image, extension, names: [recognizerName, detectorName], taskId }) {
  const [sdk, catalog, prompts, text, work] = await Promise.all([
    loadSdk(),
    loadCatalog(),
    loadPrompts(),
    loadText(),
    loadWork()
  ])
  const send = progressSender(event, taskId)
  send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.LOAD_MODEL, model: recognizerName })
  const modelId = await ensureModelLoaded(sdk, `${recognizerName}|${detectorName}|desktop`, () =>
    sdk.loadModel({
      modelSrc: registryAsset(sdk, catalog, recognizerName),
      modelType: 'ocr',
      modelConfig: {
        detectorModelSrc: registryAsset(sdk, catalog, detectorName),
        langList: catalog.LOCAL_AI_OCR_LANGUAGES,
        magRatio: OCR_MAG_RATIO,
        canvasSize: OCR_CANVAS_SIZE,
        defaultRotationAngles: [],
        backendDevice: process.platform === 'darwin' ? 'metal' : 'cpu'
      }
    })
  )
  send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.READ_TEXT })
  const images = await writeTempImages(image, extension, { maxSide: prompts.EXTRACT_IMAGE_MAX_SIDE })
  try {
    const { blockStream } = sdk.ocr({ modelId, image: images.inputs[0], stream: true })
    const found = []
    let extracted = ''
    for await (const chunk of blockStream) {
      found.push(...chunk)
      extracted = text.formatOcrBlocks(found)
      send({ type: work.WORK_EVENT.TEXT, text: extracted })
    }
    return { text: extracted }
  } finally {
    await removeTempImages(images.files)
  }
}

async function readImageTextWithVision(event, { image, extension, featureConfig, taskId }) {
  const [sdk, catalog, prompts, work] = await Promise.all([
    loadSdk(),
    loadCatalog(),
    loadPrompts(),
    loadWork()
  ])
  const send = progressSender(event, taskId)
  const [modelName] = catalog.getFeatureRegistryNames(
    catalog.LOCAL_AI_FEATURE.EXTRACT_TEXT,
    featureConfig
  )
  send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.LOAD_MODEL, model: modelName })
  const modelId = await loadLlmFeature(
    sdk,
    catalog,
    prompts,
    catalog.LOCAL_AI_FEATURE.EXTRACT_TEXT,
    featureConfig
  )
  send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.READ_TEXT })
  const images = await writeTempImages(image, extension, {
    maxSide: prompts.EXTRACT_IMAGE_MAX_SIDE,
    planSlices: (size) => prompts.planTextSlices(size.width, size.height),
    sliceSide: prompts.EXTRACT_SLICE_MAX_SIDE
  })
  try {
    const text = await prompts.readImageTextSlices(
      images.inputs,
      (imagePath, params, onStreamed) =>
        streamCompletion(
          sdk,
          {
            modelId,
            history: [
              {
                role: 'user',
                content: prompts.EXTRACT_TEXT_PROMPT,
                attachments: [{ path: imagePath }]
              }
            ],
            generationParams: {
              temp: 0,
              predict: prompts.EXTRACT_TEXT_MAX_TOKENS,
              ...prompts.VISION_GENERATION_PARAMS,
              ...params
            }
          },
          () => {},
          onStreamed
        ),
      (partial) => send({ type: work.WORK_EVENT.TEXT, text: partial })
    )
    return { text }
  } finally {
    await removeTempImages(images.files)
  }
}

function nextTempImagePath(extension) {
  pcmCounter += 1
  return path.join(os.tmpdir(), `${IMAGE_FILE_PREFIX}${process.pid}-${pcmCounter}.${extension}`)
}

const wholeImage = (size) => [{ originX: 0, originY: 0, ...size }]

async function writeTempImages(image, extension, { maxSide, planSlices = wholeImage, sliceSide }) {
  const original = await writeTempImage(image, extension)
  const files = [original]
  try {
    const picture = nativeImage.createFromPath(original)
    if (picture.isEmpty()) return { inputs: [original], files }
    const size = picture.getSize()
    const slices = planSlices(size)
    if (slices.length === 1 && Math.max(size.width, size.height) <= maxSide) {
      return { inputs: [original], files }
    }
    for (const { originX, originY, width, height } of slices) {
      const cropped =
        slices.length === 1 ? picture : picture.crop({ x: originX, y: originY, width, height })
      const side = slices.length === 1 ? maxSide : sliceSide
      const scale = Math.min(1, side / Math.max(width, height))
      const scaled =
        scale < 1
          ? cropped.resize({
              width: Math.round(width * scale),
              height: Math.round(height * scale),
              quality: 'best'
            })
          : cropped
      const target = nextTempImagePath('jpg')
      files.push(target)
      await fs.promises.writeFile(target, scaled.toJPEG(RESIZED_IMAGE_QUALITY))
    }
    return { inputs: files.slice(1), files }
  } catch {
    await removeTempImages(files.slice(1))
    return { inputs: [original], files: [original] }
  }
}

async function removeTempImages(paths) {
  await Promise.all([...new Set(paths)].map((file) => fs.promises.rm(file, { force: true })))
}

async function writeTempImage(image, extension) {
  const safeExtension = IMAGE_EXTENSION_PATTERN.test(extension ?? '') ? extension : DEFAULT_IMAGE_EXTENSION
  const imagePath = nextTempImagePath(safeExtension)
  await fs.promises.writeFile(imagePath, Buffer.from(image))
  return imagePath
}

async function resolveTextModelName(sdk, catalog, featureConfig, textTask, modelName) {
  if (textTask !== catalog.LOCAL_AI_TEXT_TASK.ASK) return modelName
  const fallback = catalog.getTextAskFallback(featureConfig)
  if (!fallback) return modelName
  const info = await sdk.getModelInfo({ name: modelName }).catch(() => null)
  return info?.isCached ? modelName : fallback
}

async function loadLlmFeature(sdk, catalog, prompts, feature, featureConfig = {}, textTask) {
  const [preferredName, projectionName] = catalog.getFeatureRegistryNames(
    feature,
    featureConfig,
    textTask
  )
  const modelName = await resolveTextModelName(sdk, catalog, featureConfig, textTask, preferredName)
  return ensureModelLoaded(sdk, [modelName, projectionName].filter(Boolean).join('|'), () =>
    sdk.loadModel({
      modelSrc: registryAsset(sdk, catalog, modelName),
      modelType: 'llm',
      modelConfig: {
        ctx_size: prompts.LLM_CONTEXT_SIZE,
        ...(catalog.isToolCallingModel(modelName) ? { tools: true } : {}),
        ...(projectionName
          ? {
              projectionModelSrc: registryAsset(sdk, catalog, projectionName),
              ...prompts.VISION_GENERATION_PARAMS
            }
          : {})
      }
    })
  )
}

async function describeImage(event, { image, extension, taskId }) {
  const [sdk, catalog, prompts, work] = await Promise.all([
    loadSdk(),
    loadCatalog(),
    loadPrompts(),
    loadWork()
  ])
  const send = progressSender(event, taskId)
  const [modelName] = catalog.getFeatureRegistryNames(catalog.LOCAL_AI_FEATURE.DESCRIBE_IMAGES, {})
  send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.LOAD_MODEL, model: modelName })
  const modelId = await loadLlmFeature(sdk, catalog, prompts, catalog.LOCAL_AI_FEATURE.DESCRIBE_IMAGES)
  send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.LOOK })
  const images = await writeTempImages(image, extension, {
    maxSide: prompts.DESCRIBE_IMAGE_MAX_SIDE
  })
  const [imagePath] = images.inputs
  try {
    const output = await streamCompletion(
      sdk,
      {
        modelId,
        history: [
          { role: 'user', content: prompts.DESCRIBE_IMAGE_PROMPT, attachments: [{ path: imagePath }] }
        ],
        generationParams: {
          temp: prompts.LLM_TEMPERATURE,
          predict: prompts.DESCRIBE_MAX_TOKENS,
          ...prompts.VISION_GENERATION_PARAMS
        }
      },
      (partial) =>
        send({ type: work.WORK_EVENT.TEXT, text: prompts.cleanImageDescription(partial) })
    )
    return { text: prompts.cleanImageDescription(output) }
  } finally {
    await removeTempImages(images.files)
  }
}

async function summarize(event, { text, task, featureConfig, taskId, styleSamples }) {
  const [sdk, catalog, prompts, work] = await Promise.all([
    loadSdk(),
    loadCatalog(),
    loadPrompts(),
    loadWork()
  ])
  const send = progressSender(event, taskId)
  const noteTask = prompts.isNoteTask(task) ? task : prompts.NOTE_TASK.TRANSCRIPT_SUMMARY
  const config = featureConfig && typeof featureConfig === 'object' ? featureConfig : {}
  const textTask = prompts.isWritingNoteTask(noteTask)
    ? catalog.LOCAL_AI_TEXT_TASK.WRITE
    : catalog.LOCAL_AI_TEXT_TASK.ASK
  const [modelName] = catalog.getFeatureRegistryNames(
    catalog.LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
    config,
    textTask
  )
  send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.LOAD_MODEL, model: modelName })
  const modelId = await loadLlmFeature(
    sdk,
    catalog,
    prompts,
    catalog.LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
    config,
    textTask
  )
  send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.READ_NOTE })
  if (prompts.isRewriteTask(noteTask)) {
    const writing = await import('@pear-notes/core/store/services/localAiWritingTools.js')
    const rewritten = await writing.runNoteRewrite({
      task: noteTask,
      text: String(text ?? ''),
      complete: (params, onText = () => {}) => streamCompletion(sdk, { modelId, ...params }, onText),
      onText: (partial) => send({ type: work.WORK_EVENT.TEXT, text: partial }),
      styleSamples: Array.isArray(styleSamples)
        ? styleSamples.filter((sample) => typeof sample === 'string').slice(0, 6)
        : []
    })
    return { text: rewritten }
  }
  const output = await streamCompletion(
    sdk,
    {
      modelId,
      history: prompts.buildNoteTaskMessages(noteTask, text),
      generationParams: prompts.getNoteTaskGenerationParams(noteTask)
    },
    (partial) => send({ type: work.WORK_EVENT.TEXT, text: partial })
  )
  return { text: prompts.cleanModelOutput(output) }
}

async function askAboutNote(event, { note, turns, question, featureConfig, taskId, cache }) {
  const [sdk, catalog, prompts, work, ask] = await Promise.all([
    loadSdk(),
    loadCatalog(),
    loadPrompts(),
    loadWork(),
    import('@pear-notes/core/store/services/localAiAsk.js')
  ])
  const send = progressSender(event, taskId)
  const config = featureConfig && typeof featureConfig === 'object' ? featureConfig : {}
  const [modelName] = catalog.getFeatureRegistryNames(
    catalog.LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
    config,
    catalog.LOCAL_AI_TEXT_TASK.ASK
  )
  send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.LOAD_MODEL, model: modelName })
  const modelId = await loadLlmFeature(
    sdk,
    catalog,
    prompts,
    catalog.LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
    config,
    catalog.LOCAL_AI_TEXT_TASK.ASK
  )
  send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.READ_NOTE })
  const text = await ask.runAsk({
    note: String(note ?? ''),
    turns: Array.isArray(turns) ? turns : [],
    question: String(question ?? ''),
    complete: (params, onText = () => {}) => streamCompletion(sdk, { modelId, ...params }, onText),
    onText: (answer) => send({ type: work.WORK_EVENT.TEXT, text: answer }),
    cache: cache === true
  })
  return { text }
}

const toVaultSource = (source) => ({
  n: Number(source?.n) || 0,
  noteKey: String(source?.noteKey ?? ''),
  title: String(source?.title ?? ''),
  heading: String(source?.heading ?? ''),
  text: String(source?.text ?? ''),
  score: typeof source?.score === 'number' ? source.score : null
})

async function askVault(event, { question, sources, turns, featureConfig, taskId }) {
  const [sdk, catalog, prompts, work, vaultAgent] = await Promise.all([
    loadSdk(),
    loadCatalog(),
    loadPrompts(),
    loadWork(),
    import('@pear-notes/core/store/services/localAiVaultAgent.js')
  ])
  const send = progressSender(event, taskId)
  const config = featureConfig && typeof featureConfig === 'object' ? featureConfig : {}
  const [modelName] = catalog.getFeatureRegistryNames(
    catalog.LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
    config,
    catalog.LOCAL_AI_TEXT_TASK.ASK
  )
  send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.LOAD_MODEL, model: modelName })
  const modelId = await loadLlmFeature(
    sdk,
    catalog,
    prompts,
    catalog.LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
    config,
    catalog.LOCAL_AI_TEXT_TASK.ASK
  )
  const loadedName = await resolveTextModelName(
    sdk,
    catalog,
    config,
    catalog.LOCAL_AI_TEXT_TASK.ASK,
    modelName
  )
  send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.READ_NOTE })
  return vaultAgent.runVaultAnswerOnHost({
    question: String(question ?? ''),
    sources: Array.isArray(sources) ? sources.map(toVaultSource) : [],
    turns: Array.isArray(turns) ? turns : [],
    modelName: loadedName,
    complete: (params, onText = () => {}) => streamCompletion(sdk, { modelId, ...params }, onText),
    step: ({ messages, tools, generationParams }) =>
      toolStep(sdk, { modelId, history: messages, tools, generationParams }),
    onText: (answer) => send({ type: work.WORK_EVENT.TEXT, text: answer })
  })
}

function loadTiers() {
  if (!tiersPromise) tiersPromise = import('@pear-notes/core/store/services/localAiTiers.js')
  return tiersPromise
}

async function embedTexts(event, { texts }) {
  const [sdk, catalog, tiers] = await Promise.all([loadSdk(), loadCatalog(), loadTiers()])
  const input = Array.isArray(texts) ? texts.map((text) => String(text ?? '')) : []
  if (input.length === 0) return { vectors: [] }
  const { model, modelConfig } = tiers.LOCAL_AI_EMBEDDING_MODEL
  return withModelLock(async () => {
    if (loadedEmbedding?.key !== model) {
      const info = await sdk.getModelInfo({ name: model }).catch(() => null)
      if (!info?.isCached) throw new LocalAiError(catalog.LOCAL_AI_ERROR.MODEL_MISSING)
      if (loadedModel && !(await canKeepBoth(loadedModel.key, model))) {
        if (activeModelWork > 1)
          throw new LocalAiError(catalog.LOCAL_AI_ERROR.TASK_FAILED, 'model busy')
        await unloadCurrentModel(sdk)
      }
      const embeddingId = await sdk.loadModel({
        modelSrc: registryAsset(sdk, catalog, model),
        modelType: 'embeddings',
        modelConfig
      })
      loadedEmbedding = { key: model, modelId: embeddingId }
    }
    const { modelId } = loadedEmbedding
    const run = sdk.embed({ modelId, text: input })
    embedInFlight = run
    try {
      const { embedding } = await run
      return { vectors: embedding.map((vector) => Float32Array.from(vector)) }
    } catch (error) {
      if (/(batch|context) overflow/i.test(String(error?.message ?? ''))) {
        throw new LocalAiError(catalog.LOCAL_AI_ERROR.INPUT_TOO_LONG, error.message)
      }
      throw error
    } finally {
      if (embedInFlight === run) embedInFlight = null
    }
  })
}

async function translateParagraphs(event, { paragraphs, from, to, taskId }) {
  const [sdk, catalog, translation, language, work] = await Promise.all([
    loadSdk(),
    loadCatalog(),
    import('@pear-notes/core/store/services/localAiTranslationModels.js'),
    import('@pear-notes/core/store/services/localAiLanguage.js'),
    loadWork()
  ])
  const send = progressSender(event, taskId)
  const steps = language.getTranslationSteps(from, to)
  let lines = Array.isArray(paragraphs) ? paragraphs.map((line) => String(line ?? '')) : []
  if (steps.length === 0 || lines.length === 0) {
    throw new LocalAiError(catalog.LOCAL_AI_ERROR.TASK_FAILED)
  }
  for (const [hopIndex, [stepFrom, stepTo]] of steps.entries()) {
    const modelName = translation.getTranslationModelName(stepFrom, stepTo)
    send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.LOAD_MODEL, model: modelName })
    const modelId = await ensureModelLoaded(sdk, `${modelName}|translate`, () =>
      sdk.loadModel({
        modelSrc: registryAsset(sdk, catalog, modelName),
        modelConfig: { engine: 'Bergamot', from: stepFrom, to: stepTo }
      })
    )
    send({ type: work.WORK_EVENT.STEP, step: work.WORK_STEP.TRANSLATE })
    const translated = []
    const reportParagraphs = () =>
      send({
        type: work.WORK_EVENT.PARAGRAPHS,
        done: translated.length,
        total: lines.length,
        hop: hopIndex + 1,
        hops: steps.length,
        from: stepFrom,
        to: stepTo
      })
    reportParagraphs()
    for (let start = 0; start < lines.length; start += TRANSLATE_BATCH_PARAGRAPHS) {
      const run = sdk.translate({
        modelId,
        text: lines.slice(start, start + TRANSLATE_BATCH_PARAGRAPHS),
        modelType: 'nmtcpp-translation',
        stream: false
      })
      translated.push(...(await run.translations).map((line) => String(line ?? '')))
      reportParagraphs()
      send({ type: work.WORK_EVENT.TEXT, text: translated.filter(Boolean).join('\n\n') })
    }
    lines = translated
  }
  return { translations: lines }
}

async function cancelTask() {
  if (!sdkPromise || !loadedModel) return {}
  const sdk = await sdkPromise
  await sdk.cancel({ modelId: loadedModel.modelId })
  return {}
}

function wasInterrupted() {
  return systemSuspended || Date.now() - lastResumeAt < INTERRUPT_WINDOW_MS
}

function handle(channel, fallbackCode, handler) {
  ipcMain.handle(channel, async (event, payload) => {
    try {
      return { ok: true, ...(await handler(event, payload ?? {})) }
    } catch (error) {
      const { LOCAL_AI_ERROR } = await loadCatalog()
      const code =
        error instanceof LocalAiError
          ? error.code
          : fallbackCode === LOCAL_AI_ERROR.DOWNLOAD_FAILED && wasInterrupted()
            ? LOCAL_AI_ERROR.INTERRUPTED
            : fallbackCode
      const message = error instanceof Error ? error.message : String(error)
      const cause = error?.cause?.message ?? (error?.cause ? String(error.cause) : '')
      console.error(`[local-ai] ${channel} failed: ${code} ${message}${cause ? ` | cause: ${cause}` : ''}`)
      return { ok: false, code, message }
    }
  })
}

function watchPower() {
  powerMonitor.on('suspend', () => {
    systemSuspended = true
    if (sdkPromise) sdkPromise.then(unloadAllModels).catch(() => {})
  })
  powerMonitor.on('resume', () => {
    systemSuspended = false
    lastResumeAt = Date.now()
  })
}

function setupLocalAi(setupOptions) {
  options = setupOptions
  handle('local-ai:device-support', 'TASK_FAILED', async () => ({ support: await getDeviceSupport() }))
  handle('local-ai:disk-space', 'TASK_FAILED', async () => ({ disk: await getDiskSpace() }))
  handle('local-ai:download', 'DOWNLOAD_FAILED', download)
  handle('local-ai:cancel', 'TASK_FAILED', cancel)
  handle('local-ai:delete-model', 'TASK_FAILED', deleteModel)
  handle('local-ai:close-and-wipe', 'TASK_FAILED', closeAndWipe)
  handle('local-ai:clear-ask-cache', 'TASK_FAILED', clearAskCache)
  handle('local-ai:transcribe', 'TASK_FAILED', withModelWork(transcribe))
  handle('local-ai:extract-text', 'TASK_FAILED', withModelWork(extractText))
  handle('local-ai:describe-image', 'TASK_FAILED', withModelWork(describeImage))
  handle('local-ai:summarize', 'TASK_FAILED', withModelWork(summarize))
  handle('local-ai:translate', 'TASK_FAILED', withModelWork(translateParagraphs))
  handle('local-ai:ask', 'TASK_FAILED', withModelWork(askAboutNote))
  handle('local-ai:ask-vault', 'TASK_FAILED', withModelWork(askVault))
  handle('local-ai:embed', 'TASK_FAILED', withModelWork(embedTexts))
  handle('local-ai:cancel-task', 'TASK_FAILED', cancelTask)
  handle('local-ai:cancel-task-run', 'TASK_FAILED', cancelTaskRun)
  handle('local-ai:power', 'TASK_FAILED', async () => ({
    onBattery: powerMonitor.isOnBatteryPower()
  }))
  handle('local-ai:live-start', 'TASK_FAILED', liveStart)
  handle('local-ai:live-stop', 'TASK_FAILED', liveStop)
  handle('local-ai:live-cancel', 'TASK_FAILED', liveCancel)
  ipcMain.on('local-ai:live-chunk', liveChunk)
  watchPower()
}

function shutdownLocalAi() {
  for (const sessionId of [...liveSessions.keys()]) closeLiveSession(sessionId, { destroy: true })
  clearIdleUnload()
  const pendingSdk = sdkPromise
  sdkPromise = null
  if (!pendingSdk) return
  pendingSdk.then((sdk) => sdk.close()).catch(() => {})
}

module.exports = { getLocalAiRoot, setupLocalAi, shutdownLocalAi }
