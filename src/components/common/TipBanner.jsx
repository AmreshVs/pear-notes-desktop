import { useTranslation } from 'react-i18next'
import { Bell, CalendarClock, Laptop, X } from 'lucide-react'

import { TIP, TIP_ACTION } from '@pear-notes/core/store/services/tips.js'

import { useLocalToggle } from '../../hooks/useLocalToggle'
import { REMINDERS_TOGGLE_KEY } from '../../hooks/useReminders'
import { useTips } from '../../hooks/useTips'

import { Toast } from './ToastStack'

const ICONS = {
  [TIP.SERVE_PHONE]: Laptop,
  [TIP.REMINDERS_OFF]: Bell,
  [TIP.YEARLY_DATES]: CalendarClock
}

export default function TipBanner({ onOpenUpcoming }) {
  const { t } = useTranslation()
  const { tip, answer } = useTips()
  const [remindersOn, toggleReminders] = useLocalToggle(REMINDERS_TOGGLE_KEY, false)
  if (!tip || !ICONS[tip]) return null

  const Icon = ICONS[tip]
  const accept = () => {
    if (tip === TIP.REMINDERS_OFF && !remindersOn) toggleReminders()
    if (tip === TIP.YEARLY_DATES) onOpenUpcoming()
    answer(TIP_ACTION.ACCEPT)
  }

  return (
    <Toast>
      <div
        role='status'
        className='w-80 max-w-full bg-bg-secondary border border-border-primary rounded-xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-right-8 duration-300'
      >
        <div className='flex items-start gap-3'>
          <div className='w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-accent-primary/10 text-accent-primary'>
            <Icon className='w-5 h-5' />
          </div>
          <div className='flex-1 min-w-0'>
            <h4 className='text-text-primary font-semibold text-sm'>{t(`tips.${tip}.title`)}</h4>
            <p className='text-text-tertiary text-xs leading-relaxed mt-0.5'>
              {t(`tips.${tip}.body`)}
            </p>
          </div>
          <button
            type='button'
            onClick={() => answer(TIP_ACTION.DISMISS)}
            className='w-7 h-7 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all shrink-0'
            title={t('tips.dismiss')}
            aria-label={t('tips.dismiss')}
          >
            <X className='w-4 h-4' />
          </button>
        </div>
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={accept}
            className='flex-1 py-2 bg-accent-primary text-accent-on-primary rounded-lg font-semibold text-sm hover:bg-accent-primary-hover transition-all active:scale-95'
          >
            {t(`tips.${tip}.action`)}
          </button>
          <button
            type='button'
            onClick={() => answer(TIP_ACTION.NOT_NOW)}
            className='flex-1 py-2 bg-overlay-subtle text-text-secondary rounded-lg font-semibold text-sm hover:bg-overlay-medium transition-all active:scale-95'
          >
            {t('tips.notNow')}
          </button>
        </div>
      </div>
    </Toast>
  )
}
