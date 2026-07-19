import { createProgressUpload, insertFileFromFile, UploadCancelledError } from './fileManager'
import {
  beginUploadItem,
  completeUploadItem,
  isUploadCancelled,
  updateUploadItemProgress
} from './uploadRegistry'

export { UploadCancelledError }

export async function uploadFileWithProgress({ noteKey, file, fileName, itemId }) {
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
    return insertFileFromFile({ noteKey, file, fileName: name })
  }

  if (itemId) beginUploadItem(itemId, attempt.cancel)
  try {
    return await attempt.promise
  } finally {
    if (itemId && !isUploadCancelled(itemId)) completeUploadItem(itemId)
  }
}
