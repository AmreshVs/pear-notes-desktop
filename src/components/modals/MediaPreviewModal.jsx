import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Download, FileQuestion, X } from 'lucide-react'

import { canFramePreview, createFramePreviewUrl } from '../../lib/fileManager'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'heic', 'avif']
const TEXT_EXTENSIONS = ['txt', 'md', 'json', 'csv', 'log', 'xml', 'html']
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi']

function getExtension(fileName) {
  if (!fileName) return ''
  const parts = fileName.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

function resolveKind(fileType, fileName) {
  const ext = getExtension(fileName)
  if (fileType?.startsWith('image/') || IMAGE_EXTENSIONS.includes(ext)) return 'image'
  if (fileType === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (fileType?.startsWith('video/') || VIDEO_EXTENSIONS.includes(ext)) return 'video'
  if (fileType?.startsWith('audio/')) return 'audio'
  if (fileType?.startsWith('text/') || TEXT_EXTENSIONS.includes(ext)) return 'text'
  return 'unsupported'
}

export default function MediaPreviewModal({
  url,
  fileName,
  fileType,
  onClose,
  onDownload,
  isDownloading,
  downloadProgress
}) {
  const { t } = useTranslation()
  const kind = resolveKind(fileType, fileName)
  const needsFrameUrl = !!url && canFramePreview(kind)
  const [frameUrl, setFrameUrl] = useState(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!needsFrameUrl) return undefined

    let cancelled = false
    let created = null

    createFramePreviewUrl(url, kind)
      .then((objectUrl) => {
        if (cancelled) {
          if (objectUrl) URL.revokeObjectURL(objectUrl)
          return
        }
        created = objectUrl
        setFrameUrl(objectUrl)
      })
      .catch((error) => console.error('Failed to build a preview URL:', error))

    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [needsFrameUrl, url, kind])

  if (!url) return null

  const renderBody = () => {
    switch (kind) {
      case 'image':
        return (
          <img
            src={url}
            alt={fileName || t('mediaPreview.preview')}
            className='max-w-full max-h-full object-contain rounded-lg shadow-xl'
          />
        )
      case 'pdf':
      case 'text':
        if (!frameUrl)
          return (
            <div className='flex flex-col items-center gap-3'>
              <div className='w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin' />
              <p className='text-sm text-white/80'>{t('mediaPreview.loading')}</p>
            </div>
          )
        return (
          <iframe
            src={frameUrl}
            title={fileName || t('mediaPreview.preview')}
            className='w-full h-full bg-white rounded-lg shadow-xl border-none'
          />
        )
      case 'audio':
        return (
          <div className='bg-bg-secondary border border-border-primary rounded-xl p-8 shadow-xl'>
            <audio src={url} controls autoPlay className='w-96 max-w-full' />
          </div>
        )
      case 'video':
        return (
          <div className='relative w-full max-w-4xl aspect-video bg-black rounded-lg shadow-xl overflow-hidden'>
            <video src={url} controls autoPlay className='w-full h-full object-contain' />
          </div>
        )
      default:
        return (
          <div className='flex flex-col items-center gap-4 bg-bg-secondary border border-border-primary rounded-xl p-10 shadow-xl'>
            <FileQuestion className='w-12 h-12 text-text-tertiary' />
            <p className='text-sm text-text-secondary text-center'>
              {t('mediaPreview.cannotPreview')}
            </p>
            {onDownload && (
              <button
                onClick={() => !isDownloading && onDownload()}
                disabled={isDownloading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary text-accent-on-primary text-sm font-semibold transition-colors ${isDownloading ? 'cursor-wait opacity-70' : 'hover:bg-accent-primary-hover'}`}
              >
                <Download className='w-4 h-4' />
                {isDownloading
                  ? t('mediaPreview.downloadingProgress', { progress: downloadProgress })
                  : t('common.download')}
              </button>
            )}
          </div>
        )
    }
  }

  return createPortal(
    <div
      className='fixed inset-0 z-[9999] flex flex-col bg-black/80 backdrop-blur-sm'
      onClick={onClose}
    >
      <div className='flex items-center justify-between px-8 py-5 flex-shrink-0 z-30'>
        <p className='text-base font-bold text-white/95 truncate pr-8 select-none'>
          {fileName || t('mediaPreview.preview')}
        </p>
        <div className='flex items-center gap-3'>
          {onDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (!isDownloading) onDownload(e)
              }}
              disabled={isDownloading}
              className={`w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/20 bg-white/10 active:scale-90 transition-all flex items-center justify-center shadow-md ${isDownloading ? 'cursor-wait' : 'cursor-pointer'}`}
              title={
                isDownloading
                  ? t('mediaPreview.downloadingProgress', { progress: downloadProgress })
                  : t('common.download')
              }
            >
              {isDownloading ? (
                <span className='text-xs font-bold text-white'>{downloadProgress}%</span>
              ) : (
                <Download className='w-5 h-5' />
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className='w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/20 bg-white/10 active:scale-90 transition-all flex items-center justify-center cursor-pointer shadow-md'
            title={t('common.close')}
          >
            <X className='w-5 h-5' />
          </button>
        </div>
      </div>
      <div
        className='flex-1 min-h-0 flex items-center justify-center px-6 pb-6'
        onClick={(e) => {
          if (e.target !== e.currentTarget) e.stopPropagation()
        }}
      >
        {renderBody()}
      </div>
    </div>,
    document.body
  )
}
