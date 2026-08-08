import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, ChevronUp, Clock, Upload, X } from 'lucide-react'

import { cancelAllUploads, cancelUploadItem, useUploadQueue } from '../../lib/uploadRegistry'

function QueueRow({ item, onCancel }) {
  const { t } = useTranslation()
  if (item.status === 'cancelled') return null
  const isDone = item.status === 'done'
  const isUploading = item.status === 'uploading'

  return (
    <div className='flex items-center gap-2 py-1.5'>
      {isDone ? (
        <Check className='w-3.5 h-3.5 text-accent-success shrink-0' />
      ) : isUploading ? (
        <Upload className='w-3.5 h-3.5 text-accent-primary shrink-0' />
      ) : (
        <Clock className='w-3.5 h-3.5 text-text-tertiary shrink-0' />
      )}
      <span className='flex-1 min-w-0 text-sm text-text-secondary truncate'>{item.fileName}</span>
      <span className='text-xs font-semibold text-text-tertiary shrink-0'>
        {isDone
          ? t('uploadToast.done')
          : isUploading
            ? `${item.progress}%`
            : t('uploadToast.queued')}
      </span>
      {!isDone && (
        <button
          onClick={() => onCancel(item.id)}
          className='w-5 h-5 rounded flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all shrink-0'
          title={t('uploadToast.cancelUpload')}
        >
          <X className='w-3 h-3' />
        </button>
      )}
    </div>
  )
}

export default function UploadProgressToast() {
  const { t } = useTranslation()
  const queue = useUploadQueue()
  const [expanded, setExpanded] = useState(false)

  const [wasActive, setWasActive] = useState(false)

  const hasQueue = queue.items.length > 0
  const isBatch = queue.totalCount > 1

  if (wasActive !== hasQueue) {
    setWasActive(hasQueue)
    if (!hasQueue) setExpanded(false)
  }

  if (!hasQueue) return null

  const active = queue.activeItem
  const currentIndex = Math.min(queue.completedCount + 1, queue.totalCount)
  const headerLabel = isBatch
    ? t('uploadToast.uploadingProgress', { current: currentIndex, total: queue.totalCount })
    : t('uploadToast.uploading')
  const showExpanded = expanded && isBatch

  return (
    <div className='absolute bottom-6 left-8 w-80 max-w-[calc(100%-4rem)] bg-bg-secondary border border-border-primary rounded-xl shadow-2xl p-4 flex flex-col gap-3 z-40 animate-in slide-in-from-bottom-5 fade-in duration-300'>
      <div className='flex items-center gap-3'>
        <div className='w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-accent-primary/10 text-accent-primary'>
          <Upload className='w-5 h-5' />
        </div>

        <button
          onClick={isBatch ? () => setExpanded((value) => !value) : undefined}
          disabled={!isBatch}
          className='flex-1 min-w-0 text-left disabled:cursor-default'
          title={
            isBatch
              ? showExpanded
                ? t('uploadToast.hideQueue')
                : t('uploadToast.showQueue')
              : undefined
          }
        >
          <h4 className='text-text-primary font-semibold text-sm truncate flex items-center gap-1'>
            {headerLabel}
            {isBatch &&
              (showExpanded ? (
                <ChevronUp className='w-3.5 h-3.5 text-text-tertiary' />
              ) : (
                <ChevronDown className='w-3.5 h-3.5 text-text-tertiary' />
              ))}
          </h4>
          {!showExpanded && active && (
            <p className='text-text-tertiary text-xs truncate'>{active.fileName}</p>
          )}
        </button>

        {!showExpanded && active && (
          <span className='text-text-tertiary text-xs font-semibold shrink-0'>
            {active.progress}%
          </span>
        )}

        <button
          onClick={cancelAllUploads}
          className='w-7 h-7 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all shrink-0'
          title={isBatch ? t('uploadToast.cancelAll') : t('common.cancel')}
        >
          <X className='w-4 h-4' />
        </button>
      </div>

      {showExpanded ? (
        <div className='max-h-[220px] overflow-y-auto overflow-x-hidden border-t border-border-primary pt-1'>
          {queue.items.map((item) => (
            <QueueRow key={item.id} item={item} onCancel={cancelUploadItem} />
          ))}
        </div>
      ) : (
        <div className='w-full h-1.5 bg-bg-primary rounded-full overflow-hidden'>
          <div
            className='h-full bg-accent-primary transition-all duration-300'
            style={{ width: `${active ? active.progress : 0}%` }}
          />
        </div>
      )}
    </div>
  )
}
