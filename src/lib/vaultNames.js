import { VAULT_ERROR } from '@pear-notes/core/constant.js'

export function getVaultLabel(vault, t) {
  return vault?.name || t('vaults.defaultName')
}

const ERROR_KEYS = {
  [VAULT_ERROR.EMPTY_NAME]: 'vaults.errors.emptyName',
  [VAULT_ERROR.MAX_VAULTS]: 'vaults.errors.maxVaults',
  [VAULT_ERROR.LAST_VAULT]: 'vaults.errors.lastVault',
  [VAULT_ERROR.BUSY]: 'vaults.errors.busy',
  [VAULT_ERROR.SYNC_LEADER]: 'vaults.errors.syncLeader'
}

export function getVaultErrorText(code, t) {
  if (!code) return ''
  return t(ERROR_KEYS[code] || 'vaults.errors.openFailed')
}
