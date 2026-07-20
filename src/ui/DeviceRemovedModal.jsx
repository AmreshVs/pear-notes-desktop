import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { ShieldAlert } from 'lucide-react'

import { clearStorage, getDeviceRemoved } from '@pear-notes/core/store/slices/syncSlice.js'

export default function DeviceRemovedModal() {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const deviceRemoved = useSelector(getDeviceRemoved)

  if (!deviceRemoved) return null

  const handleRestart = () => {
    dispatch(clearStorage())
    location.reload()
  }

  return (
    <div className='fixed inset-0 z-[2000] flex items-center justify-center p-6 sm:p-0'>
      <div className='absolute inset-0 bg-backdrop-medium backdrop-blur-xl animate-in fade-in duration-500' />

      <div className='relative bg-bg-panel/95 backdrop-blur-2xl border border-border-primary rounded-[2rem] p-10 max-w-sm w-full animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 ease-out overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)]'>
        <div className='absolute -top-24 -left-24 w-48 h-48 bg-accent-danger/20 blur-[80px] rounded-full' />
        <div className='absolute -bottom-24 -right-24 w-48 h-48 bg-accent-danger/10 blur-[80px] rounded-full' />

        <div className='relative z-10 flex flex-col items-center text-center space-y-6'>
          <div className='w-20 h-20 bg-accent-danger/15 rounded-3xl flex items-center justify-center ring-1 ring-accent-danger/30 mb-2 shadow-[0_0_30px_rgba(var(--accent-danger-rgb),0.2)]'>
            <ShieldAlert className='w-10 h-10 text-accent-danger' />
          </div>

          <div className='space-y-2'>
            <h3 className='text-2xl font-bold text-text-primary tracking-tight'>{t('pairing.overlay.deviceRemovedTitle')}</h3>
            <p className='text-text-tertiary text-sm leading-relaxed max-w-[280px]'>
              {t('pairing.overlay.deviceRemovedDesc')}
            </p>
          </div>

          <button
            onClick={handleRestart}
            className='w-full py-4 bg-accent-danger text-white rounded-xl font-bold text-base shadow-[0_8px_25px_rgba(var(--accent-danger-rgb),0.3)] hover:bg-accent-danger-hover transition-all active:scale-95'
          >
            {t('pairing.overlay.okay')}
          </button>
        </div>
      </div>
    </div>
  )
}
