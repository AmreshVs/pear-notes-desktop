import i18next from 'i18next'

import { BACKUP_ERROR } from '@pear-notes/core/constant.js'

const BACKUP_ERROR_KEYS = {
  [BACKUP_ERROR.INVALID_FILE]: 'backup.errors.invalidFile',
  [BACKUP_ERROR.INCORRECT_RECOVERY_KEY]: 'backup.errors.incorrectRecoveryKey',
  [BACKUP_ERROR.INCORRECT_PASSWORD]: 'backup.errors.incorrectPassword',
  [BACKUP_ERROR.PASSWORD_REQUIRED]: 'backup.errors.passwordRequired',
  [BACKUP_ERROR.UNSUPPORTED_VERSION]: 'backup.errors.unsupportedVersion'
}

export function getBackupErrorMessage(code, t) {
  const key = BACKUP_ERROR_KEYS[code]
  if (!key) return code
  if (t) return t(key)
  return i18next.t(key)
}
