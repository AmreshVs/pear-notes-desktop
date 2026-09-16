const { ipcMain, powerMonitor } = require('electron')
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
const OCR_MAG_RATIO = 1
const OCR_CANVAS_SIZE = 1600
const WHISPER_AUDIO_FORMAT = 's16le'
const PARAKEET_ENGINE = 'parakeet'
const IMAGE_FILE_PREFIX = 'pear-notes-local-ai-image-'
const IMAGE_EXTENSION_PATTERN = /^[a-z0-9]{2,5}$/i
const DEFAULT_IMAGE_EXTENSION = 'png'

let options = null
let catalogPromise = null
let textPromise = null
let promptsPromise = null
let sdkPromise = null
let loadedModel = null
let systemSuspended = false
let lastResumeAt = 0
let pcmCounter = 0
const pendingDownloads = new Map()

class LocalAiError extends Error {
  constructor(code, message) {
    super(message ?? code)
    this.code = code
  }
}

function loadCatalog() {
  if (!catalogPromise) catalogPromise = import('@pear-notes/core/store/services/localAiCatalog.js')
  return catalogPromise
}

function loadText() {
  if (!textPromise) textPromise = import('@pear-notes/core/store/services/localAiText.js')
  return textPromise
}

function loadPrompts() {
  if (!promptsPromise) promptsPromise = import('@pear-notes/core/store/services/localAiPrompts.js')
  return promptsPromise
}

function getRuntimeRoot() {
  const storagePath = options.getStoragePath()
  return path.join(path.dirname(storagePath), `${path.basename(storagePath)}-local-ai`)
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
  return { status, reason, totalMemoryBytes, freeDiskBytes: disk.freeBytes }
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
}

const MODEL_IDLE_UNLOAD_MS = 2 * 60 * 1000
let activeModelWork = 0
let idleUnloadTimer = null

function clearIdleUnload() {
  if (idleUnloadTimer) clearTimeout(idleUnloadTimer)
  idleUnloadTimer = null
}

function withModelWork(handler) {
  return async (...args) => {
    activeModelWork += 1
    clearIdleUnload()
    try {
      return await handler(...args)
    } finally {
      activeModelWork = Math.max(0, activeModelWork - 1)
      if (activeModelWork === 0) {
        idleUnloadTimer = setTimeout(() => {
          idleUnloadTimer = null
          if (activeModelWork === 0 && sdkPromise) sdkPromise.then(unloadCurrentModel).catch(() => {})
        }, MODEL_IDLE_UNLOAD_MS)
      }
    }
  }
}

async function ensureModelLoaded(sdk, key, load) {
  const catalog = await loadCatalog()
  if (!catalog.canRunModels(key.split('|'), os.totalmem())) {
    throw new LocalAiError(catalog.LOCAL_AI_ERROR.NOT_ENOUGH_MEMORY)
  }
  if (loadedModel?.key === key) return loadedModel.modelId
  await unloadCurrentModel(sdk)
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
  await unloadCurrentModel(sdk)
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
      await unloadCurrentModel(sdk)
      await sdk.close()
    } catch {}
  }
  loadedModel = null
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

async function transcribe(event, { pcm, feature, featureConfig }) {
  const [sdk, catalog] = await Promise.all([loadSdk(), loadCatalog()])
  const modelId = await loadSpeechModel(sdk, catalog, feature, featureConfig ?? {})
  pcmCounter += 1
  const pcmPath = path.join(
    os.tmpdir(),
    `${PCM_FILE_PREFIX}${process.pid}-${pcmCounter}${PCM_FILE_EXTENSION}`
  )
  try {
    await fs.promises.writeFile(pcmPath, Buffer.from(pcm))
    const text = await sdk.transcribe({ modelId, audioChunk: pcmPath })
    return { text: String(text ?? '').trim() }
  } finally {
    await fs.promises.rm(pcmPath, { force: true })
  }
}

async function extractText(event, { image }) {
  const [sdk, catalog, text] = await Promise.all([loadSdk(), loadCatalog(), loadText()])
  const [recognizerName, detectorName] = catalog.getFeatureRegistryNames(
    catalog.LOCAL_AI_FEATURE.EXTRACT_TEXT,
    {}
  )
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
  const { blocks } = sdk.ocr({ modelId, image: Buffer.from(image) })
  return { text: text.formatOcrBlocks(await blocks) }
}

