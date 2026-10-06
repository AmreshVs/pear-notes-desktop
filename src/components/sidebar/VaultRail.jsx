import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [hint, setHint] = useState(null)

  const showHint = (e, text) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHint({ text, left: rect.right + 10, top: rect.top + rect.height / 2 })
  }
  const hideHint = () => setHint(null)
  const scrollIntoViewRef = useCallback((node) => node?.scrollIntoView({ block: 'nearest' }), [])

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
      onScroll={hideHint}
      className='w-[64px] flex-shrink-0 flex flex-col items-center gap-3 pt-10 pb-4 overflow-y-auto scrollbar-hide bg-bg-primary border-r border-border-primary'
    >
      {vaults.map((vault) => {
        const label = getVaultLabel(vault, t)
        return (
          <button
            key={vault.id}
            ref={vault.current ? scrollIntoViewRef : undefined}
            onClick={() => handleOpen(vault)}
            onContextMenu={handleContextMenu}
            onMouseEnter={(e) => showHint(e, label)}
            onMouseLeave={hideHint}
            onFocus={(e) => showHint(e, label)}
            onBlur={hideHint}
            aria-label={label}
            aria-current={vault.current ? 'true' : undefined}
            disabled={!!pending}
            className={`relative w-10 h-10 flex-shrink-0 rounded-xl grid place-items-center text-base font-bold transition-colors duration-0 disabled:cursor-wait
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
          onMouseEnter={(e) => showHint(e, t('vaults.newVault'))}
          onMouseLeave={hideHint}
          onFocus={(e) => showHint(e, t('vaults.newVault'))}
          onBlur={hideHint}
          aria-label={t('vaults.newVault')}
          disabled={!!pending}
          className='w-10 h-10 flex-shrink-0 rounded-xl grid place-items-center border border-dashed border-border-secondary text-text-tertiary hover:text-text-primary hover:border-text-tertiary'
        >
          <Plus className='w-5 h-5' />
        </button>
      )}
      {hint &&
        createPortal(
          <span
            role='tooltip'
            style={{ left: hint.left, top: hint.top }}
            className='fixed -translate-y-1/2 max-w-[240px] truncate px-3 py-1.5 rounded-lg bg-bg-panel border border-overlay-strong text-sm font-medium text-text-primary shadow-xl z-[100] pointer-events-none animate-in fade-in duration-150'
          >
            {hint.text}
          </span>,
          document.body
        )}
    </nav>
  )
}
