import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LockKeyhole } from 'lucide-react'

import { LOCK_SCREENSHOT_PROTECTION_KEY } from '@pear-notes/core/constant.js'
import { getLockPrivacyPreference, setLockPrivacyPreference } from '@pear-notes/core/utils.js'

import { usePrivacyLock } from '../../hooks/usePrivacyLock'
import { getBiometricMethodKey } from '../../lib/deviceAuth'
import { clearUnlockedNotes } from '../../lib/noteLock'

import OutdatedDevicesRow from './OutdatedDevicesRow'
import SettingsToggle from './SettingsToggle'

const ROW_CLASS = 'p-6 flex items-center justify-between gap-6 border-b border-border-primary'
const ROW_TITLE_CLASS = 'block text-text-primary text-base font-bold'
const ROW_DESC_CLASS = 'text-sm text-text-tertiary font-medium opacity-60'

const AUTH_METHOD_LABELS = {
  mac: 'Touch ID or your macOS password',
  win: 'Windows Hello or your Windows PIN',
  linux: 'your system authentication'
}

function getAuthMethodLabel() {
  const platform = (typeof navigator !== 'undefined' ? navigator.platform : '').toLowerCase()
  if (platform.includes('mac')) return AUTH_METHOD_LABELS.mac
  if (platform.includes('win')) return AUTH_METHOD_LABELS.win
  return AUTH_METHOD_LABELS.linux
}

export default function PrivacySettings() {
  const { t } = useTranslation()
  const {
    isPassword,
    lockAvailable,
    outdatedDevices,
    outdatedNames,
    biometricAvailable,
    biometricBlocked,
    biometricOn,
    biometricBusy,
    setOrChangePassword,
    toggleBiometric
  } = usePrivacyLock()
  const [screenshotProtection, setScreenshotProtection] = useState(true)
  const biometricMethodKey = getBiometricMethodKey()
  const biometricMethod = biometricMethodKey ? t(biometricMethodKey) : ''

  useEffect(() => {
    let active = true
    getLockPrivacyPreference(LOCK_SCREENSHOT_PROTECTION_KEY).then((v) => {
      if (active) setScreenshotProtection(v)
    })
    return () => {
      active = false
    }
  }, [])

  const handleToggleScreenshotProtection = () => {
    const next = !screenshotProtection
    setScreenshotProtection(next)
    setLockPrivacyPreference(LOCK_SCREENSHOT_PROTECTION_KEY, next)
    clearUnlockedNotes()
  }

  return (
    <div className='space-y-12 max-w-2xl mx-auto'>
      <div className='space-y-1'>
        <h3 className='text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'>
          {t('settings.privacy.noteLock')}
        </h3>
        <div className='bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden hardware-accelerated'>
          <div className='p-6 flex items-start justify-between gap-6 border-b border-border-primary group hover:bg-overlay-faint transition-colors'>
            <div className='flex items-center gap-4 min-w-0'>
              <div className='flex-shrink-0 w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center'>
                <LockKeyhole className='w-5 h-5 text-accent-primary' />
              </div>
              <div className='space-y-1 min-w-0'>
                <p className={ROW_DESC_CLASS}>
                  {isPassword
                    ? t('settings.privacy.noteLockPasswordDesc')
                    : lockAvailable
                      ? t('settings.privacy.noteLockDesc', { method: getAuthMethodLabel() })
                      : t('settings.privacy.noteLockUnavailableDesc')}
                </p>
              </div>
            </div>
          </div>

          <div className={ROW_CLASS}>
            <div className='space-y-1 min-w-0'>
              <label className={ROW_TITLE_CLASS}>{t('settings.privacy.lockPassword')}</label>
              <p className={ROW_DESC_CLASS}>{t('settings.privacy.attachmentsEncrypted')}</p>
            </div>
            <button
              onClick={setOrChangePassword}
              className='px-4 py-2 rounded-xl text-sm font-bold text-accent-primary bg-bg-tertiary/50 border border-border-primary hover:bg-overlay-soft transition-all active:scale-95 shrink-0'
            >
              {isPassword
                ? t('settings.privacy.lockPasswordChange')
                : t('settings.privacy.lockPasswordSet')}
            </button>
          </div>

          {biometricAvailable && biometricMethod && (
            <div className={ROW_CLASS}>
              <div className='space-y-1 min-w-0'>
                <label className={ROW_TITLE_CLASS}>
                  {t('settings.privacy.biometricUnlock', { method: biometricMethod })}
                </label>
                <p className={ROW_DESC_CLASS}>
                  {biometricBlocked
                    ? t('settings.privacy.biometricUnlockOutdated', {
                        devices: outdatedNames,
                        count: outdatedDevices.length
                      })
                    : t('settings.privacy.biometricUnlockDesc')}
                </p>
              </div>
              <SettingsToggle
                on={biometricOn && !biometricBlocked}
                disabled={biometricBusy || biometricBlocked}
                onClick={toggleBiometric}
                label={t('settings.privacy.biometricUnlock', { method: biometricMethod })}
              />
            </div>
          )}

          {outdatedDevices.length > 0 && <OutdatedDevicesRow devices={outdatedDevices} />}

          <div className='p-6 flex items-center justify-between gap-6'>
            <div className='space-y-1 min-w-0'>
              <label className='block text-text-primary text-base font-bold'>
                {t('settings.privacy.blockScreenshots')}
              </label>
              <p className='text-sm text-text-tertiary font-medium opacity-60'>
                {t('settings.privacy.blockScreenshotsDesc')}
              </p>
            </div>
            <button
              onClick={handleToggleScreenshotProtection}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${screenshotProtection ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border-primary'}`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-text-primary transition-transform ${screenshotProtection ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
