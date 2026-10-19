import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlert, X } from 'lucide-react'

import { isKeyringMissing } from '../../lib/appFlags'

import { Toast } from './ToastStack'

export default function KeyringWarningBanner() {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !isKeyringMissing()) return null

  return (
    <Toast>
      <div className='w-80 max-w-full bg-bg-secondary border border-border-primary rounded-xl shadow-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-right-8 duration-300'>
        <div className='w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-red-500/10 text-red-500'>
          <ShieldAlert className='w-5 h-5' />
        </div>

        <div className='flex-1 min-w-0'>
          <h4 className='text-text-primary font-semibold text-sm'>{t('keyringWarning.title')}</h4>
          <p className='text-text-tertiary text-xs mt-1'>{t('keyringWarning.description')}</p>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className='w-7 h-7 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all shrink-0'
          title={t('keyringWarning.dismiss')}
        >
          <X className='w-4 h-4' />
        </button>
      </div>
    </Toast>
  )
}
