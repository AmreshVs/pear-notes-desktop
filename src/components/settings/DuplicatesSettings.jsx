import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Copy } from 'lucide-react'

import { getFolders } from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  dismissDuplicateNotes,
  getDuplicateNotesState,
  getLocalAiIndex,
  loadDuplicateNotes
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { getDuplicatePairRows, getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

const CARD_CLASS =
  'bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden divide-y divide-border-primary'
const ACTION_BUTTON_CLASS =
  'px-3 py-1.5 rounded-xl bg-accent-primary/10 text-accent-primary text-sm font-semibold hover:bg-accent-primary/20 transition-colors'
const TITLE_BUTTON_CLASS =
  'text-text-primary text-base font-bold hover:text-accent-primary transition-colors truncate max-w-[16rem]'

export default function DuplicatesSettings({ onOpenNote }) {
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
  const checked = index.lastRun?.total

  if (pairs.length === 0) {
    const checking = duplicates.status !== 'done' && duplicates.status !== 'failed'
    return (
      <div className='flex flex-col items-center text-center gap-3 py-12'>
        <div className='w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center'>
          <Copy className='w-5 h-5 text-text-tertiary' />
        </div>
        <p className='text-text-primary font-bold text-sm'>
          {checking
            ? t('duplicates.checking')
            : duplicates.status === 'failed'
              ? t('duplicates.failedTitle')
              : t('duplicates.emptyTitle')}
        </p>
        {!checking && (
          <p className='text-xs text-text-tertiary max-w-[18rem] leading-relaxed'>
            {duplicates.status === 'failed'
              ? t('duplicates.failedDescription')
              : t('duplicates.emptyDescription')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      <div className={CARD_CLASS}>
        {pairs.map((pair) => {
          const folder = folderName(pair.a, pair.b)
          return (
            <div key={`${pair.a}|${pair.b}`} className='p-6 flex items-center gap-6'>
              <div className='flex-1 min-w-0 space-y-1'>
                <div className='flex items-center gap-2 min-w-0'>
                  <button onClick={() => onOpenNote(pair.a)} className={TITLE_BUTTON_CLASS}>
                    {titleOf(pair.a)}
                  </button>
                  <span className='text-sm text-text-tertiary shrink-0'>{t('duplicates.and')}</span>
                  <button onClick={() => onOpenNote(pair.b)} className={TITLE_BUTTON_CLASS}>
                    {titleOf(pair.b)}
                  </button>
                </div>
                <p className='text-sm text-text-tertiary font-medium opacity-60'>
                  {t('duplicates.alike', { percent: Math.min(100, Math.round(pair.score * 100)) })}
                  {folder ? ` · ${folder}` : ''}
                </p>
              </div>
              <button
                onClick={() => dispatch(dismissDuplicateNotes({ a: pair.a, b: pair.b }))}
                className={ACTION_BUTTON_CLASS}
              >
                {t('duplicates.notDuplicates')}
              </button>
            </div>
          )
        })}
      </div>
      {checked ? (
        <p className='text-xs text-text-tertiary ml-2'>
          {t('duplicates.checked', { count: checked })}
        </p>
      ) : null}
    </div>
  )
}
