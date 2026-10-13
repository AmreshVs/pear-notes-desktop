import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Copy, Type } from 'lucide-react'

import { SUGGESTION_KIND } from '@pear-notes/core/store/services/noteSuggestions.js'
import {
  acceptUpcomingTitle,
  dismissNoteSuggestion,
  loadUpcomingSuggestions,
  snoozeUpcomingSuggestion
} from '@pear-notes/core/store/slices/localAiSlice.js'
import {
  getNotesData,
  getUpcomingSuggestions,
  previewMergeNotes,
  upcomingDuplicateId
} from '@pear-notes/core/store/slices/notesSlice.js'

import { TOOL_GROUP_HEADER_CLASS } from './ToolPanel'

const BUTTON_CLASS = 'px-3 py-1.5 rounded-full text-[13px] font-bold transition-colors'
const PRIMARY_CLASS = `${BUTTON_CLASS} bg-accent-primary text-accent-on-primary hover:bg-accent-primary/90`
const SECONDARY_CLASS = `${BUTTON_CLASS} bg-bg-tertiary text-text-primary hover:bg-overlay-light`

function SuggestionRow({ icon: Icon, text, primary, secondary, onPrimary, onSecondary, last }) {
  return (
    <div
      className={`pl-6 pr-4 py-3 flex items-start gap-3 ${last ? '' : 'border-b border-overlay-subtle'}`}
    >
      <Icon className='w-4 h-4 mt-0.5 flex-shrink-0 text-accent-primary' aria-hidden='true' />
      <div className='min-w-0 flex-1 flex flex-col gap-2'>
        <p className='text-[15px] text-text-primary leading-snug'>{text}</p>
        <div className='flex gap-2'>
          <button type='button' onClick={onPrimary} className={PRIMARY_CLASS}>
            {primary}
          </button>
          <button type='button' onClick={onSecondary} className={SECONDARY_CLASS}>
            {secondary}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UpcomingSuggestions() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const { duplicate, title } = useSelector(getUpcomingSuggestions)
  const notesData = useSelector(getNotesData)

  useEffect(() => {
    dispatch(loadUpcomingSuggestions())
  }, [dispatch])

  if (!duplicate && !title) return null
  const noteTitle = (key) => notesData?.[key]?.title || t('noteCard.untitled')
  const titledAt = title
    ? notesData?.[title.noteKey]?.createdAt || notesData?.[title.noteKey]?.updatedAt
    : null

  return (
    <div className='mb-6'>
      <h3 className={TOOL_GROUP_HEADER_CLASS}>{t('upcoming.suggestions.title')}</h3>
      {duplicate && (
        <SuggestionRow
          icon={Copy}
          text={t('upcoming.suggestions.duplicate', {
            a: noteTitle(duplicate.a),
            b: noteTitle(duplicate.b)
          })}
          primary={t('upcoming.suggestions.reviewMerge')}
          secondary={t('upcoming.suggestions.notNow')}
          onPrimary={() => dispatch(previewMergeNotes({ keys: [duplicate.a, duplicate.b] }))}
          onSecondary={() => dispatch(snoozeUpcomingSuggestion(upcomingDuplicateId(duplicate)))}
          last={!title}
        />
      )}
      {title && (
        <SuggestionRow
          icon={Type}
          text={t('upcoming.suggestions.name', {
            title: title.title,
            date: titledAt
              ? new Date(titledAt).toLocaleDateString(i18n.language, {
                  month: 'short',
                  day: 'numeric'
                })
              : ''
          })}
          primary={t('upcoming.suggestions.useTitle')}
          secondary={t('upcoming.suggestions.dismiss')}
          onPrimary={() => dispatch(acceptUpcomingTitle(title))}
          onSecondary={() =>
            dispatch(dismissNoteSuggestion({ noteKey: title.noteKey, kind: SUGGESTION_KIND.TITLE }))
          }
          last
        />
      )}
      <p className='px-6 pt-3 text-xs text-text-tertiary'>{t('upcoming.suggestions.footer')}</p>
    </div>
  )
}
