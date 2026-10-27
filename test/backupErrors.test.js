import test from 'brittle'

import { BACKUP_ERROR } from '@pear-notes/core/constant.js'

import { getBackupErrorMessage } from '../src/utils/backupErrors.js'

const key = (k) => k

test('known backup errors map to a message', (t) => {
  t.is(
    getBackupErrorMessage(BACKUP_ERROR.INCORRECT_PASSWORD, key),
    'backup.errors.incorrectPassword'
  )
  t.is(getBackupErrorMessage(BACKUP_ERROR.INVALID_FILE, key), 'backup.errors.invalidFile')
})

test('unknown backup errors show the raw code', (t) => {
  t.is(getBackupErrorMessage('boom', key), 'boom')
})
