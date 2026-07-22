import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Database,
  HardDrive,
  RefreshCw,
  Settings as SettingsIcon,
  ShieldCheck,
  X
} from 'lucide-react'

import { useDialog } from '../../hooks/useDialog'
import { version as appVersion } from '../../../package.json'

import BackupSettings from './BackupSettings'
import GeneralSettings from './GeneralSettings'
import PrivacySettings from './PrivacySettings'
import StorageSettings from './StorageSettings'
import SyncSettings from './SyncSettings'

export default function SettingsScreen({ onClose }) {
  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState('general')
  const [isExiting, setIsExiting] = useState(false)
  const contentScrollRef = useRef(null)

  useEffect(() => {
    if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0
  }, [activeSection])

  const handleAnimatedClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(onClose, 300)
  }, [onClose])

  const dialogRef = useDialog(handleAnimatedClose)

  const sections = [
    { id: 'general', name: t('layouts.general'), icon: SettingsIcon },
    { id: 'privacy', name: t('layouts.privacyAndSecurity'), icon: ShieldCheck },
    { id: 'sync', name: t('layouts.linkAndSync'), icon: RefreshCw },
    { id: 'backup', name: t('layouts.backupRestore'), icon: HardDrive },
    { id: 'storage', name: t('layouts.storage'), icon: Database }
  ]

  return (
    <div className='fixed inset-0 flex items-center justify-center z-[110] p-6'>
      <div
        className={`absolute inset-0 bg-backdrop-light backdrop-blur-xl animate-in ${isExiting ? 'animate-out fade-out' : 'fade-in'} duration-300 cursor-pointer`}
        onClick={handleAnimatedClose}
      />

      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-label={t('settings.title')}
        tabIndex={-1}
        className={`relative bg-bg-panel/95 backdrop-blur-3xl border border-border-primary rounded-[2.5rem] w-full max-w-5xl h-[80vh] flex shadow-xl overflow-hidden outline-none animate-in ${isExiting ? 'animate-out zoom-out-95 slide-out-to-bottom-8' : 'zoom-in-95 slide-in-from-bottom-8'} duration-300 ease-out`}
      >
        <div className='absolute -top-48 -left-48 w-96 h-96 bg-accent-primary/10 blur-[120px] rounded-full pointer-events-none' />
        <div className='absolute -bottom-48 -right-48 w-96 h-96 bg-accent-primary/5 blur-[120px] rounded-full pointer-events-none' />

        <div className='w-72 bg-overlay-faint border-r border-border-primary flex flex-col relative z-10'>
          <div className='p-8'>
            <h2 className='text-text-primary font-black text-2xl tracking-tighter'>{t('settings.title')}</h2>
          </div>

          <div className='flex-1 overflow-y-auto px-4 space-y-2'>
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-colors duration-0 relative group
                    ${
                      isActive
                        ? 'bg-[var(--accent-selected-bg)] text-accent-primary border border-[var(--accent-selected-border)]'
                        : 'text-text-secondary hover:bg-overlay-light hover:text-text-primary border border-transparent'
                    }`}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-all duration-0 ${isActive ? 'scale-110 opacity-100' : 'group-hover:scale-105 opacity-60 group-hover:opacity-100'}`}
                  />
                  <span
                    className={`text-base tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}
                  >
                    {section.name}
                  </span>
                </button>
              )
            })}
          </div>

          <div className='px-6 pb-6'>
            <p className='text-text-tertiary text-xs text-center opacity-50'>v{appVersion}</p>
          </div>
        </div>

        <div className='flex-1 flex flex-col overflow-hidden bg-transparent relative z-10'>
          <div className='px-10 py-10 flex items-center justify-between'>
            <div>
              <h2 className='text-text-primary text-3xl font-black tracking-tighter'>
                {sections.find((s) => s.id === activeSection)?.name || t('settings.title')}
              </h2>
              <p className='text-sm mt-2 text-text-tertiary font-medium opacity-70 max-w-md leading-relaxed'>
                {activeSection === 'general' &&
                  t('settings.descriptions.general')}
                {activeSection === 'privacy' &&
                  t('settings.privacy.screenDesc')}
                {activeSection === 'sync' &&
                  t('settings.descriptions.sync')}
                {activeSection === 'backup' &&
                  t('settings.descriptions.backup')}
                {activeSection === 'storage' &&
                  t('settings.descriptions.storage')}
              </p>
            </div>
            <button
              onClick={handleAnimatedClose}
              className='p-3 bg-overlay-subtle hover:bg-overlay-medium text-text-tertiary hover:text-text-primary rounded-xl transition-all active:scale-90 border border-overlay-soft align-self-start'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          <div ref={contentScrollRef} className='flex-1 overflow-y-auto px-10 pb-10'>
            {activeSection === 'general' && <GeneralSettings />}
            {activeSection === 'privacy' && <PrivacySettings />}
            {activeSection === 'sync' && <SyncSettings onClose={handleAnimatedClose} />}
            {activeSection === 'backup' && <BackupSettings />}
            {activeSection === 'storage' && <StorageSettings />}
          </div>
        </div>
      </div>
    </div>
  )
}
