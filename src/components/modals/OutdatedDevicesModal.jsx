import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'

export default function OutdatedDevicesModal({
  devices,
  descriptionKey,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}) {
  const { t, i18n } = useTranslation()
  if (!devices?.length) return null

  const names = new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
    devices.map((device) => device.title || t('outdatedDevices.unnamedDevice'))
  )

  return (
    <div className='fixed inset-0 z-[2000] flex items-center justify-center p-6'>
      <div
        className='absolute inset-0 bg-backdrop-medium backdrop-blur-3xl animate-in fade-in duration-300'
        onClick={onCancel}
      />

      <div className='relative bg-bg-panel/95 backdrop-blur-3xl border border-border-primary rounded-[2rem] p-10 max-w-sm w-full animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)]'>
        <div className='absolute -top-24 -left-24 w-48 h-48 bg-accent-danger/20 blur-[80px] rounded-full' />
        <div className='absolute -bottom-24 -right-24 w-48 h-48 bg-accent-danger/10 blur-[80px] rounded-full' />

        <div className='relative z-10 flex flex-col items-center text-center space-y-6'>
          <div className='w-20 h-20 bg-accent-danger/15 rounded-3xl flex items-center justify-center ring-1 ring-accent-danger/30 mb-2 shadow-[0_0_30px_rgba(var(--accent-danger-rgb),0.2)]'>
            <TriangleAlert className='w-10 h-10 text-accent-danger' />
          </div>

          <div className='space-y-2'>
            <h3 className='text-2xl font-bold text-text-primary tracking-tight'>
              {t('outdatedDevices.title')}
            </h3>
            <p className='text-text-tertiary text-sm leading-relaxed max-w-[280px]'>
              {t(descriptionKey, { devices: names, count: devices.length })}
            </p>
          </div>

          <div className='flex gap-3 w-full pt-2'>
            <button
              onClick={onCancel}
              className='flex-1 py-4 bg-overlay-subtle border border-overlay-soft text-text-tertiary rounded-xl font-bold text-sm hover:bg-overlay-medium transition-all active:scale-95'
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className='flex-1 py-4 bg-accent-danger text-white rounded-xl font-bold text-sm shadow-[0_8px_25px_rgba(var(--accent-danger-rgb),0.3)] hover:bg-accent-danger-hover transition-all active:scale-95'
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
