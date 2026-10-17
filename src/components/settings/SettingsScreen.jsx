import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  ArrowLeft,
  Database,
  HardDrive,
  History,
  Laptop,
  Layers,
  PieChart,
  RefreshCw,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react'

import { isMultiVaultEnabled } from '@pear-notes/core/constant.js'
import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { getVaults } from '@pear-notes/core/store/slices/vaultsSlice.js'

import { version as appVersion } from '../../../package.json'
import { useDialog } from '../../hooks/useDialog'
import { getAppVersionLabel } from '../../lib/appFlags'
import { getVaultLabel } from '../../lib/vaultNames'

import ActivitySettings from './ActivitySettings'
import BackupSettings from './BackupSettings'
import DebugSettings from './DebugSettings'
import DevicesSettings from './DevicesSettings'
import DeviceStorageSettings from './DeviceStorageSettings'
import ErrorLogSettings from './ErrorLogSettings'
import GeneralSettings from './GeneralSettings'
import LocalAiSettings from './LocalAiSettings'
import PrivacySettings from './PrivacySettings'
import SyncSettings from './SyncSettings'
import VaultsSettings from './VaultsSettings'
import VaultStorageSettings from './VaultStorageSettings'

const FAQ_URL = 'https://amreshvs.github.io/pear-notes/faq/'

const SETTINGS_GROUPS = ['vault', 'device']

