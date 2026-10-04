import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  getForceRemovalId,
  getVaults,
  removeVault,
  setForceRemovalId
} from '@pear-notes/core/store/slices/vaultsSlice.js'

import { getVaultLabel } from '../../lib/vaultNames'

import DangerConfirmModal from './DangerConfirmModal'

export default function ForceVaultRemovalModal() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const forceRemovalId = useSelector(getForceRemovalId)
  const vaults = useSelector(getVaults)
  const vault = forceRemovalId ? vaults.find((v) => v.id === forceRemovalId) : null
  if (!vault) return null

  const name = getVaultLabel(vault, t)
  return (
    <DangerConfirmModal
      title={t('vaults.forceRemove.title')}
      description={t('vaults.forceRemove.description', { name })}
      confirmLabel={t('vaults.forceRemove.confirm')}
      onConfirm={() => dispatch(removeVault({ id: vault.id, force: true }))}
      onCancel={() => dispatch(setForceRemovalId(null))}
    />
  )
}
