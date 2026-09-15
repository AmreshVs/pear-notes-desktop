import { useSelector } from 'react-redux'

import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { selectIsLocalAiFeatureReady } from '@pear-notes/core/store/slices/localAiSlice.js'
import { getNoteData, getSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'

export function useLocalAiFeatureReady(feature) {
  const selectedNoteKey = useSelector(getSelectedNote)
  return useSelector(
    (state) =>
      LOCAL_AI_ENABLED &&
      getNoteData(selectedNoteKey)(state)?.locked !== true &&
      selectIsLocalAiFeatureReady(state, feature)
  )
}
