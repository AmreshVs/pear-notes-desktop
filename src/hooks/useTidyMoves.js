import { useEffect, useState } from 'react'
import { useSelector, useStore } from 'react-redux'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { suggestFolderMoves } from '@pear-notes/core/store/services/noteTidy.js'
import { getFoldersData } from '@pear-notes/core/store/slices/foldersSlice.js'
import { getLocalAiIndex } from '@pear-notes/core/store/slices/localAiSlice.js'
import { getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

const NO_MOVES = []

export function useTidyMoves(enabled) {
  const store = useStore()
  const changedAt = useSelector((state) => getLocalAiIndex(state).changedAt)
  const [moves, setMoves] = useState([])

  useEffect(() => {
    if (!enabled) return
    let active = true
    const state = store.getState()
    suggestFolderMoves({
      api: backendApi,
      notes: getNotesData(state) ?? {},
      folders: getFoldersData(state) ?? {}
    })
      .then((found) => active && setMoves(found))
      .catch(() => active && setMoves([]))
    return () => {
      active = false
    }
  }, [enabled, changedAt, store])

  return enabled ? moves : NO_MOVES
}
