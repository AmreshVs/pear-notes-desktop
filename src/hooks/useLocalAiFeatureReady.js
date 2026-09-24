import { useSelector } from 'react-redux'

import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { selectIsLocalAiFeatureReady } from '@pear-notes/core/store/slices/localAiSlice.js'
import { getNoteData, getSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'

import { useShowAiTools } from '../lib/localAi/aiToolsPreference'

export function useLocalAiFeatureReady(feature) {
  const showAiTools = useShowAiTools()
  const selectedNoteKey = useSelector(getSelectedNote)
  const ready = useSelector(
    (state) =>
      LOCAL_AI_ENABLED &&
      getNoteData(selectedNoteKey)(state)?.locked !== true &&
      selectIsLocalAiFeatureReady(state, feature)
  )
  return showAiTools && ready
}
