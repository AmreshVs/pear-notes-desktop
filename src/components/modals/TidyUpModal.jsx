import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Check, Wand2, X } from 'lucide-react'

import { SUGGESTION_KIND } from '@pear-notes/core/store/services/noteSuggestions.js'
import { getFoldersData } from '@pear-notes/core/store/slices/foldersSlice.js'
import { noteSuggestionAccepted } from '@pear-notes/core/store/slices/localAiSlice.js'
import { applyFolderMoves } from '@pear-notes/core/store/slices/notesSlice.js'

import { useDialog } from '../../hooks/useDialog'

export default function TidyUpModal({ moves, onClose }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const folders = useSelector(getFoldersData)
  const dialogRef = useDialog(onClose)
  const [skipped, setSkipped] = useState(() => new Set())

  const toggle = (key) =>
    setSkipped((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const chosen = moves.filter((move) => !skipped.has(move.key))
  const apply = () => {
    dispatch(applyFolderMoves({ moves: chosen }))
    dispatch(
      noteSuggestionAccepted({
        kind: SUGGESTION_KIND.FOLDER,
        folderKeys: chosen.map((move) => move.to)
      })
    )
    onClose()
  }

  return (
    <div className='fixed inset-0 z-[300] flex items-center justify-center p-6'>
      <div className='absolute inset-0 bg-backdrop-medium backdrop-blur-xl' onClick={onClose} />
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-label={t('tidyUp.title')}
        tabIndex={-1}
        className='relative bg-bg-panel/90 backdrop-blur-3xl border border-overlay-medium rounded-[2rem] p-8 max-w-lg w-full max-h-[80vh] flex flex-col shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 fade-in duration-200'
      >
        <div className='flex items-start gap-3'>
          <div className='w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-accent-primary/10 text-accent-primary'>
            <Wand2 className='w-5 h-5' />
          </div>
          <div className='flex-1 min-w-0'>
            <h2 className='text-lg font-bold text-text-primary'>{t('tidyUp.title')}</h2>
            <p className='text-sm text-text-tertiary leading-relaxed'>{t('tidyUp.desc')}</p>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label={t('common.close')}
            className='w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <div className='mt-5 flex-1 overflow-y-auto -mx-2 px-2'>
          {moves.map((move) => {
            const on = !skipped.has(move.key)
            return (
              <button
                key={move.key}
                type='button'
                role='checkbox'
                aria-checked={on}
                onClick={() => toggle(move.key)}
                className='w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-overlay-faint'
              >
                <span
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? 'bg-accent-primary border-accent-primary text-accent-on-primary' : 'border-border-secondary text-transparent'}`}
                >
                  <Check className='w-3.5 h-3.5' strokeWidth={3} />
                </span>
                <span className='flex-1 min-w-0'>
                  <span className='block text-sm font-bold text-text-primary truncate'>
                    {move.title || t('noteCard.untitled')}
                  </span>
                  <span className='block text-xs text-text-tertiary truncate'>
                    {t('tidyUp.moveTo', { folder: folders?.[move.to]?.title ?? '' })}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div className='mt-5 flex justify-end gap-2'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2.5 rounded-xl text-sm font-bold text-text-secondary hover:bg-bg-tertiary'
          >
            {t('common.cancel')}
          </button>
          <button
            type='button'
            onClick={apply}
            disabled={chosen.length === 0}
            className='px-4 py-2.5 rounded-xl text-sm font-bold bg-accent-primary text-accent-on-primary disabled:opacity-40'
          >
            {t('tidyUp.apply', { count: chosen.length })}
          </button>
        </div>
      </div>
    </div>
  )
}
