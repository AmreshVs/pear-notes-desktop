import { LockKeyhole, Fingerprint, KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  getLockMethod,
  clearLockPassword,
  loadSettings
} from '@pear-notes/core/store/slices/settingsSlice.js'
import { backendApi } from '@pear-notes/core/backend/api.js'
import { authenticate, isDeviceAuthSupported } from '../lib/deviceAuth'
import { useNoteLockPassword } from '../lib/noteLockPasswordContext'
import NoteLockPasswordModal from './NoteLockPasswordModal'
import { clearUnlockedNotes } from '../lib/noteLock'
import { LOCK_SCREENSHOT_PROTECTION_KEY } from '@pear-notes/core/constant.js'
import { getLockPrivacyPreference, setLockPrivacyPreference } from '@pear-notes/core/utils.js'

const AUTH_METHOD_LABELS = {
  mac: 'Touch ID or your macOS password',
  win: 'Windows Hello or your Windows PIN',
  linux: 'your system authentication'
}

function getAuthMethodLabel () {
  const platform = (typeof navigator !== 'undefined' ? navigator.platform : '').toLowerCase()
  if (platform.includes('mac')) return AUTH_METHOD_LABELS.mac
  if (platform.includes('win')) return AUTH_METHOD_LABELS.win
  return AUTH_METHOD_LABELS.linux
}

const CHANGE_METHOD_REASON = 'Authenticate to change the note lock method'

export default function PrivacySettings() {
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
      const ok = await authenticate(CHANGE_METHOD_REASON)
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
      <div className="space-y-1">
        <h3 className='text-text-secondary font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>Note Lock</h3>
        <div className="bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden backdrop-blur-md hardware-accelerated">
          <div className="p-6 flex items-start justify-between gap-6 border-b border-border-primary group hover:bg-overlay-faint transition-colors">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center">
                <LockKeyhole className="w-5 h-5 text-accent-primary" />
              </div>
              <div className="space-y-1 min-w-0">
                <label className='block text-text-primary text-base font-bold'>Note Lock</label>
                <p className='text-sm text-text-tertiary font-medium opacity-60'>
                  {lockMethod === 'password'
                    ? 'Locked notes unlock with your custom password on all synced devices.'
                    : lockAvailable
                      ? `Locked notes unlock with ${getAuthMethodLabel()}.`
                      : 'Device authentication isn’t set up on this device. Change the lock method from another synced device.'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 flex items-center justify-between gap-6 border-b border-border-primary">
            <div className="space-y-1 min-w-0">
              <label className='block text-text-primary text-base font-bold'>Unlock Method</label>
              <p className='text-sm text-text-tertiary font-medium opacity-60'>Choose how locked notes are unlocked.</p>
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
                Biometric
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
                Password
              </button>
            </div>
          </div>

          <div className="p-6 flex items-center justify-between gap-6">
            <div className="space-y-1 min-w-0">
              <label className='block text-text-primary text-base font-bold'>Block Screenshots</label>
              <p className='text-sm text-text-tertiary font-medium opacity-60'>Exclude the window from screenshots, screen recordings, and window previews while viewing a locked note.</p>
            </div>
            <button
              onClick={handleToggleScreenshotProtection}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${screenshotProtection ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border-primary'}`}
            >
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-text-primary transition-transform ${screenshotProtection ? 'translate-x-5' : ''}`} />
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
