import {
  createProgressUpload,
  insertFileFromFile,
  unlockToAddFile,
  UploadCancelledError
} from './fileManager'
import {
  beginUploadItem,
  completeUploadItem,
  isUploadCancelled,
  updateUploadItemProgress
} from './uploadRegistry'

export { UploadCancelledError }

export async function uploadFileWithProgress({ noteKey, file, fileName, itemId }, retried = false) {
  const name = fileName || file.name

  if (itemId && isUploadCancelled(itemId)) {
    throw new UploadCancelledError()
  }

  const attempt = createProgressUpload({
    noteKey,
    file,
    fileName: name,
    onProgress: (progress) => {
      if (itemId) updateUploadItemProgress(itemId, progress)
    }
  })

  if (!attempt) {
    if (itemId) beginUploadItem(itemId)
    try {
      return await insertFileFromFile({ noteKey, file, fileName: name })
    } finally {
      if (itemId && !isUploadCancelled(itemId)) completeUploadItem(itemId)
    }
  }

  if (itemId) beginUploadItem(itemId, attempt.cancel)
  let result
  try {
    result = await attempt.promise
  } finally {
    if (itemId && !isUploadCancelled(itemId)) completeUploadItem(itemId)
  }
  if (!retried && (await unlockToAddFile(result))) {
    return uploadFileWithProgress({ noteKey, file, fileName, itemId }, true)
  }
  return result
}
