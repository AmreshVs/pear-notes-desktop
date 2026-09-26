import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Plus } from 'lucide-react'

import { VAULT_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'
import { createVault, getVaultPending } from '@pear-notes/core/store/slices/vaultsSlice.js'

export default function CreateVaultForm({ onDone }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const pending = useSelector(getVaultPending)
  const [name, setName] = useState('')

  const canCreate = !!name.trim() && !pending

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canCreate) return
    dispatch(createVault({ name }))
    setName('')
    onDone()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-3 rounded-2xl border border-border-primary bg-overlay-faint p-5'
    >
      <h3 className='text-sm font-bold text-text-primary'>{t('vaults.newVault')}</h3>
      <p className='text-xs text-text-tertiary leading-relaxed'>{t('vaults.newVaultHint')}</p>
      <div className='flex gap-2'>
        <input
          id='vault-new-name'
          autoFocus
          value={name}
          maxLength={VAULT_NAME_MAX_LENGTH}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('vaults.namePlaceholder')}
          aria-label={t('vaults.nameLabel')}
          className='flex-1 bg-bg-panel text-text-primary px-4 py-3 rounded-xl border border-border-secondary text-sm focus:outline-none focus:border-accent-primary'
        />
        <button
          type='submit'
          disabled={!canCreate}
          className='flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-accent-primary text-accent-on-primary disabled:opacity-50'
        >
          <Plus className='w-4 h-4' />
          {pending === 'create' ? t('vaults.creating') : t('vaults.create')}
        </button>
      </div>
    </form>
  )
}
