import { backendApi } from '@pear-notes/core/backend/api.js'
import * as log from '@pear-notes/core/log.js'
import { getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'
import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import { getCurrentVault } from '@pear-notes/core/store/slices/vaultsSlice.js'
import { store } from '@pear-notes/core/store/store.js'

import {
  authenticate,
  canUseLockRootSecret,
  deleteLockRootKey,
  isDeviceAuthSupported,
  readLockRootKey,
  storeLockRootKey
} from './deviceAuth'
import { markNoteUnlocked } from './noteLock'
import {
  requestNoteLockPassword,
  requestNoteLockPasswordCreate,
  showLockUnavailable
} from './noteLockPasswordFlow'
import { showNoteLockPrompt } from './noteLockPrompt'

const PROMPT_DELAY_MS = 300
const MIGRATION_SEEN_PREF = 'noteLockPasswordPromptSeen'
const BIOMETRIC_ON = 'on'
const BIOMETRIC_OFF = 'off'
const DEVICES_OUTDATED = 'DEVICES_OUTDATED'
const WRONG_KEY = 'WRONG_KEY'

let enrollRequested = false
let enrolledKey = ''

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const biometricPref = (vaultId) => `noteLockBiometric:${vaultId}`

function currentVaultId() {
  return getCurrentVault(store.getState())?.id || ''
}

export function hasLockPassword() {
  return getLockMethod(store.getState()) === 'password'
}

async function readPref(key) {
  try {
    return (await backendApi.getPreference({ key })) || ''
  } catch {
    return ''
  }
}

async function writePref(key, value) {
  try {
    await backendApi.updatePreference({ key, value })
  } catch (e) {
    log.error('note lock preference', e)
  }
}

const biometricListeners = new Set()

export function subscribeBiometricUnlock(listener) {
  biometricListeners.add(listener)
  return () => biometricListeners.delete(listener)
}

async function writeBiometricPref(vaultId, value) {
  await writePref(biometricPref(vaultId), value)
  biometricListeners.forEach((listener) => listener())
}

export function canUseBiometricUnlock() {
  return canUseLockRootSecret()
}

export async function isBiometricUnlockOn() {
  const vaultId = currentVaultId()
  return !!vaultId && (await readPref(biometricPref(vaultId))) === BIOMETRIC_ON
}

async function shouldOfferBiometric() {
  const vaultId = currentVaultId()
  if (!vaultId || (await readPref(biometricPref(vaultId))) !== '') return false
  return canUseBiometricUnlock()
}

async function storeRootKey(rootKey) {
  const vaultId = currentVaultId()
  if (!vaultId || !(await storeLockRootKey(vaultId, rootKey))) return false
  await writeBiometricPref(vaultId, BIOMETRIC_ON)
  return true
}

async function offerBiometric(rootKey) {
  await wait(PROMPT_DELAY_MS)
  const vaultId = currentVaultId()
  if (!vaultId) return
  if (await showNoteLockPrompt('biometricOffer')) {
    await storeRootKey(rootKey)
  } else {
    await writeBiometricPref(vaultId, BIOMETRIC_OFF)
  }
}

async function forgetBiometric(vaultId, offerAgain) {
  await deleteLockRootKey(vaultId)
  await writeBiometricPref(vaultId, offerAgain ? '' : BIOMETRIC_OFF)
}

async function unlockWithBiometric(reason) {
  const vaultId = currentVaultId()
  if (!vaultId || (await readPref(biometricPref(vaultId))) !== BIOMETRIC_ON) return false
  const { cancelled, rootKey } = await readLockRootKey(vaultId, reason)
  if (cancelled) return false
  if (!rootKey) {
    await forgetBiometric(vaultId, true)
    return false
  }
  const result = await backendApi.openLockSession({ rootKey })
  if (result.ok) {
    markNoteUnlocked()
    return true
  }
  if (result.reason === WRONG_KEY) await forgetBiometric(vaultId, true)
  return false
}

export async function submitLockPassword(password) {
  const enrolling = enrollRequested
  const returnRootKey = enrolling || (await shouldOfferBiometric())
  const result = await backendApi.openLockSession({ password, returnRootKey })
  if (!result.ok && result.reason !== DEVICES_OUTDATED) return result
  markNoteUnlocked()
  if (result.rootKey) {
    if (enrolling) enrolledKey = result.rootKey
    else offerBiometric(result.rootKey)
  }
  return { ok: true, retryAfter: 0, reason: result.reason }
}

export async function enableBiometricUnlock(message) {
  enrollRequested = true
  enrolledKey = ''
  const ok = await requestNoteLockPassword('biometric', message)
  enrollRequested = false
  const rootKey = enrolledKey
  enrolledKey = ''
  if (!ok || !rootKey) return false
  return storeRootKey(rootKey)
}

export async function disableBiometricUnlock() {
  const vaultId = currentVaultId()
  if (vaultId) await forgetBiometric(vaultId, false)
}

function hasLockedNotes() {
  const notes = getNotesData(store.getState()) || {}
  return Object.values(notes).some((note) => note?.locked === true)
}

async function offerPasswordMigration() {
  if (hasLockPassword() || (await readPref(MIGRATION_SEEN_PREF)) === 'true') return
  await writePref(MIGRATION_SEEN_PREF, 'true')
  if (!(await showNoteLockPrompt('migration'))) return
  await wait(PROMPT_DELAY_MS)
  await requestNoteLockPasswordCreate()
}

export async function offerPasswordMigrationFromSettings(reason) {
  if (hasLockPassword() || !hasLockedNotes()) return
  if ((await readPref(MIGRATION_SEEN_PREF)) === 'true') return
  if (!(await isDeviceAuthSupported()) || !(await authenticate(reason))) return
  await offerPasswordMigration()
}

export async function unlockLockedNotes(reason, purpose = 'unlock', message = '') {
  if (!hasLockPassword()) {
    if (!(await isDeviceAuthSupported())) {
      showLockUnavailable()
      return false
    }
    if (!(await authenticate(reason))) return false
    await offerPasswordMigration()
    return true
  }
  if (await unlockWithBiometric(reason)) return true
  return requestNoteLockPassword(purpose, message)
}
