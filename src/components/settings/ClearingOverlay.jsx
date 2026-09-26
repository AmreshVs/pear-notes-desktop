import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

export default function ClearingOverlay() {
  const { t } = useTranslation()

  return (
    <div className='fixed inset-0 z-[400] flex flex-col items-center justify-center gap-4 bg-backdrop-medium backdrop-blur-xl'>
      <Loader2 className='w-8 h-8 text-accent-primary animate-spin' />
      <h3 className='text-lg font-bold text-text-primary'>{t('pairing.overlay.resettingTitle')}</h3>
      <p className='text-sm text-text-tertiary max-w-xs text-center leading-relaxed'>
        {t('pairing.overlay.resettingDesc')}
      </p>
    </div>
  )
}
