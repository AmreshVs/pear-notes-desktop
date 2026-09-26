import { VAULT_ERROR } from '@pear-notes/core/constant.js'

export function getVaultLabel(vault, t) {
  return vault?.name || t('vaults.defaultName')
}

const ERROR_KEYS = {
  [VAULT_ERROR.EMPTY_NAME]: 'vaults.errors.emptyName',
  [VAULT_ERROR.MAX_VAULTS]: 'vaults.errors.maxVaults',
  [VAULT_ERROR.LAST_VAULT]: 'vaults.errors.lastVault',
  [VAULT_ERROR.BUSY]: 'vaults.errors.busy',
  [VAULT_ERROR.SYNC_LEADER]: 'vaults.errors.syncLeader',
  [VAULT_ERROR.MISSING_MEDIA]: 'vaults.errors.missingMedia',
  [VAULT_ERROR.NOTHING_TO_MOVE]: 'vaults.errors.nothingToMove'
}

export function getVaultErrorText(code, t) {
  if (!code) return ''
  return t(ERROR_KEYS[code] || 'vaults.errors.openFailed')
}

export const VAULT_MENU_PREFIX = 'vault:'

export function getVaultMenuItems(vaults, t) {
  return vaults.map((vault) => ({
    id: `${VAULT_MENU_PREFIX}${vault.id}`,
    label: getVaultLabel(vault, t)
  }))
}

export function confirmVaultMove({ vault, noteCount, folderName, t }) {
  const name = getVaultLabel(vault, t)
  const question = folderName
    ? t('vaults.move.confirmFolder', { folder: folderName, name })
    : t('vaults.move.confirmNotes', { count: noteCount, name })
  return window.confirm(`${question}\n\n${t('vaults.move.explain', { name })}`)
}
