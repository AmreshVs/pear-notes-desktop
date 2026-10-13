import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  getLocalAiIndex,
  getMeaningSearchNotice,
  getRelatedNotesState,
  loadRelatedNotes
} from '@pear-notes/core/store/slices/localAiSlice.js'
import {
  getNotesData,
  getRelatedNoteRows,
  selectNote
} from '@pear-notes/core/store/slices/notesSlice.js'

const CARD = 'rounded-xl border border-border-primary bg-bg-secondary'

export default function RelatedNotesSection({ noteKey }) {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()

  const related = useSelector(getRelatedNotesState)
  const rows = useSelector(getRelatedNoteRows)
  const notesData = useSelector(getNotesData)
  const notice = useSelector(getMeaningSearchNotice)
  const changedAt = useSelector(getLocalAiIndex).changedAt

  const relatedKey = related.noteKey
  useEffect(() => {
    if (noteKey && noteKey === relatedKey) dispatch(loadRelatedNotes(noteKey))
  }, [dispatch, noteKey, relatedKey, changedAt])

  const isLoading = related.forKey !== noteKey && related.status !== 'failed'

  const emptyTitle = isLoading
    ? t('relatedNotes.loading')
    : related.status === 'failed'
      ? t('relatedNotes.failedTitle')
      : t('relatedNotes.emptyTitle')
  const emptyDescription =
    notice?.kind === 'indexing'
      ? t('relatedNotes.indexing', { done: notice.done, total: notice.total })
      : related.status === 'failed'
        ? t('relatedNotes.failedDescription')
        : t('relatedNotes.emptyDescription')

  const dateOf = (key) => {
    const updatedAt = notesData[key]?.updatedAt
    if (!updatedAt) return ''
    const date = new Date(updatedAt)
    return date.toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric',
      ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {})
    })
  }

  return (
    <section className='flex flex-col gap-2'>
      <h3 className='text-xs font-semibold text-text-tertiary'>{t('relatedNotes.title')}</h3>
      {rows.length === 0 ? (
        <div className={`${CARD} px-3 py-3 flex flex-col gap-1`}>
          <p className='text-[13px] font-semibold text-text-primary'>{emptyTitle}</p>
          {!isLoading && (
            <p className='text-xs text-text-tertiary leading-relaxed'>{emptyDescription}</p>
          )}
        </div>
      ) : (
        <div className={`${CARD} p-1.5 flex flex-col`}>
          {rows.map((row) => (
            <button
              key={row.key}
              onClick={() => dispatch(selectNote(row.key))}
              className='w-full text-left px-2.5 py-2 rounded-lg hover:bg-overlay-faint transition-colors flex flex-col gap-0.5'
            >
              <span className='text-[13px] font-semibold text-text-primary truncate'>
                {notesData[row.key]?.title || t('activity.untitledNote')}
              </span>
              <span className='text-xs text-text-tertiary truncate'>
                {[row.snippet, dateOf(row.key)].filter(Boolean).join(' · ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
