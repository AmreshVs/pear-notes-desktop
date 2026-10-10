import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import { getFolders } from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  dismissDuplicateNotes,
  getDuplicateNotesState,
  getLocalAiIndex,
  loadDuplicateNotes
} from '@pear-notes/core/store/slices/localAiSlice.js'
import {
  getDuplicatePairRows,
  getNotesData,
  selectNote
} from '@pear-notes/core/store/slices/notesSlice.js'

import ToolPanel, { ToolEmpty } from './ToolPanel'

const TITLE_BUTTON_CLASS =
  'block max-w-full text-left text-base font-bold tracking-tight text-text-primary hover:text-accent-primary truncate'

export default function DuplicatesList({ onToggleSidebar, isSidebarCollapsed }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const duplicates = useSelector(getDuplicateNotesState)
  const pairs = useSelector(getDuplicatePairRows)
  const notesData = useSelector(getNotesData)
  const folders = useSelector(getFolders)
  const index = useSelector(getLocalAiIndex)

  useEffect(() => {
    dispatch(loadDuplicateNotes())
  }, [dispatch, index.changedAt])

  const titleOf = (key) => notesData[key]?.title || t('activity.untitledNote')
  const folderName = (a, b) => {
    const folderKey = notesData[a]?.folderKey
    if (!folderKey || folderKey !== notesData[b]?.folderKey) return null
    return folders.find((folder) => folder.id === folderKey)?.name ?? null
  }
  const checking = duplicates.status !== 'done' && duplicates.status !== 'failed'
  const checked = index.lastRun?.total

  return (
    <ToolPanel
      title={t('tools.duplicates')}
      status={checked ? t('duplicates.checked', { count: checked }) : null}
      hint={t('settings.descriptions.duplicates')}
      onToggleSidebar={onToggleSidebar}
      isSidebarCollapsed={isSidebarCollapsed}
    >
      {pairs.length === 0 && (
        <ToolEmpty
          title={
            checking
              ? t('duplicates.checking')
              : duplicates.status === 'failed'
                ? t('duplicates.failedTitle')
                : t('duplicates.emptyTitle')
          }
          body={
            checking
              ? null
              : duplicates.status === 'failed'
                ? t('duplicates.failedDescription')
                : t('duplicates.emptyDescription')
          }
        />
      )}
      {pairs.map((pair, i) => {
        const folder = folderName(pair.a, pair.b)
        return (
          <div
            key={`${pair.a}|${pair.b}`}
            className={`pl-6 pr-4 py-3 ${i < pairs.length - 1 ? 'border-b border-overlay-subtle' : ''}`}
          >
            <button onClick={() => dispatch(selectNote(pair.a))} className={TITLE_BUTTON_CLASS}>
              {titleOf(pair.a)}
            </button>
            <button onClick={() => dispatch(selectNote(pair.b))} className={TITLE_BUTTON_CLASS}>
              {titleOf(pair.b)}
            </button>
            <div className='flex items-center justify-between gap-3 mt-1'>
              <span className='text-xs font-bold tracking-wider opacity-60 truncate'>
                {t('duplicates.alike', { percent: Math.min(100, Math.round(pair.score * 100)) })}
                {folder ? ` · ${folder}` : ''}
              </span>
              <button
                onClick={() => dispatch(dismissDuplicateNotes({ a: pair.a, b: pair.b }))}
                className='shrink-0 px-3 py-1.5 rounded-xl bg-accent-primary/10 text-accent-primary text-sm font-semibold hover:bg-accent-primary/20 transition-colors'
              >
                {t('duplicates.notDuplicates')}
              </button>
            </div>
          </div>
        )
      })}
    </ToolPanel>
  )
}
