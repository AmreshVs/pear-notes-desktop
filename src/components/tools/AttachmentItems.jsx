import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { Cloud, File, FileText, ImageOff, Mic } from 'lucide-react'

import { ATTACHMENT_KIND } from '@pear-notes/core/store/services/noteAttachments.js'
import { getHyperdriveAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import {
  attachmentIdentity,
  getCachedPdfThumb,
  subscribePdfThumbWrites
} from '../../lib/pdfThumbCache'
import { attachmentName } from '../../utils/attachmentName'
import { formatTime } from '../../utils/formatters'

const DATE_FORMAT = { day: 'numeric', month: 'short' }

function CloudBadge({ className }) {
  const { t } = useTranslation()
  return (
    <span
      title={t('attachmentsView.notOnDevice')}
      aria-label={t('attachmentsView.notOnDevice')}
      className={`flex items-center justify-center text-text-secondary ${className}`}
    >
      <Cloud className='w-3 h-3' />
    </span>
  )
}

const KIND_ICONS = {
  [ATTACHMENT_KIND.PDF]: FileText,
  [ATTACHMENT_KIND.AUDIO]: Mic,
  [ATTACHMENT_KIND.FILE]: File
}

function usePdfThumb(url) {
  const [thumb, setThumb] = useState(null)

  useEffect(() => {
    if (!url) return
    let active = true
    const read = () =>
      getCachedPdfThumb(url)
        .then((cached) => {
          if (active && cached?.dataUrl) setThumb({ url, dataUrl: cached.dataUrl })
        })
        .catch(() => {})
    read()
    const identity = attachmentIdentity(url)
    const unsubscribe = subscribePdfThumbWrites((written) => {
      if (written === identity) read()
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [url])

  return url && thumb?.url === url ? thumb.dataUrl : null
}

export function PhotoTile({ item, onOpen, onMenu }) {
  const { t } = useTranslation()
  const src = useSelector((state) => getHyperdriveAddress(state, item.url))
  const [failed, setFailed] = useState(false)
  const name = attachmentName(item, t)

  return (
    <button
      type='button'
      onClick={onOpen}
      onContextMenu={onMenu}
      title={`${name} · ${item.title || t('noteCard.untitled')}`}
      aria-label={name}
      className='relative aspect-square rounded-lg overflow-hidden bg-overlay-subtle hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent-primary'
    >
      {src && !failed ? (
        <img
          src={src}
          alt=''
          loading='lazy'
          draggable={false}
          onError={() => setFailed(true)}
          className='w-full h-full object-cover'
        />
      ) : (
        <ImageOff className='w-4 h-4 m-auto text-text-tertiary' />
      )}
      {item.local === false && (
        <CloudBadge className='absolute right-1 bottom-1 px-1.5 py-0.5 rounded-full bg-bg-primary/80' />
      )}
    </button>
  )
}

export function FileRow({ item, last, onOpen, onMenu }) {
  const { t, i18n } = useTranslation()
  const pdfThumb = usePdfThumb(item.kind === ATTACHMENT_KIND.PDF ? item.url : null)
  const Icon = KIND_ICONS[item.kind] || File
  const date = item.updatedAt
    ? new Date(item.updatedAt).toLocaleDateString(i18n.language, DATE_FORMAT)
    : ''
  const detail = [
    item.title || t('noteCard.untitled'),
    item.kind === ATTACHMENT_KIND.AUDIO && item.duration ? formatTime(item.duration) : date
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <button
      type='button'
      onClick={onOpen}
      onContextMenu={onMenu}
      className='w-full flex items-center gap-3 px-6 min-h-[68px] text-left hover:bg-overlay-faint group focus-visible:outline-2 focus-visible:outline-accent-primary'
    >
      <span
        className={`w-9 shrink-0 overflow-hidden flex items-center justify-center ${item.kind === ATTACHMENT_KIND.AUDIO ? 'h-9 rounded-full' : 'h-11 rounded-md'} ${item.kind === ATTACHMENT_KIND.PDF ? 'bg-accent-primary/10 text-accent-primary' : 'bg-overlay-subtle text-text-secondary'}`}
      >
        {pdfThumb ? (
          <img src={pdfThumb} alt='' className='w-full h-full object-cover' />
        ) : (
          <Icon className='w-4 h-4' />
        )}
      </span>
      <span
        className={`flex-1 min-w-0 self-stretch flex items-center gap-3 ${last ? '' : 'border-b border-overlay-subtle'}`}
      >
        <span className='flex-1 min-w-0'>
          <span className='block truncate text-sm font-semibold text-text-primary group-hover:text-accent-primary'>
            {attachmentName(item, t)}
          </span>
          <span className='block truncate text-xs text-text-tertiary'>{detail}</span>
        </span>
        {item.local === false && <CloudBadge className='shrink-0' />}
        {item.size > 0 && (
          <span className='shrink-0 text-xs text-text-tertiary tabular-nums'>
            {formatBytes(item.size)}
          </span>
        )}
      </span>
    </button>
  )
}
