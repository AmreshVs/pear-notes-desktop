import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'

export default function DangerConfirmModal({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel
}) {
  const { t } = useTranslation()

  return (
    <div className='fixed inset-0 z-[300] flex items-center justify-center p-6'>
      <div className='absolute inset-0 bg-backdrop-medium backdrop-blur-xl' onClick={onCancel} />
      <div
        role='alertdialog'
        aria-label={title}
        className='relative bg-bg-panel/90 backdrop-blur-3xl border border-overlay-medium rounded-[2rem] p-8 max-w-sm w-full shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 fade-in duration-200'
      >
        <div className='flex flex-col items-center text-center space-y-4'>
          <div className='w-14 h-14 rounded-2xl bg-accent-danger/10 flex items-center justify-center ring-1 ring-accent-danger/20'>
            <Trash2 className='w-6 h-6 text-accent-danger' />
          </div>
          <div className='space-y-2'>
            <h3 className='text-lg font-bold text-text-primary'>{title}</h3>
            <p className='text-sm text-text-tertiary leading-relaxed'>{description}</p>
          </div>
          <div className='flex gap-3 w-full pt-2'>
            <button
              onClick={onCancel}
              className='flex-1 py-3 bg-overlay-light border border-overlay-medium text-text-secondary rounded-xl font-bold text-base hover:bg-overlay-medium transition-all active:scale-95'
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onConfirm}
              className='flex-1 py-3 bg-accent-danger text-white rounded-xl font-bold text-base hover:opacity-90 transition-all active:scale-95 shadow-[0_4px_15px_rgba(var(--accent-danger-rgb),0.3)]'
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
