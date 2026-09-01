import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Info } from 'lucide-react'

import {
  getEditorConflict,
  resolveEditorConflict
} from '@pear-notes/core/store/slices/editorSlice.js'

export default function NoteConflictBanner({ noteKey }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const conflict = useSelector(getEditorConflict)

  if (!conflict || conflict.key !== noteKey) return null

  return (
    <div
      role='status'
      className='sticky top-0 z-40 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-primary bg-bg-secondary px-4 py-3 shadow-lg'
    >
      <div className='flex min-w-0 items-center gap-2'>
        <Info size={16} className='shrink-0 text-accent-primary' />
        <span className='truncate text-sm font-semibold text-text-primary'>
          {t('noteEditor.conflict.title')}
        </span>
      </div>
      <div className='flex shrink-0 items-center gap-2'>
        <button
          type='button'
          onClick={() => dispatch(resolveEditorConflict('mine'))}
          className='rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90'
        >
          {t('noteEditor.conflict.keepMine')}
        </button>
        <button
          type='button'
          onClick={() => dispatch(resolveEditorConflict('theirs'))}
          className='rounded-lg border border-border-primary px-3 py-1.5 text-xs font-bold text-text-primary transition-colors hover:bg-bg-primary'
        >
          {t('noteEditor.conflict.useTheirs')}
        </button>
      </div>
    </div>
  )
}
