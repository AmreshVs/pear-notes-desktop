import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'

import { getCurrentVault } from '@pear-notes/core/store/slices/vaultsSlice.js'

import { clearUnlockedNotes } from '../lib/noteLock'

const RELOCK_POWER_STATES = new Set(['suspend', 'lock'])

export function useNoteAutoRelock() {
  const vaultId = useSelector(getCurrentVault)?.id || ''
  const vaultRef = useRef(vaultId)

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
