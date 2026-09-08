import { INDEXER_ERROR, INDEXER_TRANSFER_STEP } from '@pear-notes/core/constant.js'

const INDEXER_ERROR_KEYS = {
  [INDEXER_ERROR.LAST_INDEXER]: 'sync.devices.errorLastIndexer',
  [INDEXER_ERROR.DEVICE_OFFLINE]: 'sync.devices.errorDeviceOffline',
  [INDEXER_ERROR.LEADER_OFFLINE]: 'sync.devices.errorLeaderOffline',
  [INDEXER_ERROR.UNKNOWN_DEVICE]: 'sync.devices.errorGeneric',
  [INDEXER_ERROR.TRANSFER_TIMEOUT]: 'sync.devices.errorTransferTimeout'
}

const INDEXER_STEP_KEYS = {
  [INDEXER_TRANSFER_STEP.SUBMITTING]: 'sync.devices.transferSubmitting',
  [INDEXER_TRANSFER_STEP.CONFIRMING]: 'sync.devices.transferConfirming'
}

export function getIndexerStepKey(step) {
  if (!step) return 'sync.devices.transferring'
  return INDEXER_STEP_KEYS[step] || 'sync.devices.transferring'
}

export function getIndexerErrorKey(error) {
  if (!error) return ''
  return INDEXER_ERROR_KEYS[error] || 'sync.devices.errorGeneric'
}

export function isIndexerTransferBlocked(indexerDevice) {
  if (!indexerDevice) return false
  if (indexerDevice.isLocal) return false
  return indexerDevice.isOnline !== true
}

export function canPromoteDevice(device, indexerDevice) {
  if (!device || device.isIndexer) return false
  if (isIndexerTransferBlocked(indexerDevice)) return false
  if (device.isLocal) return true
  return device.isOnline === true
}