export default function SettingsScreen({ onClose, initialSection = 'general' }) {
  const { t } = useTranslation()
  const [selectedSection, setSelectedSection] = useState(initialSection)
  const [isExiting, setIsExiting] = useState(false)
  const [addingDevice, setAddingDevice] = useState(false)
  const contentScrollRef = useRef(null)

  const activeSection = selectedSection
  const vaults = useSelector(getVaults)
  const devicesTitle =
    vaults.length > 1
      ? t('sync.devicesIn', {
          name: getVaultLabel(
            vaults.find((vault) => vault.current),
            t
          )
        })
      : t('layouts.linkDevices')

  const isAddingDevice = addingDevice && activeSection === 'devices'

  useEffect(() => {
    if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0
  }, [activeSection, isAddingDevice])

  const selectSection = useCallback((id) => {
    setAddingDevice(false)
    setSelectedSection(id)
  }, [])

  const handleAnimatedClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(onClose, 300)
  }, [onClose])

  const dialogRef = useDialog(handleAnimatedClose)

  const sections = [
    { id: 'general', group: 'vault', name: t('layouts.general'), icon: SettingsIcon },
    { id: 'privacy', group: 'vault', name: t('layouts.privacyAndSecurity'), icon: ShieldCheck },
    {
      id: 'devices',
      group: 'vault',
      name: t('layouts.linkDevices'),
      title: devicesTitle,
      icon: Laptop
    },
    { id: 'sync', group: 'vault', name: t('layouts.sync'), icon: RefreshCw },
    { id: 'activity', group: 'vault', name: t('layouts.activity'), icon: History },
    { id: 'backup', group: 'vault', name: t('layouts.backupRestore'), icon: HardDrive },
    { id: 'vaultStorage', group: 'vault', name: t('layouts.vaultStorage'), icon: PieChart },
    ...(LOCAL_AI_ENABLED
      ? [{ id: 'onDeviceAi', group: 'device', name: t('layouts.onDeviceAi'), icon: Sparkles }]
      : []),
    { id: 'storage', group: 'device', name: t('layouts.storage'), icon: Database },
    ...(isMultiVaultEnabled()
      ? [{ id: 'vaults', group: 'device', name: t('layouts.vaults'), icon: Layers }]
      : [])
  ]
  const sectionGroups = SETTINGS_GROUPS.map((group) =>
    sections.filter((section) => section.group === group)
  ).filter((group) => group.length > 0)

  // Diagnostics is not a sidebar entry: it is reached from the visible link at the
  // foot of the Sync page. Nothing in the app is gesture-gated.
  const allSections = [
    ...sections,
    { id: 'debug', name: t('layouts.debug') },
    { id: 'errorLog', name: t('layouts.errorLog') }
  ]

  const headerSection = allSections.find((s) => s.id === activeSection)

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
        className={`relative bg-bg-panel/95 border border-border-primary rounded-[2.5rem] w-full max-w-5xl h-[80vh] flex shadow-xl overflow-hidden outline-none will-change-transform animate-in ${isExiting ? 'animate-out zoom-out-95 slide-out-to-bottom-8' : 'zoom-in-95 slide-in-from-bottom-8'} duration-300 ease-out`}
      >
        <div className='absolute -top-48 -left-48 w-96 h-96 bg-accent-primary/10 blur-[120px] rounded-full pointer-events-none' />
        <div className='absolute -bottom-48 -right-48 w-96 h-96 bg-accent-primary/5 blur-[120px] rounded-full pointer-events-none' />

        <div className='w-72 bg-overlay-faint border-r border-border-primary flex flex-col relative z-10'>
          <div className='p-8'>
            <h2 className='text-text-primary font-black text-2xl tracking-tighter'>
              {t('settings.title')}
            </h2>
          </div>

          <div className='flex-1 overflow-y-auto px-4'>
            {sectionGroups.map((group, index) => (
              <div
                key={group[0].group}
                className={`space-y-2 ${index > 0 ? 'pt-3 mt-3 border-t border-border-primary/60' : ''}`}
              >
                {group.map((section) => {
                  const Icon = section.icon
                  const isActive = activeSection === section.id
                  return (
                    <button
                      key={section.id}
                      onClick={() => selectSection(section.id)}
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
            ))}
          </div>

          <div className='px-6 pb-6 flex flex-col items-center gap-2'>
            <p className='text-text-tertiary text-xs text-center opacity-50 select-none'>
              {getAppVersionLabel(appVersion)}
            </p>
            <button
              type='button'
              onClick={() => window.electronBridge.openExternal(FAQ_URL)}
              className='text-accent-primary text-xs font-semibold hover:underline'
            >
              {t('settings.helpAndFaq')}
            </button>
          </div>
        </div>

        <div className='flex-1 flex flex-col overflow-hidden bg-transparent relative z-10'>
          <div className='px-10 py-10 flex items-center justify-between'>
            <div>
              {isAddingDevice ? (
                <div className='flex items-center gap-3'>
                  <button
                    type='button'
                    onClick={() => setAddingDevice(false)}
                    aria-label={t('sync.add.back')}
                    className='p-2 -ml-2 text-text-tertiary hover:text-text-primary hover:bg-overlay-subtle rounded-xl transition-all active:scale-90'
                  >
                    <ArrowLeft className='w-6 h-6' />
                  </button>
                  <h2 className='text-text-primary text-3xl font-black tracking-tighter'>
                    {t('sync.add.title')}
                  </h2>
                </div>
              ) : (
                <h2 className='text-text-primary text-3xl font-black tracking-tighter'>
                  {headerSection?.title || headerSection?.name || t('settings.title')}
                </h2>
              )}
              <p className='text-sm mt-2 text-text-tertiary font-medium opacity-70 max-w-md leading-relaxed'>
                {activeSection === 'general' && t('settings.descriptions.general')}
                {activeSection === 'privacy' && t('settings.privacy.screenDesc')}
                {activeSection === 'onDeviceAi' && t('settings.descriptions.onDeviceAi')}
                {activeSection === 'vaults' && t('settings.descriptions.vaults')}
                {activeSection === 'sync' && t('settings.descriptions.sync')}
                {activeSection === 'activity' && t('settings.descriptions.activity')}
                {activeSection === 'backup' && t('settings.descriptions.backup')}
                {activeSection === 'storage' && t('settings.descriptions.storage')}
                {activeSection === 'vaultStorage' && t('settings.descriptions.vaultStorage')}
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
            {LOCAL_AI_ENABLED && activeSection === 'onDeviceAi' && <LocalAiSettings />}
            {isMultiVaultEnabled() && activeSection === 'vaults' && (
              <VaultsSettings onOpenDevices={() => selectSection('devices')} />
            )}
            {activeSection === 'devices' && (
              <DevicesSettings adding={isAddingDevice} onAdd={() => setAddingDevice(true)} />
            )}
            {activeSection === 'sync' && (
              <SyncSettings onOpenDiagnostics={() => selectSection('debug')} />
            )}
            {activeSection === 'activity' && <ActivitySettings />}
            {activeSection === 'backup' && <BackupSettings />}
            {activeSection === 'storage' && (
              <DeviceStorageSettings
                onOpenOnDeviceAi={() => selectSection('onDeviceAi')}
                onOpenVaultStorage={() => selectSection('vaultStorage')}
              />
            )}
            {activeSection === 'vaultStorage' && <VaultStorageSettings />}
            {activeSection === 'debug' && (
              <DebugSettings onOpenErrorLog={() => selectSection('errorLog')} />
            )}
            {activeSection === 'errorLog' && <ErrorLogSettings />}
          </div>
        </div>
      </div>
    </div>
  )
}
