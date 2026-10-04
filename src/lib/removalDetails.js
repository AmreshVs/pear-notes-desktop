import { formatBytes } from '@pear-notes/core/utils.js'

export function buildRemoveAllDetails(t, { vaultNames, vaultBytes, aiBytes, showAi, dataBytes }) {
  const removed = [
    {
      key: 'vaults',
      icon: 'vaults',
      label: t('storage.removal.vaults', {
        count: vaultNames.length,
        names: vaultNames.join(', ')
      }),
      value: formatBytes(vaultBytes)
    }
  ]
  if (showAi) {
    removed.push({
      key: 'ai',
      icon: 'ai',
      label: t('settings.onDeviceAi.storageRow'),
      value: formatBytes(aiBytes)
    })
  }
  removed.push({
    key: 'data',
    icon: 'data',
    label: t('storage.removal.settingsCache'),
    value: formatBytes(dataBytes)
  })
  return {
    title: t('storage.removal.allTitleComputer'),
    button: t('storage.removal.allBtn'),
    confirmLabel: t('storage.removal.allBtn'),
    removed,
    kept: [
      { key: 'devices', icon: 'devices', label: t('storage.removal.otherDevices') },
      { key: 'backups', icon: 'backups', label: t('storage.removal.backups') }
    ],
    note: t('storage.removal.cantUndoFresh')
  }
}

export function buildClearVaultDetails(
  t,
  { vaultName, notes, folders, mediaBytes, otherVaultNames }
) {
  const removed = [
    {
      key: 'notes',
      icon: 'notes',
      label: t('storage.removal.notesAndFolders', { notes, folders })
    },
    {
      key: 'media',
      icon: 'media',
      label: t('storage.removal.mediaFiles'),
      value: formatBytes(mediaBytes)
    }
  ]
  if (otherVaultNames.length === 0) {
    return {
      title: t('storage.removal.allTitleComputer'),
      button: t('storage.removal.allBtn'),
      confirmLabel: t('storage.removal.allBtn'),
      removed,
      kept: [
        { key: 'devices', icon: 'devices', label: t('storage.removal.otherDevices') },
        { key: 'backups', icon: 'backups', label: t('storage.removal.backups') }
      ],
      note: t('storage.removal.cantUndoFresh')
    }
  }
  return {
    title: t('storage.removal.vaultTitleComputer', { name: vaultName }),
    button: t('storage.removal.vaultBtn', { name: vaultName }),
    confirmLabel: t('storage.clearVaultBtn'),
    removed,
    kept: [
      {
        key: 'devices',
        icon: 'devices',
        label: t('storage.removal.vaultOtherDevices', { name: vaultName })
      },
      { key: 'vaults', icon: 'vaults', label: otherVaultNames.join(', ') }
    ],
    note: t('storage.removal.cantUndo')
  }
}
