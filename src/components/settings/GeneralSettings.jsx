import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { ChevronDown, ChevronRight } from 'lucide-react'

import {
  getEditorFontSize,
  getFontFamily,
  getSortBy,
  getTheme,
  setTheme,
  updateSetting
} from '@pear-notes/core/store/slices/settingsSlice.js'

import { useLocalToggle } from '../../hooks/useLocalToggle'
import { REMINDERS_TOGGLE_KEY } from '../../hooks/useReminders'
import { useSpellcheck } from '../../hooks/useSpellcheck'
import { useTipsEnabled } from '../../hooks/useTips'
import ReminderSettingsModal from '../tools/ReminderSettingsModal'

function ToggleRow({ label, desc, on, onToggle, onOpen, openLabel }) {
  const info = (
    <>
      <span className='flex items-center gap-1 text-text-primary text-base font-bold'>
        {label}
        {onOpen && <ChevronRight className='w-4 h-4 text-text-tertiary' />}
      </span>
      <span className='block text-sm text-text-tertiary font-medium opacity-60'>{desc}</span>
    </>
  )
  return (
    <div className='p-6 flex items-center justify-between gap-6 group hover:bg-overlay-faint transition-colors'>
      {onOpen ? (
        <button
          type='button'
          onClick={onOpen}
          aria-label={openLabel}
          className='space-y-1 text-left min-w-0'
        >
          {info}
        </button>
      ) : (
        <div className='space-y-1'>{info}</div>
      )}
      <button
        type='button'
        role='switch'
        aria-checked={on}
        aria-label={label}
        onClick={onToggle}
        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${on ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border-primary'}`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-text-primary transition-transform ${on ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}

export default function GeneralSettings() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const theme = useSelector(getTheme)
  const fontFamily = useSelector(getFontFamily)
  const editorFontSize = useSelector(getEditorFontSize)
  const [spellcheck, toggleSpellcheck] = useSpellcheck()
  const [reminders, toggleReminders] = useLocalToggle(REMINDERS_TOGGLE_KEY, false)
  const [tipsEnabled, toggleTips] = useTipsEnabled()
  const [reminderTimesOpen, setReminderTimesOpen] = useState(false)
  const closeReminderTimes = useCallback(() => setReminderTimesOpen(false), [])
  const openReminderTimes = useCallback(() => setReminderTimesOpen(true), [])
  const sortBy = useSelector(getSortBy)

  const handleUpdateSetting = (key, value) => {
    dispatch(updateSetting({ key, value }))
  }

  return (
    <div className='space-y-12 max-w-2xl mx-auto'>
      <div className='space-y-1'>
        <h3 className='text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'>
          {t('settings.general.interface')}
        </h3>

        <div className='bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden hardware-accelerated'>
          <div className='p-6 flex items-center justify-between border-border-primary group hover:bg-overlay-faint transition-colors'>
            <div className='space-y-1'>
              <label className='block text-text-primary text-base font-bold'>
                {t('settings.general.appTheme')}
              </label>
              <p className='text-sm text-text-tertiary font-medium opacity-60'>
                Select your preferred aesthetic.
              </p>
            </div>
            <div className='flex bg-bg-tertiary/50 p-1 rounded-xl border border-border-primary'>
              {['System', 'Light', 'Dark'].map((option) => (
                <button
                  key={option}
                  onClick={() => dispatch(setTheme(option.toLowerCase()))}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                    theme === option.toLowerCase()
                      ? 'bg-accent-primary text-accent-on-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-overlay-soft'
                  }`}
                >
                  {t(`settings.general.themes.${option.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className='space-y-1'>
        <h3 className='text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'>
          {t('settings.general.notesList')}
        </h3>
        <div className='bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden hardware-accelerated'>
          <div className='p-6 flex items-center justify-between group hover:bg-overlay-faint transition-colors'>
            <div className='space-y-1'>
              <label className='block text-text-primary text-base font-bold'>
                {t('settings.general.sortNotesBy')}
              </label>
              <p className='text-sm text-text-tertiary font-medium opacity-60'>
                Choose your preferred sorting order.
              </p>
            </div>
            <div className='relative group/select'>
              <select
                value={sortBy}
                onChange={(e) => handleUpdateSetting('sortBy', e.target.value)}
                className='appearance-none bg-bg-tertiary/50 border border-border-primary text-text-primary text-sm font-bold py-2.5 pl-4 pr-10 rounded-xl outline-none focus:border-accent-primary/50 transition-all cursor-pointer hover:bg-bg-tertiary'
              >
                <option value='updatedAt'>{t('settings.general.sortOptions.updatedAt')}</option>
                <option value='createdAt'>{t('settings.general.sortOptions.createdAt')}</option>
                <option value='title'>{t('settings.general.sortOptions.title')}</option>
              </select>
              <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none group-hover/select:text-accent-primary transition-colors' />
            </div>
          </div>
        </div>
      </div>

      <div className='space-y-1'>
        <h3 className='text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'>
          {t('settings.general.editor')}
        </h3>
        <div className='bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden hardware-accelerated'>
          <div className='p-6 flex items-center justify-between border-b border-border-primary group hover:bg-overlay-faint transition-colors'>
            <div className='space-y-1'>
              <label className='block text-text-primary text-base font-bold'>
                {t('settings.general.fontFamily')}
              </label>
              <p className='text-sm text-text-tertiary font-medium opacity-60'>
                Primary typeface for notes.
              </p>
            </div>
            <div className='relative group/select'>
              <select
                value={fontFamily}
                onChange={(e) => handleUpdateSetting('fontFamily', e.target.value)}
                className='appearance-none bg-bg-tertiary/50 border border-border-primary text-text-primary text-sm font-bold py-2.5 pl-4 pr-10 rounded-xl outline-none focus:border-accent-primary/50 transition-all cursor-pointer hover:bg-bg-tertiary'
              >
                <option value='Inter'>{t('settings.general.fontOptions.Inter')}</option>
                <option value='Outfit'>{t('settings.general.fontOptions.Outfit')}</option>
                <option value='Lora'>{t('settings.general.fontOptions.Lora')}</option>
                <option value='Newsreader'>{t('settings.general.fontOptions.Newsreader')}</option>
                <option value='IBM Plex Mono'>
                  {t('settings.general.fontOptions.IBM Plex Mono')}
                </option>
                <option value='System'>{t('settings.general.fontOptions.System')}</option>
                <option value='Serif'>{t('settings.general.fontOptions.Serif')}</option>
                <option value='Mono'>{t('settings.general.fontOptions.Mono')}</option>
              </select>
              <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none group-hover/select:text-accent-primary transition-colors' />
            </div>
          </div>

          <div className='p-6 space-y-4 group hover:bg-overlay-faint transition-colors'>
            <div className='flex items-center justify-between'>
              <div className='space-y-1'>
                <label className='block text-text-primary text-base font-bold'>
                  {t('settings.general.textSize')}
                </label>
                <p className='text-sm text-text-tertiary font-medium opacity-60'>
                  Adjust the editor&apos;s base font size.
                </p>
              </div>
              <span className='text-base font-bold text-accent-primary bg-accent-primary/10 px-3 py-1 rounded-lg'>
                {editorFontSize}px
              </span>
            </div>

            <div className='px-2 pt-4 pb-2'>
              <div className='flex items-end justify-between mb-3 px-1'>
                <span className='text-sm font-bold text-text-tertiary leading-none'>A</span>
                <span className='text-title font-bold text-text-tertiary leading-none'>A</span>
              </div>
              <div className='relative h-6 flex items-center'>
                <input
                  type='range'
                  min='12'
                  max='24'
                  step='1'
                  value={editorFontSize}
                  onChange={(e) => handleUpdateSetting('editorFontSize', parseInt(e.target.value))}
                  className='w-full h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent-primary relative z-10'
                />
                <div className='absolute inset-0 flex justify-between items-center px-1 pointer-events-none'>
                  {[12, 14, 16, 18, 20, 22, 24].map((tick) => (
                    <div
                      key={tick}
                      className={`w-1 h-1 rounded-full ${editorFontSize === tick ? 'bg-accent-primary' : 'bg-overlay-strong'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <ToggleRow
            label={t('settings.general.spellcheck')}
            desc={t('settings.general.spellcheckDesc')}
            on={spellcheck}
            onToggle={toggleSpellcheck}
          />
          <ToggleRow
            label={t('settings.general.reminders')}
            desc={t('settings.general.remindersDesc')}
            on={reminders}
            onToggle={toggleReminders}
            onOpen={openReminderTimes}
            openLabel={t('upcoming.reminders.open')}
          />
          <ToggleRow
            label={t('tips.showTips')}
            desc={t('tips.showTipsDesc')}
            on={tipsEnabled}
            onToggle={toggleTips}
          />
          <ReminderSettingsModal open={reminderTimesOpen} onClose={closeReminderTimes} />
        </div>
      </div>
    </div>
  )
}
