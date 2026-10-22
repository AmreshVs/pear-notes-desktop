import i18next from 'i18next'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { HYPERDRIVE_URL_PREFIX, LOCK_REFUSAL } from '@pear-notes/core/constant.js'

import { unlockLockedNotes } from './noteLockSession'

export function getFilePath(file) {
  try {
    return window.electronBridge?.getPathForFile?.(file) || ''
  } catch {
    return ''
  }
}

export function unlockToAddFile(result) {
  if (result?.reason !== LOCK_REFUSAL.SESSION_CLOSED) return false
  const reason = i18next.t('noteLockPassword.addFileReason')
  return unlockLockedNotes(reason, 'unlock', reason)
}

export async function insertNoteFile(args) {
  const result = await backendApi.insertFile(args)
  if (!(await unlockToAddFile(result))) return result
  return backendApi.insertFile(args)
}

export async function insertFileFromFile({ noteKey, file, fileName }) {
  const name = fileName || file.name
  const path = getFilePath(file)
  if (path) {
    return insertNoteFile({ key: noteKey, fileName: name, path })
  }
  const buffer = await file.arrayBuffer()
  return insertNoteFile({ key: noteKey, fileName: name, buffer })
}

export async function uploadFile({ noteKey, file }) {
  return insertFileFromFile({ noteKey, file })
}

export class UploadCancelledError extends Error {
  constructor() {
    super('UPLOAD_CANCELLED')
    this.name = 'UploadCancelledError'
  }
}

export function createProgressUpload({ noteKey, file, fileName, onProgress }) {
  const path = getFilePath(file)
  if (!path) return null

  const stream = backendApi.insertFileWithProgress({
    key: noteKey,
    fileName: fileName || file.name,
    path
  })
  let cancelled = false
  const cancel = () => {
    cancelled = true
    if (typeof stream.destroy === 'function') stream.destroy()
  }
  const promise = (async () => {
    let link = ''
    let reason = ''
    let gotDone = false
    try {
      for await (const msg of stream) {
        if (cancelled) break
        if (msg.reason) {
          reason = msg.reason
          continue
        }
        if (msg.done) {
          link = msg.link
          gotDone = true
          continue
        }
        if (msg.total > 0) {
          onProgress?.(Math.min(100, Math.round((msg.transferred / msg.total) * 100)))
        }
      }
    } catch (e) {
      if (gotDone) return { link }
      if (cancelled) throw new UploadCancelledError()
      throw e
    }
    if (cancelled && !gotDone) throw new UploadCancelledError()
    return { link, reason }
  })()
  return { promise, cancel }
}

export async function deleteHyperdriveFile(noteKey, url) {
  if (!noteKey || !url || !url.startsWith(HYPERDRIVE_URL_PREFIX)) return
  const queryIdx = url.indexOf('?')
  const mediaPath =
    queryIdx !== -1 && url.slice(queryIdx).includes('blob=')
      ? url
      : url.replace(HYPERDRIVE_URL_PREFIX, '').replace(/^\//, '')
  await backendApi.deleteNoteFile({ noteKey, mediaPath })
}

export async function downloadAsBlob(url, onProgress) {
  const response = await fetch(url)
  if (!onProgress || !response.body) {
    return response.blob()
  }

  const total = Number(response.headers.get('content-length')) || 0
  if (!total) {
    const blob = await response.blob()
    onProgress(100)
    return blob
  }

  const reader = response.body.getReader()
  const chunks = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    onProgress(Math.min(100, Math.round((received / total) * 100)))
  }
  return new Blob(chunks)
}

export function createDownloadLink(blob, fileName) {
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = fileName || 'download'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}

export function base64ToBlob(dataUrl) {
  const byteString = atob(dataUrl.split(',')[1])
  const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
  return new Blob([ab], { type: mimeString })
}

const FRAME_PREVIEW_MIME_TYPES = {
  pdf: 'application/pdf',
  text: 'text/plain'
}

export function canFramePreview(kind) {
  return kind in FRAME_PREVIEW_MIME_TYPES
}

export async function createFramePreviewUrl(url, kind) {
  const mimeType = FRAME_PREVIEW_MIME_TYPES[kind]
  if (!mimeType) return null

  const blob = url.startsWith('data:')
    ? base64ToBlob(url)
    : await fetch(url).then((response) => {
        if (!response.ok) throw new Error(`Preview request failed: ${response.status}`)
        return response.blob()
      })

  return URL.createObjectURL(new Blob([blob], { type: mimeType }))
}

export async function processHtmlImages(html) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const images = doc.querySelectorAll('img')

    await Promise.all(
      Array.from(images).map(async (img) => {
        try {
          const src = img.getAttribute('src')
          if (!src || src.startsWith('data:')) return

          const response = await fetch(src)
          const blob = await response.blob()

          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              img.setAttribute('src', reader.result)
              resolve()
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        } catch (err) {
          console.error('Failed to process image:', err)
        }
      })
    )

    return doc.body.innerHTML
  } catch (error) {
    console.error('Error processing HTML images:', error)
    return html
  }
}
