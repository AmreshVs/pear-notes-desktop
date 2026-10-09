import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Link2, X } from 'lucide-react'

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

export default function RelatedNotesPanel({ noteKey, noteTitle, onClose }) {
  const { t } = useTranslation()
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

  return (
    <aside
      aria-label={t('relatedNotes.title')}
      className='w-[26rem] shrink-0 border-l border-border-primary bg-bg-panel/80 backdrop-blur-2xl flex flex-col animate-in slide-in-from-right-4 fade-in duration-300'
    >
      <div className='px-6 py-5 flex items-start justify-between gap-3 border-b border-border-primary'>
        <div className='min-w-0'>
          <h2 className='text-text-primary font-black text-lg tracking-tight'>
            {t('relatedNotes.title')}
          </h2>
          <p className='text-xs text-text-tertiary font-medium truncate mt-0.5'>
            {noteTitle || t('activity.untitledNote')}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          className='p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-overlay-subtle transition-colors active:scale-90'
        >
          <X className='w-4 h-4' />
        </button>
      </div>

      <div className='flex-1 overflow-y-auto px-5 py-5'>
        {rows.length === 0 ? (
          <div className='flex flex-col items-center text-center gap-3 py-12'>
            <div className='w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center'>
              <Link2 className='w-5 h-5 text-text-tertiary' />
            </div>
            <p className='text-text-primary font-bold text-sm'>{emptyTitle}</p>
            {!isLoading && (
              <p className='text-xs text-text-tertiary max-w-[16rem] leading-relaxed'>
                {emptyDescription}
              </p>
            )}
          </div>
        ) : (
          <div className='space-y-2'>
            {rows.map((row) => (
              <button
                key={row.key}
                onClick={() => dispatch(selectNote(row.key))}
                className='w-full text-left px-4 py-3 rounded-2xl bg-bg-secondary border border-border-primary hover:bg-overlay-faint transition-colors'
              >
                <span className='block text-sm font-bold text-text-primary truncate'>
                  {notesData[row.key]?.title || t('activity.untitledNote')}
                </span>
                {row.snippet && (
                  <span className='block text-xs text-text-tertiary mt-1 line-clamp-2 leading-relaxed'>
                    {row.snippet}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
