import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import { getSyncedDevices } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'

import { authenticate, getBiometricMethodKey, isDeviceAuthSupported } from '../lib/deviceAuth'
import { requestNoteLockPassword, requestNoteLockPasswordCreate } from '../lib/noteLockPasswordFlow'
import { useNoteLockPrompt } from '../lib/noteLockPrompt'
import {
  canUseBiometricUnlock,
  disableBiometricUnlock,
  enableBiometricUnlock,
  isBiometricUnlockOn,
  offerPasswordMigrationFromSettings,
  subscribeBiometricUnlock
} from '../lib/noteLockSession'

export function usePrivacyLock() {
  const { t, i18n } = useTranslation()
  const isPassword = useSelector(getLockMethod) === 'password'
  const devices = useSelector(getSyncedDevices)
  const outdatedDevices = (devices || []).filter((device) => device.sealedNotes === false)
  const outdatedNames = new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
    outdatedDevices.map((device) => device.title || '?')
  )
  const [lockAvailable, setLockAvailable] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricOn, setBiometricOn] = useState(false)
  const [biometricBusy, setBiometricBusy] = useState(false)
  const openPrompt = useNoteLockPrompt()

  useEffect(() => {
    let active = true
    isDeviceAuthSupported().then((supported) => {
      if (active) setLockAvailable(supported)
    })
    return () => {
      active = false
    }
  }, [])

  const [biometricVersion, setBiometricVersion] = useState(0)

  useEffect(() => subscribeBiometricUnlock(() => setBiometricVersion((version) => version + 1)), [])

  useEffect(() => {
    let active = true
    Promise.all([canUseBiometricUnlock(), isBiometricUnlockOn()]).then(([available, on]) => {
      if (!active) return
      setBiometricAvailable(available)
      setBiometricOn(on)
    })
    return () => {
      active = false
    }
  }, [isPassword, openPrompt, biometricVersion])

  useEffect(() => {
    offerPasswordMigrationFromSettings(t('settings.privacy.changeMethodReason'))
  }, [t])

  const setOrChangePassword = useCallback(async () => {
    if (isPassword) {
      if (!(await requestNoteLockPassword('change'))) return
    } else if (lockAvailable && !(await authenticate(t('settings.privacy.changeMethodReason')))) {
      return
    }
    await requestNoteLockPasswordCreate(isPassword ? 'change' : 'set')
  }, [isPassword, lockAvailable, t])

  const toggleBiometric = useCallback(async () => {
    if (biometricBusy) return
    setBiometricBusy(true)
    try {
      if (biometricOn) {
        await disableBiometricUnlock()
        setBiometricOn(false)
      } else {
        const method = t(getBiometricMethodKey())
        setBiometricOn(
          await enableBiometricUnlock(t('noteLockPassword.biometricEnableDesc', { method }))
        )
      }
    } finally {
      setBiometricBusy(false)
    }
  }, [biometricBusy, biometricOn, t])

  return {
    isPassword,
    lockAvailable,
    outdatedDevices,
    outdatedNames,
    biometricAvailable: isPassword && biometricAvailable,
    biometricBlocked: outdatedDevices.length > 0,
    biometricOn,
    biometricBusy,
    setOrChangePassword,
    toggleBiometric
  }
}
