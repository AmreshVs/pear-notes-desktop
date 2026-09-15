import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { NodeViewWrapper } from '@tiptap/react'
import {
  Download,
  File,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  ScanText,
  Trash2
} from 'lucide-react'

import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'
import { LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'
import { getSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getHyperdriveAddress } from '@pear-notes/core/store/slices/uiSlice.js'

import { useLocalAiFeatureReady } from '../../hooks/useLocalAiFeatureReady'
import usePdfPreview from '../../hooks/usePdfPreview'
import {
  base64ToBlob,
  createDownloadLink,
  deleteHyperdriveFile,
  downloadAsBlob
} from '../../lib/fileManager'
import { requestLocalAiSheet } from '../../lib/localAi/localAiRequests'
import { isPdfAttachment } from '../../lib/pdfPreview'
import { deletePdfThumb } from '../../lib/pdfThumbCache'
import MediaPreviewModal from '../modals/MediaPreviewModal'

import AudioPlayer from './AudioPlayer'
import PdfAttachmentPreview from './PdfAttachmentPreview'

export default function FileAttachmentView({ node, deleteNode }) {
  const { t } = useTranslation()
  const { fileName, fileSize, fileType, fileData, url } = node.attrs
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const mediaRef = useRef(null)
  const playerRef = useRef(null)
  const isPlayingRef = useRef(isPlaying)
  const currentTimeRef = useRef(currentTime)

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  const resolvedUrl = useSelector((state) =>
    url && url.startsWith(HYPERDRIVE_URL_PREFIX) ? getHyperdriveAddress(state, url) : url
  )
  const noteKey = useSelector(getSelectedNote)

  const isVideo = fileType?.startsWith('video/')
  const isAudio = fileType?.startsWith('audio/')
  const isPdf = isPdfAttachment(fileName, fileType)
  const pdfPreview = usePdfPreview(isPdf ? resolvedUrl || fileData : null)
  const extractTextReady = useLocalAiFeatureReady(LOCAL_AI_FEATURE.EXTRACT_TEXT)

  const handleExtractText = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const source = resolvedUrl || fileData
    if (!source) return
    requestLocalAiSheet({ mode: 'extract', url: source, fileName, kind: 'pdf' })
  }

  useEffect(() => {
    const media = mediaRef.current

    if (!media || !isVideo) return

    if (currentTimeRef.current > 0) {
      media.currentTime = currentTimeRef.current
    }
    if (isPlayingRef.current) {
      media.play().catch(() => {})
    }

    const handleTimeUpdate = () => {
      setCurrentTime(media.currentTime)
      currentTimeRef.current = media.currentTime
    }
    const handleLoadedMetadata = () => setDuration(media.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      isPlayingRef.current = false
      media.currentTime = 0
      setCurrentTime(0)
      currentTimeRef.current = 0
    }

    media.addEventListener('timeupdate', handleTimeUpdate)
    media.addEventListener('loadedmetadata', handleLoadedMetadata)
    media.addEventListener('ended', handleEnded)

    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate)
      media.removeEventListener('loadedmetadata', handleLoadedMetadata)
      media.removeEventListener('ended', handleEnded)
    }
  }, [fileData, resolvedUrl, isVideo, isFullscreen])

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

  const toggleFullscreen = (e) => {
    e.stopPropagation()
    if (!playerRef.current) return
    const nextFullscreen = !isFullscreen
    setIsFullscreen(nextFullscreen)
    if (nextFullscreen) {
      playerRef.current.requestFullscreen?.().catch(() => {})
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFS = document.fullscreenElement === playerRef.current
      if (!isNativeFS && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [isFullscreen])

  useEffect(() => {
    if (!isFullscreen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false)
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {})
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds === null) return '0:00'
    const mins = Math.floor(timeInSeconds / 60)
    const secs = Math.floor(timeInSeconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const openPreview = () => {
    if (isAudio) return
    setIsPreviewOpen(true)
  }

  const closePreview = () => setIsPreviewOpen(false)

  const getFileIcon = () => {
    if (!fileType) return <File className='w-6 h-6' />
    if (fileType.startsWith('image/')) return <FileImage className='w-6 h-6' />
    if (fileType.startsWith('video/')) return <FileVideo className='w-6 h-6' />
    if (fileType.startsWith('audio/')) return <FileAudio className='w-6 h-6' />
    if (fileType.includes('pdf') || fileType.includes('document'))
      return <FileText className='w-6 h-6' />
    return <File className='w-6 h-6' />
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return t('fileAttachment.unknownSize')
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  const getFileExtension = () => {
    if (!fileName) return ''
    const parts = fileName.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE'
  }

  const handleDownload = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (isDownloading) return

    if (resolvedUrl) {
      setIsDownloading(true)
      setDownloadProgress(0)
      try {
        const blob = await downloadAsBlob(resolvedUrl, setDownloadProgress)
        createDownloadLink(blob, fileName || t('fileAttachment.downloadDefault'))
      } catch (error) {
        console.error('Download failed:', error)
      } finally {
        setIsDownloading(false)
        setDownloadProgress(0)
      }
      return
    }

    if (!fileData) return
    try {
      const blob = base64ToBlob(fileData)
      createDownloadLink(blob, fileName || t('fileAttachment.downloadDefault'))
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const handleDelete = async (e) => {
    e.stopPropagation()

    if (
      !window.confirm(
        t('fileAttachment.deleteConfirm', { name: fileName || t('fileAttachment.thisFile') })
      )
    )
      return

    try {
      await deleteHyperdriveFile(noteKey, url)
    } catch (error) {
      console.error('Error deleting file from backend:', error)
      return
    }

    // Reclaim the cached thumbnail now rather than leaving it for the next sweep.
    await deletePdfThumb(url).catch(() => {})

    if (deleteNode) deleteNode()
  }

  return (
    <NodeViewWrapper className='file-attachment-wrapper'>
      {isAudio ? (
        <div className='relative my-3 group'>
          <AudioPlayer
            src={resolvedUrl || fileData}
            duration={node.attrs.duration || 0}
            title={fileName || t('attachments.audioAttachment')}
          />

          {isDownloading && (
            <div className='absolute inset-0 z-30 flex flex-col items-center justify-center gap-1.5 bg-black/40 rounded-xl'>
              <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
              <span className='text-xs font-semibold text-white'>{downloadProgress}%</span>
            </div>
          )}

          <div className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-20'>
            {(resolvedUrl || fileData) && (
              <button
                onClick={handleDownload}
                className='flex-shrink-0 p-2.5 rounded-lg hover:bg-bg-tertiary transition-all duration-200'
                title={t('common.download')}
              >
                <Download className='w-4 h-4 text-text-secondary' />
              </button>
            )}
            <button
              onClick={handleDelete}
              className='flex-shrink-0 p-2.5 rounded-lg hover:bg-accent-danger/10 transition-all duration-200'
              title={t('common.delete')}
            >
              <Trash2 className='w-4 h-4 text-accent-danger' />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`flex flex-col my-3 bg-bg-secondary border border-border-primary rounded-xl group transition-all duration-300 overflow-hidden ${isVideo ? 'max-w-2xl w-full shadow-md' : ''}`}
        >
          {isVideo &&
            (resolvedUrl || fileData) &&
            (isFullscreen ? (
              <>
                <div className='relative aspect-video bg-bg-tertiary w-full flex items-center justify-center text-text-tertiary text-xs select-none rounded-t-xl border-b border-border-primary'>
                  {t('fileAttachment.playingFullscreen')}
                </div>
                {createPortal(
                  <div
                    ref={playerRef}
                    className='fixed inset-0 z-[9999] w-screen h-screen bg-black flex items-center justify-center group/player'
                  >
                    <video
                      ref={mediaRef}
                      src={resolvedUrl || fileData}
                      className='w-full h-full object-contain max-h-screen'
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePlayPause(e)
                      }}
                    />
                    <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover/player:opacity-100 transition-opacity bg-black/30 pointer-events-none z-10'>
                      <button
                        onClick={togglePlayPause}
                        className='w-14 h-14 rounded-full bg-accent-primary flex items-center justify-center text-accent-on-primary pointer-events-auto shadow-lg hover:scale-105 transition-transform'
                      >
                        {isPlaying ? (
                          <Pause className='w-6 h-6 fill-white' />
                        ) : (
                          <Play className='w-6 h-6 fill-white ml-0.5' />
                        )}
                      </button>
                    </div>

                    <div className='absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 opacity-0 group-hover/player:opacity-100 focus-within/player:opacity-100 transition-opacity flex flex-col gap-3 z-20'>
                      <div className='relative h-1.5 bg-white/20 w-full rounded-full group/slider'>
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

                      <div className='flex items-center justify-between text-white text-xs'>
                        <div className='flex items-center gap-3'>
                          <button
                            onClick={togglePlayPause}
                            className='hover:text-accent-primary transition-colors p-1'
                            title={isPlaying ? t('common.pause') : t('common.play')}
                          >
                            {isPlaying ? (
                              <Pause className='w-4 h-4 fill-white' />
                            ) : (
                              <Play className='w-4 h-4 fill-white ml-0.5' />
                            )}
                          </button>
                          <span className='font-mono select-none'>
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                        </div>

                        <div className='flex items-center gap-2'>
                          <button
                            onClick={toggleFullscreen}
                            className='hover:text-accent-primary transition-colors p-1'
                            title={t('fileAttachment.exitFullscreen')}
                          >
                            <Minimize2 className='w-4 h-4 text-white' />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              </>
            ) : (
              <div
                ref={playerRef}
                className='relative aspect-video bg-black group/player w-full overflow-hidden'
              >
                <video
                  ref={mediaRef}
                  src={resolvedUrl || fileData}
                  className='w-full h-full object-contain'
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePlayPause(e)
                  }}
                />
                <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover/player:opacity-100 transition-opacity bg-black/30 pointer-events-none z-10'>
                  <button
                    onClick={togglePlayPause}
                    className='w-14 h-14 rounded-full bg-accent-primary flex items-center justify-center text-accent-on-primary pointer-events-auto shadow-lg hover:scale-105 transition-transform'
                  >
                    {isPlaying ? (
                      <Pause className='w-6 h-6 fill-white' />
                    ) : (
                      <Play className='w-6 h-6 fill-white ml-0.5' />
                    )}
                  </button>
                </div>

                <div className='absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 group-hover/player:opacity-100 focus-within/player:opacity-100 transition-opacity flex flex-col gap-2 z-20'>
                  <div className='relative h-1.5 bg-white/20 w-full rounded-full group/slider'>
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

                  <div className='flex items-center justify-between text-white text-xs'>
                    <div className='flex items-center gap-3'>
                      <button
                        onClick={togglePlayPause}
                        className='hover:text-accent-primary transition-colors p-1'
                        title={isPlaying ? t('common.pause') : t('common.play')}
                      >
                        {isPlaying ? (
                          <Pause className='w-4 h-4 fill-white' />
                        ) : (
                          <Play className='w-4 h-4 fill-white ml-0.5' />
                        )}
                      </button>
                      <span className='font-mono select-none'>
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className='flex items-center gap-2'>
                      <button
                        onClick={toggleFullscreen}
                        className='hover:text-accent-primary transition-colors p-1'
                        title={t('fileAttachment.fullscreen')}
                      >
                        <Maximize2 className='w-4 h-4 text-white' />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

          <PdfAttachmentPreview
            preview={pdfPreview}
            fileName={fileName || t('fileAttachment.untitledFile')}
            onOpen={openPreview}
          />

          <div
            className={`relative flex items-center gap-4 cursor-pointer ${isVideo ? 'p-6' : 'p-4'}`}
            onClick={openPreview}
          >
            {isDownloading && (
              <div className='absolute inset-0 z-30 flex flex-col items-center justify-center gap-1.5 bg-black/40 rounded-xl'>
                <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                <span className='text-xs font-semibold text-white'>{downloadProgress}%</span>
              </div>
            )}

            <div className='flex-shrink-0 w-12 h-12 rounded-xl bg-bg-tertiary flex items-center justify-center text-text-secondary border border-border-primary'>
              {getFileIcon()}
            </div>

            <div className='flex-1 min-w-0'>
              <p className='text-sm font-semibold text-text-primary truncate mb-1'>
                {fileName || t('fileAttachment.untitledFile')}
              </p>
              <div className='flex items-center gap-2'>
                <span className='text-xs font-medium text-text-tertiary bg-bg-tertiary px-2 py-0.5 rounded-md'>
                  {getFileExtension()}
                </span>
                <span className='text-xs text-text-tertiary'>•</span>
                <span className='text-xs text-text-tertiary'>{formatFileSize(fileSize)}</span>
                {pdfPreview?.pageCount > 0 && (
                  <>
                    <span className='text-xs text-text-tertiary'>•</span>
                    <span className='text-xs text-text-tertiary'>
                      {t('fileAttachment.pageCount', { count: pdfPreview.pageCount })}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-20'>
              {isPdf && extractTextReady && (resolvedUrl || fileData) && (
                <button
                  onClick={handleExtractText}
                  className='flex-shrink-0 p-2.5 rounded-lg hover:bg-bg-tertiary transition-all duration-200'
                  title={t('localAi.extract.actionLabel')}
                  aria-label={t('localAi.extract.actionLabel')}
                >
                  <ScanText className='w-4 h-4 text-text-secondary' />
                </button>
              )}
              {(resolvedUrl || fileData) && (
                <button
                  onClick={handleDownload}
                  className='flex-shrink-0 p-2.5 rounded-lg hover:bg-bg-tertiary transition-all duration-200'
                  title={t('common.download')}
                >
                  <Download className='w-4 h-4 text-text-secondary' />
                </button>
              )}
              <button
                onClick={handleDelete}
                className='flex-shrink-0 p-2.5 rounded-lg hover:bg-accent-danger/10 transition-all duration-200'
                title={t('common.delete')}
              >
                <Trash2 className='w-4 h-4 text-accent-danger' />
              </button>
            </div>
          </div>
        </div>
      )}
      {isPreviewOpen && (
        <MediaPreviewModal
          url={resolvedUrl || fileData}
          fileName={fileName || t('fileAttachment.fileDefault')}
          fileType={fileType}
          onClose={closePreview}
          onDownload={handleDownload}
          isDownloading={isDownloading}
          downloadProgress={downloadProgress}
        />
      )}
    </NodeViewWrapper>
  )
}
