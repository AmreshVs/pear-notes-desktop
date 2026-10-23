import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'

import { getCurrentVault } from '@pear-notes/core/store/slices/vaultsSlice.js'

import { clearUnlockedNotes, useHasUnlockedNotes } from '../lib/noteLock'

const RELOCK_POWER_STATES = new Set(['suspend', 'lock'])
const RELOCK_IDLE_MS = 15 * 60 * 1000
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel']

export function useNoteAutoRelock() {
  const vaultId = useSelector(getCurrentVault)?.id || ''
  const vaultRef = useRef(vaultId)
  const unlocked = useHasUnlockedNotes()

  useEffect(() => {
    if (!unlocked) return
    let timer = null
    const restart = () => {
      clearTimeout(timer)
      timer = setTimeout(() => clearUnlockedNotes({ afterPendingSaves: true }), RELOCK_IDLE_MS)
    }
    restart()
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, restart, { passive: true })
    return () => {
      clearTimeout(timer)
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, restart)
    }
  }, [unlocked])

  useEffect(() => {
    if (!window.electronBridge?.onPowerState) return
    return window.electronBridge.onPowerState((state) => {
      if (RELOCK_POWER_STATES.has(state)) clearUnlockedNotes({ afterPendingSaves: true })
    })
  }, [])

  useEffect(() => {
    if (vaultRef.current === vaultId) return
    vaultRef.current = vaultId
    clearUnlockedNotes()
  }, [vaultId])
}
