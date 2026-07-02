import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { X, Download, FileQuestion } from 'lucide-react'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'heic', 'avif']
const TEXT_EXTENSIONS = ['txt', 'md', 'json', 'csv', 'log', 'xml', 'html']

function getExtension(fileName) {
  if (!fileName) return ''
  const parts = fileName.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

function resolveKind(fileType, fileName) {
  const ext = getExtension(fileName)
  if (fileType?.startsWith('image/') || IMAGE_EXTENSIONS.includes(ext)) return 'image'
  if (fileType === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (fileType?.startsWith('audio/')) return 'audio'
  if (fileType?.startsWith('text/') || TEXT_EXTENSIONS.includes(ext)) return 'text'
  return 'unsupported'
}

export default function MediaPreviewModal({ url, fileName, fileType, onClose, onDownload }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!url) return null

  const kind = resolveKind(fileType, fileName)

  const renderBody = () => {
    switch (kind) {
      case 'image':
        return (
          <img
            src={url}
            alt={fileName || 'Preview'}
            className='max-w-full max-h-full object-contain rounded-lg shadow-xl'
          />
        )
      case 'pdf':
      case 'text':
        return (
          <iframe
            src={url}
            title={fileName || 'Preview'}
            className='w-full h-full bg-white rounded-lg shadow-xl border-none'
          />
        )
      case 'audio':
        return (
          <div className='bg-bg-secondary border border-border-primary rounded-xl p-8 shadow-xl'>
            <audio src={url} controls autoPlay className='w-96 max-w-full' />
          </div>
        )
      default:
        return (
          <div className='flex flex-col items-center gap-4 bg-bg-secondary border border-border-primary rounded-xl p-10 shadow-xl'>
            <FileQuestion className='w-12 h-12 text-text-tertiary' />
            <p className='text-sm text-text-secondary text-center'>
              This file type cannot be previewed.
            </p>
            {onDownload && (
              <button
                onClick={onDownload}
                className='flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary text-black text-sm font-semibold hover:bg-accent-primary-hover transition-colors'
              >
                <Download className='w-4 h-4' />
                Download
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
      <div className='flex items-center justify-between px-6 py-4 flex-shrink-0'>
        <p className='text-sm font-medium text-white/90 truncate pr-4'>{fileName || 'Preview'}</p>
        <div className='flex items-center gap-2'>
          {onDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDownload(e)
              }}
              className='p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors'
              title='Download'
            >
              <Download className='w-5 h-5' />
            </button>
          )}
          <button
            onClick={onClose}
            className='p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors'
            title='Close'
          >
            <X className='w-5 h-5' />
          </button>
        </div>
      </div>
      <div
        className='flex-1 min-h-0 flex items-center justify-center px-6 pb-6'
        onClick={(e) => e.stopPropagation()}
      >
        {renderBody()}
      </div>
    </div>,
    document.body,
  )
}
