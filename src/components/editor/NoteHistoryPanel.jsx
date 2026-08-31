import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { History, X } from 'lucide-react'

import {
  fetchNoteActivity,
  getActivityIsLoading,
  getNoteActivityEntries
} from '@pear-notes/core/store/slices/activitySlice.js'
import { getNoteData } from '@pear-notes/core/store/slices/notesSlice.js'
import { getActivityLogEnabled } from '@pear-notes/core/store/slices/settingsSlice.js'

import { isNoteUnlocked, useNoteLockVersion } from '../../lib/noteLock'
import ActivityEntryRow from '../common/ActivityEntryRow'

function formatDay(value, t) {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return t('activity.today')
  if (date.toDateString() === yesterday.toDateString()) return t('activity.yesterday')
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function NoteHistoryPanel({ noteKey, noteTitle, onClose }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const entries = useSelector(getNoteActivityEntries(noteKey))
  const noteUpdatedAt = useSelector(getNoteData(noteKey))?.updatedAt
  const isLoading = useSelector(getActivityIsLoading)
  const enabled = useSelector(getActivityLogEnabled)
  const [expandedId, setExpandedId] = useState(null)

  useNoteLockVersion()

  useEffect(() => {
    if (noteKey) dispatch(fetchNoteActivity({ noteKey }))
  }, [dispatch, noteKey, noteUpdatedAt])

  const groups = []
  let current = null
  for (const entry of entries) {
    const day = new Date(entry.lastAt || entry.at).toDateString()
    if (!current || current.day !== day) {
      current = { day, at: entry.lastAt || entry.at, entries: [] }
      groups.push(current)
    }
    current.entries.push(entry)
  }

  return (
    <aside
      aria-label={t('activity.noteHistory')}
      className='w-[26rem] shrink-0 border-l border-border-primary bg-bg-panel/80 backdrop-blur-2xl flex flex-col animate-in slide-in-from-right-4 fade-in duration-300'
    >
      <div className='px-6 py-5 flex items-start justify-between gap-3 border-b border-border-primary'>
        <div className='min-w-0'>
          <h2 className='text-text-primary font-black text-lg tracking-tight'>
            {t('activity.noteHistory')}
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
        {!enabled ? (
          <div className='flex flex-col items-center text-center gap-3 py-12'>
            <div className='w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center'>
              <History className='w-5 h-5 text-text-tertiary' />
            </div>
            <p className='text-text-primary font-bold text-sm'>
              {t('activity.empty.disabledTitle')}
            </p>
            <p className='text-xs text-text-tertiary max-w-[16rem] leading-relaxed'>
              {t('activity.empty.disabledDescription')}
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className='flex flex-col items-center text-center gap-3 py-12'>
            <div className='w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center'>
              <History className='w-5 h-5 text-text-tertiary' />
            </div>
            <p className='text-text-primary font-bold text-sm'>
              {isLoading ? t('common.loading') : t('activity.empty.noteTitle')}
            </p>
            {!isLoading && (
              <p className='text-xs text-text-tertiary max-w-[16rem] leading-relaxed'>
                {t('activity.empty.noteDescription')}
              </p>
            )}
          </div>
        ) : (
          <div className='space-y-6'>
            {groups.map((group) => (
              <div key={group.day} className='space-y-2'>
                <p className='text-[0.65rem] uppercase tracking-[0.18em] text-text-tertiary font-bold ml-1'>
                  {formatDay(group.at, t)}
                </p>
                <div className='space-y-2'>
                  {group.entries.map((entry) => (
                    <ActivityEntryRow
                      key={entry.id}
                      entry={entry}
                      expanded={expandedId === entry.id}
                      onToggle={(id) => setExpandedId((value) => (value === id ? null : id))}
                      showTarget={false}
                      isUnlocked={isNoteUnlocked(entry.targetKey)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
