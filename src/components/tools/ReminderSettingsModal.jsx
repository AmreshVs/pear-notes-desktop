import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Bell, Check, X } from 'lucide-react'

import {
  REMINDER_OFFSET_OPTIONS,
  UNTIMED_TIME_OPTIONS
} from '@pear-notes/core/store/services/noteTasks.js'
import {
  loadReminderPrefs,
  saveReminderPrefs
} from '@pear-notes/core/store/services/upcomingTasks.js'

import { useLocalToggle } from '../../hooks/useLocalToggle'
import { REMINDERS_TOGGLE_KEY } from '../../hooks/useReminders'

const timeLabel = (value, language) => {
  const [hour, minute] = value.split(':').map(Number)
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(language, {
    hour: 'numeric',
    minute: '2-digit'
  })
}

export default function ReminderSettingsModal({ open, onClose }) {
  const { t, i18n } = useTranslation()
  const [prefs, setPrefs] = useState(null)
  const [notifications, toggleNotifications] = useLocalToggle(REMINDERS_TOGGLE_KEY, false)

  useEffect(() => {
    if (!open) return
    let active = true
    loadReminderPrefs()
      .then((loaded) => active && setPrefs(loaded))
      .catch(() => {})
    const handleKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKey)
    return () => {
      active = false
      window.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  const update = (next) => {
    setPrefs(next)
    saveReminderPrefs(next).catch(() => {})
  }

  const toggleOffset = (offset) => {
    const offsets = prefs.offsets.includes(offset)
      ? prefs.offsets.filter((value) => value !== offset)
      : [...prefs.offsets, offset]
    if (offsets.length) update({ ...prefs, offsets })
  }

  return createPortal(
    <div className='fixed inset-0 z-[2100] flex items-center justify-center p-6'>
      <div
        className='absolute inset-0 bg-backdrop-medium backdrop-blur-xl animate-in fade-in duration-200'
        onClick={onClose}
      />
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='reminder-settings-title'
        className='relative bg-bg-panel/95 backdrop-blur-2xl border border-border-primary rounded-[2rem] p-8 max-w-md w-full animate-in zoom-in-95 duration-200 shadow-[0_50px_100px_rgba(0,0,0,0.5)] flex flex-col gap-5'
      >
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-full bg-accent-primary/10 text-accent-primary flex items-center justify-center'>
            <Bell className='w-5 h-5' />
          </div>
          <h3 id='reminder-settings-title' className='flex-1 text-lg font-bold text-text-primary'>
            {t('upcoming.reminders.title')}
          </h3>
          <button
            type='button'
            onClick={onClose}
            title={t('common.close')}
            aria-label={t('common.close')}
            className='w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-overlay-subtle'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <label className='flex items-center justify-between gap-4 cursor-pointer'>
          <span className='flex flex-col'>
            <span className='text-sm font-bold text-text-primary'>
              {t('upcoming.reminders.notifications')}
            </span>
            <span className='text-xs text-text-tertiary'>
              {t('upcoming.reminders.notificationsDesc')}
            </span>
          </span>
          <input
            id='reminder-notifications'
            type='checkbox'
            checked={notifications}
            onChange={toggleNotifications}
            className='w-4 h-4 accent-[var(--accent-primary)]'
          />
        </label>

        <div className='flex flex-col'>
          <span className='text-xs font-bold tracking-[0.1em] text-text-tertiary mb-1'>
            {t('upcoming.reminders.remindMe')}
          </span>
          {REMINDER_OFFSET_OPTIONS.map((offset) => {
            const on = !!prefs?.offsets.includes(offset)
            return (
              <button
                key={offset}
                type='button'
                aria-pressed={on}
                disabled={!prefs}
                onClick={() => toggleOffset(offset)}
                className='flex items-center justify-between py-2.5 border-b border-overlay-subtle last:border-b-0 text-sm text-text-primary hover:text-accent-primary disabled:opacity-40'
              >
                <span>{t(`upcoming.reminders.offsets.${offset}`)}</span>
                {on && <Check className='w-4 h-4 text-accent-primary' />}
              </button>
            )
          })}
        </div>

        <label className='flex items-center justify-between gap-4 text-sm text-text-primary'>
          <span className='flex flex-col'>
            <span className='font-bold'>{t('upcoming.reminders.untimed')}</span>
            <span className='text-xs text-text-tertiary'>
              {t('upcoming.reminders.untimedDesc')}
            </span>
          </span>
          <select
            id='reminder-untimed-time'
            value={prefs?.untimed ?? ''}
            disabled={!prefs}
            onChange={(event) => update({ ...prefs, untimed: event.target.value })}
            className='shrink-0 min-w-[7.5rem] bg-overlay-subtle border border-overlay-soft rounded-lg pl-3 pr-8 py-1.5 text-sm text-text-primary tabular-nums'
          >
            {UNTIMED_TIME_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {timeLabel(value, i18n.language)}
              </option>
            ))}
          </select>
        </label>

        <p className='text-xs text-text-tertiary'>{t('upcoming.reminders.syncNote')}</p>
      </div>
    </div>,
    document.body
  )
}
