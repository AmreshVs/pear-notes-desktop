import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Check, Pencil, Plus, Trash2 } from 'lucide-react'

import { MAX_VAULTS, VAULT_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'
import {
  clearVaultError,
  createVault,
  getCanAddVault,
  getVaultError,
  getVaultPending,
  getVaultPendingId,
  getVaults,
  removeVault,
  renameVault,
  switchVault
} from '@pear-notes/core/store/slices/vaultsSlice.js'

import { getVaultErrorText, getVaultLabel } from '../../lib/vaultNames'

import JoinVaultForm from './JoinVaultForm'

export default function VaultsSettings() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const vaults = useSelector(getVaults)
  const pending = useSelector(getVaultPending)
  const pendingId = useSelector(getVaultPendingId)
  const error = useSelector(getVaultError)
  const canAdd = useSelector(getCanAddVault)

  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState(null)
  const [renameText, setRenameText] = useState('')
  const [removingId, setRemovingId] = useState(null)

  const busy = !!pending

  const handleCreate = (e) => {
    e.preventDefault()
    if (!newName.trim() || busy) return
    dispatch(createVault({ name: newName }))
    setNewName('')
  }

  const startRename = (vault) => {
    dispatch(clearVaultError())
    setRemovingId(null)
    setRenamingId(vault.id)
    setRenameText(vault.name || '')
  }

  const submitRename = (e) => {
    e.preventDefault()
    if (!renameText.trim()) return
    dispatch(renameVault({ id: renamingId, name: renameText }))
    setRenamingId(null)
  }

  const confirmRemove = (vault) => {
    setRemovingId(null)
    dispatch(removeVault({ id: vault.id }))
  }

  return (
    <div className='max-w-2xl mx-auto px-6 py-4 space-y-6'>
      <div className='rounded-2xl border border-border-primary bg-overlay-faint divide-y divide-border-primary'>
        {vaults.map((vault) => {
          const label = getVaultLabel(vault, t)
          const isPending = pendingId === vault.id
          return (
            <div key={vault.id} className='px-5 py-4 space-y-3'>
              <div className='flex items-center gap-4'>
                <span
                  className={`w-10 h-10 rounded-xl grid place-items-center font-bold flex-shrink-0 ${vault.current ? 'bg-accent-primary text-accent-on-primary' : 'bg-bg-tertiary text-text-secondary'}`}
                >
                  {label.trim().charAt(0).toUpperCase()}
                </span>
                {renamingId === vault.id ? (
                  <form onSubmit={submitRename} className='flex-1 flex items-center gap-2'>
                    <input
                      id={`vault-rename-${vault.id}`}
                      autoFocus
                      value={renameText}
                      maxLength={VAULT_NAME_MAX_LENGTH}
                      onChange={(e) => setRenameText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && setRenamingId(null)}
                      aria-label={t('vaults.nameLabel')}
                      className='flex-1 bg-bg-panel text-text-primary px-3 py-2 rounded-lg border border-accent-primary text-sm'
                    />
                    <button
                      type='submit'
                      className='p-2 rounded-lg bg-accent-primary text-accent-on-primary'
                      aria-label={t('vaults.rename')}
                    >
                      <Check className='w-4 h-4' />
                    </button>
                  </form>
                ) : (
                  <div className='flex-1 min-w-0'>
                    <div className='text-text-primary font-semibold truncate'>{label}</div>
                    <div className='text-xs text-text-tertiary'>
                      {vault.current ? t('vaults.open') : t('vaults.notOpen')}
                    </div>
                  </div>
                )}
                {renamingId !== vault.id && (
                  <div className='flex items-center gap-2'>
                    {!vault.current && (
                      <button
                        onClick={() => dispatch(switchVault({ id: vault.id }))}
                        disabled={busy}
                        className='px-4 py-2 rounded-lg text-sm font-bold bg-accent-primary text-accent-on-primary disabled:opacity-50'
                      >
                        {isPending && pending === 'switch'
                          ? t('vaults.opening')
                          : t('vaults.openBtn')}
                      </button>
                    )}
                    <button
                      onClick={() => startRename(vault)}
                      disabled={busy}
                      title={t('vaults.rename')}
                      aria-label={t('vaults.rename')}
                      className='p-2 rounded-lg text-text-secondary hover:bg-overlay-light disabled:opacity-50'
                    >
                      <Pencil className='w-4 h-4' />
                    </button>
                    {vaults.length > 1 && (
                      <button
                        onClick={() => setRemovingId(vault.id)}
                        disabled={busy}
                        title={t('vaults.remove')}
                        aria-label={t('vaults.remove')}
                        className='p-2 rounded-lg text-accent-danger hover:bg-accent-danger/10 disabled:opacity-50'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {removingId === vault.id && (
                <div className='rounded-xl border border-accent-danger/40 bg-accent-danger/5 p-4 space-y-3'>
                  <p className='text-sm text-text-primary'>
                    {t('vaults.removeDescription', { name: label })}
                  </p>
                  <div className='flex gap-2 justify-end'>
                    <button
                      onClick={() => setRemovingId(null)}
                      className='px-4 py-2 rounded-lg text-sm font-bold bg-overlay-subtle text-text-secondary'
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={() => confirmRemove(vault)}
                      className='px-4 py-2 rounded-lg text-sm font-bold bg-accent-danger text-white'
                    >
                      {t('vaults.removeConfirm')}
                    </button>
                  </div>
                </div>
              )}
              {isPending && pending === 'remove' && (
                <p className='text-sm text-text-tertiary'>{t('vaults.removing')}</p>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <p role='alert' className='text-sm font-medium text-accent-danger'>
          {getVaultErrorText(error, t)}
        </p>
      )}

      {canAdd ? (
        <form onSubmit={handleCreate} className='space-y-3'>
          <label htmlFor='vault-new-name' className='block text-sm font-bold text-text-secondary'>
            {t('vaults.newVault')}
          </label>
          <div className='flex gap-2'>
            <input
              id='vault-new-name'
              value={newName}
              maxLength={VAULT_NAME_MAX_LENGTH}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('vaults.namePlaceholder')}
              className='flex-1 bg-bg-panel text-text-primary px-4 py-3 rounded-xl border border-border-secondary text-sm focus:outline-none focus:border-accent-primary'
            />
            <button
              type='submit'
              disabled={busy || !newName.trim()}
              className='flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-accent-primary text-accent-on-primary disabled:opacity-50'
            >
              <Plus className='w-4 h-4' />
              {pending === 'create' ? t('vaults.creating') : t('vaults.create')}
            </button>
          </div>
          <p className='text-xs text-text-tertiary leading-relaxed'>{t('vaults.newVaultHint')}</p>
        </form>
      ) : (
        <p className='text-sm text-text-tertiary'>
          {t('vaults.limitReached', { max: MAX_VAULTS })}
        </p>
      )}

      <JoinVaultForm />
    </div>
  )
}
