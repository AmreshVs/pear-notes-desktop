import { useTranslation } from 'react-i18next'
import { Fingerprint, Lock } from 'lucide-react'

import { getBiometricMethodKey } from '../../lib/deviceAuth'
import { resolveNoteLockPrompt, useNoteLockPrompt } from '../../lib/noteLockPrompt'

const FALLBACK_METHOD_KEY = 'settings.privacy.methods.screenLock'

const decline = () => resolveNoteLockPrompt(false)
const accept = () => resolveNoteLockPrompt(true)

export default function NoteLockPromptModal() {
  const { t } = useTranslation()
  const kind = useNoteLockPrompt()

  if (!kind) return null

  const method = t(getBiometricMethodKey() || FALLBACK_METHOD_KEY)
  const isOffer = kind === 'biometricOffer'
  const Icon = isOffer ? Fingerprint : Lock
  const isChange = kind === 'changeSuggested'
  const title = isOffer
    ? t('noteLockPrompt.biometricTitle', { method })
    : isChange
      ? t('noteLockPrompt.changeTitle')
      : t('noteLockPrompt.migrationTitle')
  const body = isOffer
    ? t('noteLockPrompt.biometricBody', { method })
    : isChange
      ? t('noteLockPrompt.changeBody')
      : t('noteLockPrompt.migrationBody', { method })
  const confirm = isOffer
    ? t('noteLockPrompt.useBiometric', { method })
    : isChange
      ? t('noteLockPrompt.changePassword')
      : t('noteLockPrompt.setPassword')

  return (
    <div className='fixed inset-0 z-[2000] flex items-center justify-center p-6'>
      <div
        className='absolute inset-0 bg-backdrop-medium backdrop-blur-3xl animate-in fade-in duration-300'
        onClick={decline}
      />
      <div
        role='dialog'
        aria-modal='true'
        className='relative bg-bg-panel/95 backdrop-blur-3xl border border-border-primary rounded-[2rem] p-8 max-w-md w-full flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out shadow-[0_50px_100px_rgba(0,0,0,0.5)]'
      >
        <div className='flex flex-col items-center space-y-2'>
          <div className='w-14 h-14 rounded-2xl bg-accent-primary/10 flex items-center justify-center ring-1 ring-accent-primary/20 mb-2'>
            <Icon className='w-6 h-6 text-accent-primary' />
          </div>
          <h3 className='text-lg font-bold text-text-primary'>{title}</h3>
          <p className='text-text-tertiary text-xs leading-relaxed max-w-[320px]'>{body}</p>
        </div>
        <div className='flex gap-3 w-full'>
          <button
            onClick={decline}
            className='flex-1 py-3 bg-overlay-subtle border border-overlay-soft text-text-tertiary rounded-xl font-bold text-sm hover:bg-overlay-medium transition-all active:scale-95'
          >
            {t('noteLockPrompt.notNow')}
          </button>
          <button
            onClick={accept}
            autoFocus
            className='flex-1 py-3 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-sm shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover transition-all active:scale-95'
          >
            {confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
