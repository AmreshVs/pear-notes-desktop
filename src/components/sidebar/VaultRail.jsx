import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Plus } from 'lucide-react'

import { setShowSettings } from '@pear-notes/core/store/slices/uiSlice.js'
import {
  getCanAddVault,
  getVaultPending,
  getVaults,
  switchVault
} from '@pear-notes/core/store/slices/vaultsSlice.js'

import { showContextMenu } from '../../lib/contextMenu'
import { getVaultLabel } from '../../lib/vaultNames'

export default function VaultRail() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const vaults = useSelector(getVaults)
  const pending = useSelector(getVaultPending)
  const canAdd = useSelector(getCanAddVault)

  const handleOpen = (vault) => {
    if (vault.current || pending) return
    dispatch(switchVault({ id: vault.id }))
  }

  const handleContextMenu = async (e) => {
    e.preventDefault()
    const result = await showContextMenu([{ id: 'manage', label: t('vaults.manage') }])
    if (result === 'manage') dispatch(setShowSettings('vaults'))
  }

  return (
    <nav
      aria-label={t('vaults.title')}
      className='w-[64px] flex-shrink-0 flex flex-col items-center gap-3 pt-10 pb-4 bg-bg-primary border-r border-border-primary'
    >
      {vaults.map((vault) => {
        const label = getVaultLabel(vault, t)
        return (
          <button
            key={vault.id}
            onClick={() => handleOpen(vault)}
            onContextMenu={handleContextMenu}
            title={label}
            aria-label={label}
            aria-current={vault.current ? 'true' : undefined}
            disabled={!!pending}
            className={`relative w-10 h-10 rounded-xl grid place-items-center text-base font-bold transition-colors duration-0 disabled:cursor-wait
              ${
                vault.current
                  ? 'bg-accent-primary text-accent-on-primary'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-quaternary hover:text-text-primary'
              }`}
          >
            {vault.current && (
              <span className='absolute -left-3 top-2 bottom-2 w-1 rounded-r bg-accent-primary' />
            )}
            {label.trim().charAt(0).toUpperCase()}
          </button>
        )
      })}
      {canAdd && (
        <button
          onClick={() => dispatch(setShowSettings('vaults'))}
          title={t('vaults.newVault')}
          aria-label={t('vaults.newVault')}
          disabled={!!pending}
          className='w-10 h-10 rounded-xl grid place-items-center border border-dashed border-border-secondary text-text-tertiary hover:text-text-primary hover:border-text-tertiary'
        >
          <Plus className='w-5 h-5' />
        </button>
      )}
    </nav>
  )
}
