import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link2 } from 'lucide-react'

import { isMultiVaultEnabled, VAULT_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'

export default function MergeConfirmModal({ open, onConfirm, onCancel }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState('add')
  const [vaultName, setVaultName] = useState('')
  if (!open) return null

  const offersVaults = isMultiVaultEnabled()
  const adding = offersVaults && mode === 'add'
  const handleConfirm = () =>
    offersVaults ? onConfirm({ mode, vaultName: vaultName.trim() }) : onConfirm()

  return createPortal(
    <div className='fixed inset-0 z-[2100] flex items-center justify-center p-6 sm:p-0'>
      <div
        className='absolute inset-0 bg-backdrop-medium backdrop-blur-xl animate-in fade-in duration-300'
        onClick={onCancel}
      />

      <div className='relative bg-bg-panel/95 backdrop-blur-2xl border border-border-primary rounded-[2rem] p-10 max-w-sm w-full animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)]'>
        <div className='absolute -top-24 -left-24 w-48 h-48 bg-accent-primary/10 blur-[80px] rounded-full' />
        <div className='absolute -bottom-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-[80px] rounded-full' />

        <div className='relative z-10 flex flex-col items-center text-center space-y-6'>
          <div className='w-20 h-20 bg-accent-primary/10 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/20 mb-2'>
            <Link2 className='w-10 h-10 text-accent-primary' />
          </div>

          <div className='space-y-2'>
            <h3 className='text-2xl font-bold text-text-primary tracking-tight'>
              {offersVaults ? t('vaults.join.title') : t('mergeConfirm.title')}
            </h3>
            <p className='text-text-tertiary text-sm leading-relaxed max-w-[280px]'>
              {offersVaults ? t('vaults.join.description') : t('mergeConfirm.description')}
            </p>
          </div>

          {offersVaults && (
            <div role='radiogroup' className='w-full space-y-2 text-left'>
              {[
                { id: 'add', title: t('vaults.join.addTitle'), body: t('vaults.join.addBody') },
                {
                  id: 'replace',
                  title: t('vaults.join.combineTitle'),
                  body: t('mergeConfirm.description')
                }
              ].map((option) => (
                <button
                  key={option.id}
                  type='button'
                  role='radio'
                  aria-checked={mode === option.id}
                  onClick={() => setMode(option.id)}
                  className={`w-full rounded-xl border p-3 text-left ${mode === option.id ? 'border-[var(--accent-selected-border)] bg-[var(--accent-selected-bg)]' : 'border-border-primary'}`}
                >
                  <span className='block text-sm font-bold text-text-primary'>{option.title}</span>
                  <span className='block text-xs text-text-tertiary leading-relaxed'>
                    {option.body}
                  </span>
                </button>
              ))}
              {adding && (
                <input
                  id='join-vault-name'
                  value={vaultName}
                  maxLength={VAULT_NAME_MAX_LENGTH}
                  onChange={(e) => setVaultName(e.target.value)}
                  placeholder={t('vaults.namePlaceholder')}
                  aria-label={t('vaults.nameLabel')}
                  className='w-full bg-bg-panel text-text-primary px-3 py-2 rounded-lg border border-border-secondary text-sm focus:outline-none focus:border-accent-primary'
                />
              )}
            </div>
          )}

          <div className='flex gap-3 w-full'>
            <button
              onClick={onCancel}
              className='flex-1 py-3 bg-overlay-subtle border border-overlay-soft text-text-tertiary rounded-xl font-bold text-sm hover:bg-overlay-medium transition-all active:scale-95'
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={adding && !vaultName.trim()}
              className='flex-1 py-3 disabled:opacity-50 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-sm shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover transition-all active:scale-95'
            >
              {adding ? t('vaults.join.addBtn') : t('mergeConfirm.combineBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