function loadLlmFeature(sdk, catalog, prompts, feature, featureConfig = {}) {
  const [modelName, projectionName] = catalog.getFeatureRegistryNames(feature, featureConfig)
  return ensureModelLoaded(sdk, [modelName, projectionName].filter(Boolean).join('|'), () =>
    sdk.loadModel({
      modelSrc: registryAsset(sdk, catalog, modelName),
      modelType: 'llm',
      modelConfig: {
        ctx_size: prompts.LLM_CONTEXT_SIZE,
        ...(projectionName ? { projectionModelSrc: registryAsset(sdk, catalog, projectionName) } : {})
      }
    })
  )
}

async function describeImage(event, { image, extension }) {
  const [sdk, catalog, prompts] = await Promise.all([loadSdk(), loadCatalog(), loadPrompts()])
  const modelId = await loadLlmFeature(sdk, catalog, prompts, catalog.LOCAL_AI_FEATURE.DESCRIBE_IMAGES)
  pcmCounter += 1
  const safeExtension = IMAGE_EXTENSION_PATTERN.test(extension ?? '') ? extension : DEFAULT_IMAGE_EXTENSION
  const imagePath = path.join(
    os.tmpdir(),
    `${IMAGE_FILE_PREFIX}${process.pid}-${pcmCounter}.${safeExtension}`
  )
  try {
    await fs.promises.writeFile(imagePath, Buffer.from(image))
    const run = sdk.completion({
      modelId,
      history: [
        { role: 'user', content: prompts.DESCRIBE_IMAGE_PROMPT, attachments: [{ path: imagePath }] }
      ],
      stream: false,
      generationParams: { temp: prompts.LLM_TEMPERATURE, predict: prompts.DESCRIBE_MAX_TOKENS }
    })
    return { text: prompts.cleanModelOutput(await run.text) }
  } finally {
    await fs.promises.rm(imagePath, { force: true })
  }
}

async function summarize(event, { text, task, featureConfig }) {
  const [sdk, catalog, prompts] = await Promise.all([loadSdk(), loadCatalog(), loadPrompts()])
  const noteTask = prompts.isNoteTask(task) ? task : prompts.NOTE_TASK.TRANSCRIPT_SUMMARY
  const modelId = await loadLlmFeature(
    sdk,
    catalog,
    prompts,
    catalog.LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
    featureConfig && typeof featureConfig === 'object' ? featureConfig : {}
  )
  const run = sdk.completion({
    modelId,
    history: prompts.buildNoteTaskMessages(noteTask, text),
    stream: false,
    generationParams: {
      temp: prompts.LLM_TEMPERATURE,
      predict: prompts.getNoteTaskMaxTokens(noteTask, text)
    }
  })
  return { text: prompts.cleanModelOutput(await run.text) }
}

async function translateParagraphs(event, { paragraphs, from, to }) {
  const [sdk, catalog, translation, language] = await Promise.all([
    loadSdk(),
    loadCatalog(),
    import('@pear-notes/core/store/services/localAiTranslationModels.js'),
    import('@pear-notes/core/store/services/localAiLanguage.js')
  ])
  const steps = language.getTranslationSteps(from, to)
  let lines = Array.isArray(paragraphs) ? paragraphs.map((line) => String(line ?? '')) : []
  if (steps.length === 0 || lines.length === 0) {
    throw new LocalAiError(catalog.LOCAL_AI_ERROR.TASK_FAILED)
  }
  for (const [stepFrom, stepTo] of steps) {
    const modelName = translation.getTranslationModelName(stepFrom, stepTo)
    const modelId = await ensureModelLoaded(sdk, `${modelName}|translate`, () =>
      sdk.loadModel({
        modelSrc: registryAsset(sdk, catalog, modelName),
        modelConfig: { engine: 'Bergamot', from: stepFrom, to: stepTo }
      })
    )
    const run = sdk.translate({ modelId, text: lines, modelType: 'nmtcpp-translation', stream: false })
    lines = (await run.translations).map((line) => String(line ?? ''))
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
    if (sdkPromise) sdkPromise.then(unloadCurrentModel).catch(() => {})
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
  handle('local-ai:transcribe', 'TASK_FAILED', withModelWork(transcribe))
  handle('local-ai:extract-text', 'TASK_FAILED', withModelWork(extractText))
  handle('local-ai:describe-image', 'TASK_FAILED', withModelWork(describeImage))
  handle('local-ai:summarize', 'TASK_FAILED', withModelWork(summarize))
  handle('local-ai:translate', 'TASK_FAILED', withModelWork(translateParagraphs))
  handle('local-ai:cancel-task', 'TASK_FAILED', cancelTask)
  watchPower()
}

function shutdownLocalAi() {
  clearIdleUnload()
  const pendingSdk = sdkPromise
  sdkPromise = null
  if (!pendingSdk) return
  pendingSdk.then((sdk) => sdk.close()).catch(() => {})
}

module.exports = { setupLocalAi, shutdownLocalAi }
