import { useState } from 'react'
import { useSelector } from 'react-redux'

import { getNotes } from '@pear-notes/core/store/slices/notesSlice.js'
import { getCanAddVault, getVaults } from '@pear-notes/core/store/slices/vaultsSlice.js'

export const JOIN_CHOICE = { separate: 'separate', combine: 'combine' }

export function useJoinChoice() {
  const notes = useSelector(getNotes)
  const canAdd = useSelector(getCanAddVault)
  const vaults = useSelector(getVaults)
  const [picked, setChoice] = useState(null)
  const hasNotes = notes.length > 0
  const choice = picked === JOIN_CHOICE.combine ? picked : canAdd ? JOIN_CHOICE.separate : null

  return {
    openVault: vaults.find((vault) => vault.current),
    hasNotes,
    canAdd,
    choice,
    setChoice,
    keepsSeparate: hasNotes && choice === JOIN_CHOICE.separate,
    choiceMade: !hasNotes || !!choice
  }
}

export function buildJoinRequest(invite, keepsSeparate, vaultName) {
  return keepsSeparate ? { invite, mode: 'add', vaultName } : { invite }
}
