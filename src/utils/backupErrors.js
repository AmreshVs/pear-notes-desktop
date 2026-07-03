import { BACKUP_ERROR } from '@pear-notes/core/constant.js'

const BACKUP_ERROR_MESSAGES = {
  [BACKUP_ERROR.INVALID_FILE]: "This file isn't a valid Pear Notes backup.",
  [BACKUP_ERROR.INCORRECT_RECOVERY_KEY]: 'Incorrect recovery key. Please check the key and try again.',
  [BACKUP_ERROR.INCORRECT_PASSWORD]: 'Incorrect password. Please check your backup password and try again.',
  [BACKUP_ERROR.PASSWORD_REQUIRED]: 'This backup is password-protected. Please enter its password.',
  [BACKUP_ERROR.UNSUPPORTED_VERSION]: 'This backup was made with an incompatible version and cannot be restored.'
}

export function getBackupErrorMessage (code) {
  return BACKUP_ERROR_MESSAGES[code] || code
}
