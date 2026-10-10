import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Sparkles, X } from 'lucide-react'

import { SUGGESTION_KIND } from '@pear-notes/core/store/services/noteSuggestions.js'
import {
  clearNoteSuggestion,
  dismissNoteSuggestion,
  getNoteSuggestions
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

export default function NoteSuggestionChips({ noteKey, onAcceptTitle }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const suggestions = useSelector(getNoteSuggestions)
  const savedTitle = useSelector((state) => getNotesData(state)?.[noteKey]?.title)
  if (!noteKey || suggestions.noteKey !== noteKey || !suggestions.title) return null
  if (String(savedTitle ?? '').trim()) return null

  const accept = () => {
    onAcceptTitle(suggestions.title)
    dispatch(clearNoteSuggestion({ noteKey, kind: SUGGESTION_KIND.TITLE }))
  }

  return (
    <div className='flex items-center gap-2 -mt-2 mb-4 min-w-0'>
      <button
        type='button'
        onClick={accept}
        title={t('suggestions.useTitleHint')}
        className='inline-flex items-center gap-2 min-w-0 rounded-full border border-[var(--accent-selected-border)] bg-[var(--accent-selected-bg)] px-3 py-1 text-sm text-text-primary hover:text-accent-primary'
      >
        <Sparkles className='w-4 h-4 text-accent-primary flex-shrink-0' aria-hidden='true' />
        <span className='truncate'>{t('suggestions.title', { title: suggestions.title })}</span>
      </button>
      <button
        type='button'
        className='rounded-full p-1 text-text-tertiary hover:bg-overlay-light hover:text-text-primary'
        onClick={() => dispatch(dismissNoteSuggestion({ noteKey, kind: SUGGESTION_KIND.TITLE }))}
        aria-label={t('suggestions.dismiss')}
        title={t('suggestions.dismiss')}
      >
        <X className='w-3.5 h-3.5' />
      </button>
    </div>
  )
}
