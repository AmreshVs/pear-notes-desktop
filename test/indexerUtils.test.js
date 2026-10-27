import test from 'brittle'

import { INDEXER_ERROR, INDEXER_TRANSFER_STEP } from '@pear-notes/core/constant.js'

import { getIndexerErrorKey, getIndexerStepKey } from '../src/lib/indexerUtils.js'

test('leader change errors map to a message, unknown ones to a generic one', (t) => {
  t.is(getIndexerErrorKey(INDEXER_ERROR.LAST_INDEXER), 'sync.devices.errorLastIndexer')
  t.is(getIndexerErrorKey(INDEXER_ERROR.TRANSFER_TIMEOUT), 'sync.devices.errorTransferTimeout')
  t.is(getIndexerErrorKey('new-error'), 'sync.devices.errorGeneric')
  t.is(getIndexerErrorKey(null), '')
})

test('leader transfer steps have their own text, otherwise "transferring"', (t) => {
  t.is(getIndexerStepKey(INDEXER_TRANSFER_STEP.CONFIRMING), 'sync.devices.transferConfirming')
  t.is(getIndexerStepKey(undefined), 'sync.devices.transferring')
  t.is(getIndexerStepKey('new-step'), 'sync.devices.transferring')
})
