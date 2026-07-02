import { NodeViewWrapper } from '@tiptap/react'
import { FileText, FileImage, FileVideo, FileAudio, File, Download, Trash2, Play, Pause, Maximize2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import AudioPlayer from './AudioPlayer'
import MediaPreviewModal from './MediaPreviewModal'
import { useSelector } from 'react-redux'
import { getHyperdriveAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'
import { deleteHyperdriveFile, downloadAsBlob, createDownloadLink, base64ToBlob } from '../lib/fileManager'

export default function FileAttachmentView({ node, deleteNode }) {
  const { fileName, fileSize, fileType, fileData, url } = node.attrs
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const mediaRef = useRef(null)
  
  const resolvedUrl = useSelector((state) => (url && url.startsWith(HYPERDRIVE_URL_PREFIX) ? getHyperdriveAddress(state, url) : url))
  
  const isVideo = fileType?.startsWith('video/')
  const isAudio = fileType?.startsWith('audio/')

  useEffect(() => {
    const media = mediaRef.current

    if (!media || !isVideo) return

    const handleTimeUpdate = () => setCurrentTime(media.currentTime)
    const handleLoadedMetadata = () => setDuration(media.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      media.currentTime = 0
      setCurrentTime(0)
    }

    media.addEventListener('timeupdate', handleTimeUpdate)
    media.addEventListener('loadedmetadata', handleLoadedMetadata)
    media.addEventListener('ended', handleEnded)

    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate)
      media.removeEventListener('loadedmetadata', handleLoadedMetadata)
      media.removeEventListener('ended', handleEnded)
    }
  }, [fileData, resolvedUrl, isVideo])

  const togglePlayPause = (e) => {
    e.stopPropagation()
    const media = mediaRef.current
    if (!media) return

    if (isPlaying) {
      media.pause()
    } else {
      media.play()
    }
    setIsPlaying(!isPlaying)
  }

  const enterFullscreen = (e) => {
    e.stopPropagation()
    mediaRef.current?.requestFullscreen?.()
  }

  const openPreview = () => {
    if (isVideo || isAudio) return
    setIsPreviewOpen(true)
  }

  const closePreview = () => setIsPreviewOpen(false)

  const getFileIcon = () => {
    if (!fileType) return <File className='w-6 h-6' />
    if (fileType.startsWith('image/')) return <FileImage className='w-6 h-6' />
    if (fileType.startsWith('video/')) return <FileVideo className='w-6 h-6' />
    if (fileType.startsWith('audio/')) return <FileAudio className='w-6 h-6' />
    if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className='w-6 h-6' />
    return <File className='w-6 h-6' />
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileExtension = () => {
    if (!fileName) return ''
    const parts = fileName.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE'
  }

  const handleDownload = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (resolvedUrl) {
      try {
        const blob = await downloadAsBlob(resolvedUrl)
        createDownloadLink(blob, fileName || 'download')
      } catch (error) {
        console.error('Download failed:', error)
      }
      return
    }

    if (!fileData) return
    try {
      const blob = base64ToBlob(fileData)
      createDownloadLink(blob, fileName || 'download')
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const handleDelete = async (e) => {
    e.stopPropagation()

    try {
      await deleteHyperdriveFile(url)
    } catch (error) {
      console.error('Error deleting file from backend:', error)
    }

    if (deleteNode) deleteNode()
  }

  return (
    <NodeViewWrapper className='file-attachment-wrapper'>
      {isAudio ? (
        <div className='relative my-3 group'>
          <AudioPlayer 
            src={resolvedUrl || fileData} 
            duration={node.attrs.duration || 0} 
            title={fileName || 'Audio Attachment'} 
          />
          
          <div className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20'>
            {(resolvedUrl || fileData) && (
              <button
                onClick={handleDownload}
                className='flex-shrink-0 p-2.5 rounded-lg hover:bg-bg-tertiary transition-all duration-200'
                title='Download'
              >
                <Download className='w-4 h-4 text-text-secondary' />
              </button>
            )}
            <button
              onClick={handleDelete}
              className='flex-shrink-0 p-2.5 rounded-lg hover:bg-accent-danger/10 transition-all duration-200'
              title='Delete'
            >
              <Trash2 className='w-4 h-4 text-accent-danger' />
            </button>
          </div>
        </div>
      ) : (
        <div className='flex flex-col my-3 bg-bg-secondary border border-border-primary rounded-xl group transition-all duration-300 overflow-hidden'>
          {isVideo && (resolvedUrl || fileData) && (
            <div className='relative aspect-video bg-black'>
              <video
                ref={mediaRef}
                src={resolvedUrl || fileData}
                className='w-full h-full'
                onClick={(e) => {
                  e.stopPropagation()
                  togglePlayPause(e)
                }}
              />
              <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none'>
                <button
                  onClick={togglePlayPause}
                  className='w-12 h-12 rounded-full bg-accent-primary flex items-center justify-center text-white pointer-events-auto'
                >
                  {isPlaying ? <Pause className='w-6 h-6 fill-white' /> : <Play className='w-6 h-6 fill-white ml-0.5' />}
                </button>
              </div>
              <button
                onClick={enterFullscreen}
                className='absolute top-2 right-2 p-2 rounded-lg bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-20'
                title='Fullscreen'
              >
                <Maximize2 className='w-4 h-4' />
              </button>
            </div>
          )}

          <div
            className={`relative flex items-center gap-4 p-${isVideo ? 6 : 4} ${!isVideo ? 'cursor-zoom-in' : ''}`}
            onDoubleClick={openPreview}
          >
            <div className='flex-shrink-0 w-12 h-12 rounded-xl bg-bg-tertiary flex items-center justify-center text-text-secondary border border-border-primary'>
              {getFileIcon()}
            </div>

            <div className='flex-1 min-w-0'>
              <p className='text-sm font-semibold text-text-primary truncate mb-1'>{fileName || 'Untitled File'}</p>
              <div className='flex items-center gap-2'>
                <span className='text-xs font-medium text-text-tertiary bg-bg-tertiary px-2 py-0.5 rounded-md'>
                  {getFileExtension()}
                </span>
                <span className='text-xs text-text-tertiary'>•</span>
                <span className='text-xs text-text-tertiary'>{formatFileSize(fileSize)}</span>
              </div>
            </div>

            <div className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20'>
              {(resolvedUrl || fileData) && (
                <button
                  onClick={handleDownload}
                  className='flex-shrink-0 p-2.5 rounded-lg hover:bg-bg-tertiary transition-all duration-200'
                  title='Download'
                >
                  <Download className='w-4 h-4 text-text-secondary' />
                </button>
              )}
              <button
                onClick={handleDelete}
                className='flex-shrink-0 p-2.5 rounded-lg hover:bg-accent-danger/10 transition-all duration-200'
                title='Delete'
              >
                <Trash2 className='w-4 h-4 text-accent-danger' />
              </button>
            </div>
          </div>

          {isVideo && (
            <div className='px-4 pb-4'>
              <div className='relative h-1.5 bg-bg-tertiary w-full rounded-full group/slider'>
                <input
                  type='range'
                  min='0'
                  max={duration || 0}
                  step='any'
                  value={currentTime}
                  onChange={(e) => {
                    const time = parseFloat(e.target.value)
                    setCurrentTime(time)
                    if (mediaRef.current) mediaRef.current.currentTime = time
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30'
                  onClick={(e) => e.stopPropagation()}
                />
                <div
                  className='absolute top-0 left-0 h-full bg-accent-primary rounded-full pointer-events-none'
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
                <div 
                  className='absolute top-1/2 w-3 h-3 bg-white border-2 border-accent-primary rounded-full shadow-sm opacity-0 group-hover/slider:opacity-100 transition-opacity pointer-events-none z-20'
                  style={{ 
                    left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`, 
                    transform: 'translate(-50%, -50%)' 
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
      {isPreviewOpen && (
        <MediaPreviewModal
          url={resolvedUrl || fileData}
          fileName={fileName || 'File'}
          fileType={fileType}
          onClose={closePreview}
          onDownload={handleDownload}
        />
      )}
    </NodeViewWrapper>
  )
}
