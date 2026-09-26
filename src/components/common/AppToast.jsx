import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { Info, X } from 'lucide-react'

import { getSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'

import { dismissToast, useToast } from '../../lib/toast'

export default function AppToast() {
  const { t } = useTranslation()
  const toast = useToast()
  const noteOpen = !!useSelector(getSelectedNote)
  if (!toast) return null

  return (
    <div
      key={toast.id}
      role='status'
      aria-live='polite'
      className={`fixed ${noteOpen ? 'bottom-28' : 'bottom-6'} left-1/2 -translate-x-1/2 w-96 max-w-[calc(100%-4rem)] bg-bg-secondary border border-border-primary rounded-xl shadow-2xl p-4 flex items-center gap-3 z-[120] animate-in slide-in-from-bottom-5 fade-in duration-300`}
    >
      <div className='w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-accent-primary/10 text-accent-primary'>
        <Info className='w-5 h-5' />
      </div>
      <p className='flex-1 min-w-0 text-sm text-text-primary leading-snug'>{toast.message}</p>
      <button
        onClick={dismissToast}
        className='w-6 h-6 rounded flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all shrink-0'
        aria-label={t('common.close')}
        title={t('common.close')}
      >
        <X className='w-3.5 h-3.5' />
      </button>
    </div>
  )
}
