import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Paperclip, RotateCcw } from 'lucide-react'

import { TRASH_RETENTION_DAYS } from '@pear-notes/core/constant.js'
import { MERGE_LINE } from '@pear-notes/core/store/services/noteMerge.js'
import { getFoldersData } from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  clearMergePreview,
  getMergePreview,
  mergeNotes
} from '@pear-notes/core/store/slices/notesSlice.js'

import { useDialog } from '../../hooks/useDialog'

const MARKER_CLASS = {
  [MERGE_LINE.BULLET]: 'w-[5px] h-[5px] rounded-full bg-text-tertiary',
  [MERGE_LINE.NUMBER]: 'w-[5px] h-[5px] rounded-full bg-text-tertiary',
  [MERGE_LINE.TASK]: 'w-3 h-3 rounded-[3px] border border-text-tertiary'
}

function PreviewLine({ line }) {
  const { t } = useTranslation()
  const marker = MARKER_CLASS[line.kind]
  const text =
    line.kind === MERGE_LINE.ATTACHMENT ? (
      <span className='inline-flex items-center gap-1 text-text-tertiary'>
        <Paperclip className='w-3 h-3' />
        {t('mergePreview.attachment')}
      </span>
    ) : (
      line.text
    )
  const added = line.added ? 'bg-accent-success/15 text-text-primary rounded px-1' : ''
  return (
    <div
      className={`flex gap-2 text-[13px] leading-relaxed text-text-secondary ${line.kind === MERGE_LINE.HEADING ? 'font-bold text-text-primary' : ''}`}
    >
      {marker && <span className={`shrink-0 mt-[7px] ${marker}`} />}
      <span className={`min-w-0 break-words ${added} ${line.checked ? 'line-through' : ''}`}>
        {text}
      </span>
    </div>
  )
}

function PreviewColumn({ label, title, lines, result, children }) {
  return (
    <div
      className={`min-w-0 flex flex-col gap-2 rounded-xl border p-4 overflow-y-auto ${result ? 'border-accent-primary/40 bg-accent-primary/5' : 'border-overlay-medium bg-bg-secondary/60'}`}
    >
      <span
        className={`text-[11.5px] font-semibold truncate ${result ? 'text-accent-primary' : 'text-text-tertiary'}`}
      >
        {label}
      </span>
      <span className='text-base font-bold text-text-primary break-words'>{title}</span>
      {lines.map((line, index) => (
        <PreviewLine key={index} line={line} />
      ))}
      {children}
    </div>
  )
}

function MergePreviewDialog({ preview }) {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const folders = useSelector(getFoldersData)
  const close = useCallback(() => dispatch(clearMergePreview()), [dispatch])
  const dialogRef = useDialog(close)

  const ready = preview.status === 'ready'
  const untitled = t('noteCard.untitled')
  const folderName = (key) => folders?.[key]?.title ?? t('folders.title')
  const dateLabel = (at) =>
    at ? new Date(at).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' }) : ''
  const merge = () => {
    dispatch(mergeNotes({ keys: preview.keys }))
    close()
  }
  const dropped = ready ? preview.dropped : []
  const columns = ready ? preview.sources.length + 1 : 1

  return (
    <div className='fixed inset-0 z-[300] flex items-center justify-center p-6'>
      <div className='absolute inset-0 bg-backdrop-medium backdrop-blur-xl' onClick={close} />
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-label={t('mergePreview.title', { count: preview.keys.length })}
        tabIndex={-1}
        className='relative bg-bg-panel/90 backdrop-blur-3xl border border-overlay-medium rounded-2xl w-full max-w-[1000px] max-h-[85vh] flex flex-col shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 fade-in duration-200'
      >
        <div className='px-6 pt-5 pb-3.5 flex flex-col gap-1 border-b border-overlay-subtle'>
          <h2 className='text-lg font-bold text-text-primary'>
            {t('mergePreview.title', { count: preview.keys.length })}
          </h2>
          <p className='text-sm text-text-tertiary'>
            {t('mergePreview.desc', { days: TRASH_RETENTION_DAYS })}
          </p>
        </div>

        <div
          className='grid gap-3.5 px-6 py-4 flex-1 min-h-0 overflow-x-auto'
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(220px, 1fr))` }}
        >
          {preview.status === 'loading' && (
            <p className='text-sm text-text-tertiary py-8 text-center'>
              {t('mergePreview.loading')}
            </p>
          )}
          {preview.status === 'error' && (
            <p role='alert' className='text-sm text-accent-danger py-8 text-center'>
              {t(`notesList.merge.refused.${preview.error}`, {
                defaultValue: t('notesList.merge.refused.failed')
              })}
            </p>
          )}
          {ready &&
            preview.sources.map((source, index) => (
              <PreviewColumn
                key={source.key ?? index}
                label={t('mergePreview.source', {
                  number: index + 1,
                  folder: folderName(source.folderKey),
                  date: dateLabel(source.updatedAt)
                })}
                title={source.title || untitled}
                lines={source.lines}
              />
            ))}
          {ready && (
            <PreviewColumn
              result
              label={t('mergePreview.result', { folder: folderName(preview.folderKey) })}
              title={preview.title || untitled}
              lines={preview.result}
            >
              {dropped.length > 0 && (
                <div className='pt-1 text-[11.5px] text-text-tertiary'>
                  {t('mergePreview.dropped', { count: dropped.length })}
                  <ul className='mt-1 flex flex-col gap-0.5'>
                    {dropped.map((line, index) => (
                      <li key={index} className='line-through break-words'>
                        {line.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </PreviewColumn>
          )}
        </div>

        <div className='flex items-center gap-2.5 px-6 py-3.5 border-t border-overlay-subtle'>
          <span className='text-xs text-text-tertiary flex items-center gap-1.5'>
            <RotateCcw className='w-3.5 h-3.5' />
            {t('mergePreview.undoHint')}
          </span>
          <span className='flex-1' />
          <button
            type='button'
            onClick={close}
            className='px-4 py-2.5 rounded-xl text-sm font-bold text-text-secondary hover:bg-bg-tertiary'
          >
            {t('common.cancel')}
          </button>
          <button
            type='button'
            onClick={merge}
            disabled={!ready}
            className='px-4 py-2.5 rounded-xl text-sm font-bold bg-accent-primary text-accent-on-primary disabled:opacity-40'
          >
            {t('notesList.merge.action')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MergePreviewModal() {
  const preview = useSelector(getMergePreview)
  return preview ? <MergePreviewDialog preview={preview} /> : null
}
