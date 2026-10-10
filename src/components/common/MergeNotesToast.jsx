import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Combine, Undo2, X } from 'lucide-react'

import {
  getLastMerge,
  setLastMerge,
  undoMergeNotes
} from '@pear-notes/core/store/slices/notesSlice.js'

import { Toast } from './ToastStack'

const VISIBLE_MS = 12000

export default function MergeNotesToast() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const last = useSelector(getLastMerge)

  useEffect(() => {
    if (!last) return
    const timer = setTimeout(() => dispatch(setLastMerge(null)), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [dispatch, last])

  if (!last) return null
  const kind = ['split', 'move'].includes(last.kind) ? last.kind : 'merge'
  const message = last.error
    ? t(`notesList.${kind}.refused.${last.error}`, {
        defaultValue: t(`notesList.${kind}.refused.failed`)
      })
    : kind === 'split'
      ? t('notesList.split.done', { count: last.createdKeys?.length ?? 0 })
      : kind === 'move'
        ? t('notesList.move.done', { count: last.moves?.length ?? 0 })
        : t('notesList.merge.done', { count: last.originals.length })

  return (
    <Toast>
      <div
        role='status'
        className='w-80 max-w-full bg-bg-secondary border border-border-primary rounded-xl shadow-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-right-8 duration-300'
      >
        <div className='w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-accent-primary/10 text-accent-primary'>
          <Combine className='w-5 h-5' />
        </div>
        <div className='flex-1 min-w-0'>
          <p className='text-sm text-text-primary leading-relaxed'>{message}</p>
          {(last.mergedKey || last.moves?.length > 0) && (
            <button
              type='button'
              onClick={() => dispatch(undoMergeNotes())}
              className='mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-accent-primary hover:underline'
            >
              <Undo2 className='w-4 h-4' />
              {t(`notesList.${kind}.undo`)}
            </button>
          )}
        </div>
        <button
          type='button'
          onClick={() => dispatch(setLastMerge(null))}
          aria-label={t('common.close')}
          className='w-6 h-6 rounded flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary shrink-0'
        >
          <X className='w-3.5 h-3.5' />
        </button>
      </div>
    </Toast>
  )
}
