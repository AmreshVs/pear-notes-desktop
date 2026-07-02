import { BACKUP_ERROR } from '@pear-notes/core/constant.js'

const BACKUP_ERROR_MESSAGES = {
  [BACKUP_ERROR.INVALID_FILE]: "This file isn't a valid Pear Notes backup.",
  [BACKUP_ERROR.INCORRECT_RECOVERY_KEY]: 'Incorrect recovery key. Please check the key and try again.'
}

export function getBackupErrorMessage (code) {
  return BACKUP_ERROR_MESSAGES[code] || code
}
