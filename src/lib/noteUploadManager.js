import { createProgressUpload, insertFileFromFile, UploadCancelledError } from './fileManager'
import { startUpload, updateUploadProgress, endUpload } from './uploadRegistry'

export { UploadCancelledError }

export async function uploadFileWithProgress({ noteKey, file, fileName }) {
  const name = fileName || file.name
  const attempt = createProgressUpload({ noteKey, file, fileName: name, onProgress: updateUploadProgress })

  if (!attempt) {
    return insertFileFromFile({ noteKey, file, fileName: name })
  }

  startUpload({ fileName: name, progress: 0, cancel: attempt.cancel })
  try {
    return await attempt.promise
  } finally {
    endUpload()
  }
}
