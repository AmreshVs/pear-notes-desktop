import { attachmentIdentity, getCachedPdfThumb, putPdfThumb } from './pdfThumbCache'

const PREVIEW_MAX_WIDTH = 420
const PREVIEW_MAX_HEIGHT = 260
const PREVIEW_MAX_SCALE = 2
const PREVIEW_JPEG_QUALITY = 0.8
const PREVIEW_CACHE_LIMIT = 24

let enginePromise = null

function loadPdfEngine() {
  if (!enginePromise) enginePromise = import('./pdfEngine')
  return enginePromise
}

const previewCache = new Map()
const pendingPreviews = new Map()

function rememberPreview(identity, preview) {
  previewCache.set(identity, preview)
  if (previewCache.size > PREVIEW_CACHE_LIMIT) {
    const oldest = previewCache.keys().next().value
    if (oldest) previewCache.delete(oldest)
  }
}

export function isPdfAttachment(fileName, fileType) {
  if (fileType === 'application/pdf') return true
  return typeof fileName === 'string' && fileName.toLowerCase().endsWith('.pdf')
}

async function renderFirstPage(url) {
  const { getDocument } = await loadPdfEngine()
  const loadingTask = getDocument({ url, isEvalSupported: false })
  const pdf = await loadingTask.promise
  try {
    const page = await pdf.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const fit = Math.min(PREVIEW_MAX_WIDTH / base.width, PREVIEW_MAX_HEIGHT / base.height)
    const pixelRatio = Math.min(window.devicePixelRatio || 1, PREVIEW_MAX_SCALE)
    const viewport = page.getViewport({ scale: fit * pixelRatio })

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(viewport.width))
    canvas.height = Math.max(1, Math.round(viewport.height))
    const context = canvas.getContext('2d')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: context, viewport }).promise

    return {
      dataUrl: canvas.toDataURL('image/jpeg', PREVIEW_JPEG_QUALITY),
      width: Math.round(base.width * fit),
      height: Math.round(base.height * fit),
      pageCount: pdf.numPages
    }
  } finally {
    await loadingTask.destroy()
  }
}

// Rendering on note open also fills the persistent cache, which is what lets the sidebar show a
// thumbnail for a note it never renders itself.
async function loadPreview(url) {
  const stored = await getCachedPdfThumb(url).catch(() => null)
  if (stored?.dataUrl) return stored

  const preview = await renderFirstPage(url)
  if (preview) await putPdfThumb(url, preview).catch(() => {})
  return preview
}

export function getPdfPreview(url) {
  if (!url) return Promise.resolve(null)
  const identity = attachmentIdentity(url)

  const remembered = previewCache.get(identity)
  if (remembered) return Promise.resolve(remembered)

  const inFlight = pendingPreviews.get(identity)
  if (inFlight) return inFlight

  const request = loadPreview(url)
    .then((preview) => {
      if (preview) rememberPreview(identity, preview)
      return preview
    })
    .catch(() => null)
    .finally(() => pendingPreviews.delete(identity))

  pendingPreviews.set(identity, request)
  return request
}

/**
 * Renders page 1 straight from a just-picked local file and persists it under the attachment's
 * final link, so a freshly attached PDF has a sidebar thumbnail without any network read.
 */
export async function warmPdfThumbFromFile(link, file) {
  if (!link || !file) return
  const identity = attachmentIdentity(link)
  if (previewCache.has(identity)) return

  const existing = await getCachedPdfThumb(link).catch(() => null)
  if (existing?.dataUrl) return

  const objectUrl = URL.createObjectURL(file)
  try {
    const preview = await renderFirstPage(objectUrl)
    if (!preview) return
    rememberPreview(identity, preview)
    await putPdfThumb(link, preview).catch(() => {})
  } catch {
    // A thumbnail is cosmetic; never let it break an attachment.
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
