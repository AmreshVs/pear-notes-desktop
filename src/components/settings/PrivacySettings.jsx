import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Fingerprint, KeyRound, LockKeyhole } from 'lucide-react'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { LOCK_SCREENSHOT_PROTECTION_KEY } from '@pear-notes/core/constant.js'
import {
  clearLockPassword,
  getLockMethod,
  loadSettings
} from '@pear-notes/core/store/slices/settingsSlice.js'
import { getLockPrivacyPreference, setLockPrivacyPreference } from '@pear-notes/core/utils.js'

import { authenticate, isDeviceAuthSupported } from '../../lib/deviceAuth'
import { clearUnlockedNotes } from '../../lib/noteLock'
import { useNoteLockPassword } from '../../lib/noteLockPasswordContext'
import NoteLockPasswordModal from '../modals/NoteLockPasswordModal'

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
  const dispatch = useDispatch()
  const lockMethod = useSelector(getLockMethod)
  const { requestUnlockPassword } = useNoteLockPassword()
  const [lockAvailable, setLockAvailable] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [screenshotProtection, setScreenshotProtection] = useState(true)

  useEffect(() => {
    let active = true
    isDeviceAuthSupported().then((supported) => {
      if (active) setLockAvailable(supported)
    })
    getLockPrivacyPreference(LOCK_SCREENSHOT_PROTECTION_KEY).then((v) => {
      if (active) setScreenshotProtection(v)
    })
    return () => {
      active = false
    }
  }, [])

  const handleSelectBiometric = async () => {
    if (!lockAvailable) return
    if (lockMethod !== 'password') return
    const ok = await requestUnlockPassword()
    if (ok) dispatch(clearLockPassword())
  }

  const passwordDisabled = lockMethod !== 'password' && !lockAvailable

  const handleSelectPassword = async () => {
    if (lockMethod === 'password') {
      const ok = await requestUnlockPassword()
      if (!ok) return
    } else {
      if (!lockAvailable) return
      const ok = await authenticate(t('settings.privacy.changeMethodReason'))
      if (!ok) return
    }
    setShowPasswordModal(true)
  }

  const handleSubmitPassword = async (password) => {
    const done = await backendApi.setNoteLockPassword({ password })
    if (done) dispatch(loadSettings())
    setShowPasswordModal(false)
  }

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
        <div className='bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden backdrop-blur-md hardware-accelerated'>
          <div className='p-6 flex items-start justify-between gap-6 border-b border-border-primary group hover:bg-overlay-faint transition-colors'>
            <div className='flex items-center gap-4 min-w-0'>
              <div className='flex-shrink-0 w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center'>
                <LockKeyhole className='w-5 h-5 text-accent-primary' />
              </div>
              <div className='space-y-1 min-w-0'>
                <p className='text-sm text-text-tertiary font-medium opacity-60'>
                  {lockMethod === 'password'
                    ? t('settings.privacy.noteLockPasswordDesc')
                    : lockAvailable
                      ? t('settings.privacy.noteLockDesc', { method: getAuthMethodLabel() })
                      : t('settings.privacy.noteLockUnavailableDesc')}
                </p>
              </div>
            </div>
          </div>

          <div className='p-6 flex items-center justify-between gap-6 border-b border-border-primary'>
            <div className='space-y-1 min-w-0'>
              <label className='block text-text-primary text-base font-bold'>
                {t('settings.privacy.unlockMethod')}
              </label>
              <p className='text-sm text-text-tertiary font-medium opacity-60'>
                {t('settings.privacy.unlockMethodDesc')}
              </p>
            </div>
            <div className='flex bg-bg-tertiary/50 p-1 rounded-xl border border-border-primary shrink-0'>
              <button
                onClick={handleSelectBiometric}
                disabled={!lockAvailable}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed ${
                  lockMethod !== 'password'
                    ? 'bg-accent-primary text-accent-on-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-overlay-soft'
                }`}
              >
                <Fingerprint className='w-4 h-4' />
                {t('settings.privacy.biometric')}
              </button>
              <button
                onClick={handleSelectPassword}
                disabled={passwordDisabled}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed ${
                  lockMethod === 'password'
                    ? 'bg-accent-primary text-accent-on-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-overlay-soft'
                }`}
              >
                <KeyRound className='w-4 h-4' />
                {t('settings.privacy.password')}
              </button>
            </div>
          </div>

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

      <NoteLockPasswordModal
        open={showPasswordModal}
        mode='create'
        onSubmit={handleSubmitPassword}
        onCancel={() => setShowPasswordModal(false)}
      />
    </div>
  )
}
