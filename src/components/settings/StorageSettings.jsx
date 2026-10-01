import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CircleArrowDown,
  CircleArrowUp,
  Database,
  FileText,
  Film,
  HardDrive,
  Image as ImageIcon,
  Info,
  Mic,
  Pause,
  PenLine,
  Play,
  RotateCw,
  Trash2,
  WifiOff,
  X
} from 'lucide-react'

import { isMultiVaultEnabled } from '@pear-notes/core/constant.js'
import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { getLocalAiLoaded, initLocalAi } from '@pear-notes/core/store/slices/localAiSlice.js'
import {
  deleteNoteMedia,
  getActiveDownloads,
  getActiveUploads,
  getIsReclaiming,
  getNotesStorageInfo,
  getStorageError,
  getStorageIsLoading,
  getTotalBlobBytes,
  getTotalOnDiskBytes,
  mediaKind,
  pauseDownload,
  reclaimStorage,
  retryDownload,
  selectStorageByKind,
  subscribeStorageInfo,
  unsubscribeStorageInfo
} from '@pear-notes/core/store/slices/storageSlice.js'
import {
  getCurrentVault,
  getHasMultipleVaults,
  removeVault
} from '@pear-notes/core/store/slices/vaultsSlice.js'
import { formatBytes, groupTransfersByNote } from '@pear-notes/core/utils.js'

import { useClearAllData } from '../../hooks/useClearAllData'
import { getVaultLabel } from '../../lib/vaultNames'

import ClearingOverlay from './ClearingOverlay'
import DangerConfirmModal from './DangerConfirmModal'
import DeviceStorageSection from './DeviceStorageSection'

const TRANSFER_LIST_CLASS =
  'bg-bg-secondary border border-border-primary rounded-3xl overflow-y-auto overflow-x-hidden max-h-[340px]'

const TOOLTIP_WIDTH = 256
const TOOLTIP_GAP = 8
const TOOLTIP_MARGIN = 12

function Tooltip({ text, children }) {
  const triggerRef = useRef(null)
  const [position, setPosition] = useState(null)

  const showTooltip = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const half = TOOLTIP_WIDTH / 2
    const minLeft = TOOLTIP_MARGIN + half
    const maxLeft = window.innerWidth - TOOLTIP_MARGIN - half
    const left = Math.min(Math.max(rect.left + rect.width / 2, minLeft), Math.max(minLeft, maxLeft))
    const flipBelow = rect.top - TOOLTIP_GAP < TOOLTIP_MARGIN
    setPosition({
      left,
      top: flipBelow ? rect.bottom + TOOLTIP_GAP : rect.top - TOOLTIP_GAP,
      flipBelow
    })
  }

  const hideTooltip = () => setPosition(null)

  return (
    <>
      <span
        ref={triggerRef}
        className='relative inline-flex items-center'
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {children}
      </span>
      {position &&
        createPortal(
          <span
            style={{ left: position.left, top: position.top, width: TOOLTIP_WIDTH }}
            className={`fixed -translate-x-1/2 ${position.flipBelow ? '' : '-translate-y-full'} px-3 py-2 rounded-xl bg-bg-panel border border-overlay-strong text-sm text-text-tertiary leading-relaxed shadow-xl z-[100] pointer-events-none animate-in fade-in duration-150`}
          >
            {text}
          </span>,
          document.body
        )}
    </>
  )
}

function NoteRow({ note, onDeleteMedia }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  return (
    <div className='border-b border-overlay-light last:border-0'>
      <button
        onClick={() => setExpanded((v) => !v)}
        className='w-full flex items-center justify-between px-5 py-3.5 hover:bg-overlay-subtle transition-colors group'
      >
        <div className='flex items-center gap-3 min-w-0'>
          {expanded ? (
            <ChevronDown className='w-3.5 h-3.5 text-text-tertiary flex-shrink-0' />
          ) : (
            <ChevronRight className='w-3.5 h-3.5 text-text-tertiary flex-shrink-0' />
          )}
          <span className='text-base font-medium text-text-primary truncate'>
            {note.title || t('folders.untitled')}
          </span>
        </div>
        <span className='text-sm font-bold text-text-tertiary flex-shrink-0 ml-4'>
          {formatBytes(note.totalSize)}
        </span>
      </button>

      {expanded && (
        <div className='px-5 pb-3 space-y-1'>
          <div className='flex items-center justify-between py-2 px-3 rounded-xl hover:bg-overlay-subtle transition-colors'>
            <div className='flex items-center gap-2 min-w-0'>
              <PenLine className='w-4 h-4 text-text-tertiary flex-shrink-0' />
              <span className='text-sm text-text-secondary truncate'>{t('backup.text')}</span>
              <span className='text-sm text-text-tertiary flex-shrink-0'>
                {formatBytes(note.contentSize)}
              </span>
            </div>
          </div>

          {note.media?.map((m) => {
            const kind = mediaKind(m.name)
            let Icon = FileText
            if (kind === 'image') Icon = ImageIcon
            if (kind === 'video') Icon = Film
            if (kind === 'audio') Icon = Mic

            return (
              <div
                key={m.path}
                className='flex items-center justify-between py-2 px-3 rounded-xl hover:bg-overlay-subtle transition-colors group/item'
              >
                <div className='flex items-center gap-2 min-w-0'>
                  <Icon className='w-4 h-4 text-text-tertiary flex-shrink-0' />
                  <span className='text-sm text-text-secondary truncate'>{m.name}</span>
                  <span className='text-sm text-text-tertiary flex-shrink-0'>
                    {formatBytes(m.size)}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteMedia(note.key, m.path)}
                  className='opacity-0 group-hover/item:opacity-100 p-1.5 rounded-lg hover:bg-accent-danger/10 text-text-tertiary hover:text-accent-danger transition-all ml-2 flex-shrink-0'
                  title={t('storage.removeFromNote')}
                >
                  <X className='w-3.5 h-3.5' />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DownloadRow({ download, onRetry, onPause }) {
  const { t } = useTranslation()
  const pct =
    download.totalBytes > 0
      ? Math.min(100, Math.round((download.downloadedBytes / download.totalBytes) * 100))
      : 0
  const isStuck =
    download.status === 'error' || (download.status === 'downloading' && download.stalled)
  const statusLabel = !download.sourceOnline
    ? t('storage.waitingForDevice')
    : download.status === 'error'
      ? t('storage.transferFailed')
      : download.status === 'paused'
        ? t('storage.paused')
        : download.stalled
          ? t('storage.stalled')
          : null

  return (
    <div className='px-5 py-3.5 border-b border-overlay-light last:border-0'>
      <div className='flex items-center justify-between gap-3 mb-2'>
        <div className='flex items-center gap-2 min-w-0'>
          <CircleArrowDown className='w-4 h-4 text-accent-primary flex-shrink-0' />
          <span className='text-sm font-medium text-text-primary truncate'>
            {download.fileName || t('storage.attachment')}
          </span>
          {!download.sourceOnline && (
            <span title={t('storage.waitingOnlineTooltip')}>
              <WifiOff className='w-3.5 h-3.5 text-text-tertiary/60 flex-shrink-0' />
            </span>
          )}
        </div>
        <div className='flex items-center gap-2 flex-shrink-0'>
          <span className='text-sm font-bold text-text-tertiary'>
            {formatBytes(download.downloadedBytes)} / {formatBytes(download.totalBytes)}
          </span>
          {download.status === 'downloading' && !download.stalled && (
            <button
              onClick={() => onPause(download.url)}
              title={t('common.pause')}
              className='p-1 rounded-lg hover:bg-overlay-subtle text-accent-primary transition-colors'
            >
              <Pause className='w-3.5 h-3.5' />
            </button>
          )}
          {download.status === 'paused' && (
            <button
              onClick={() => onRetry(download.url)}
              title={t('common.resume')}
              className='p-1 rounded-lg hover:bg-overlay-subtle text-accent-primary transition-colors'
            >
              <Play className='w-3.5 h-3.5' />
            </button>
          )}
          {isStuck && (
            <button
              onClick={() => onRetry(download.url)}
              title={t('common.restart')}
              className='p-1 rounded-lg hover:bg-overlay-subtle text-accent-primary transition-colors'
            >
              <RotateCw className='w-3.5 h-3.5' />
            </button>
          )}
        </div>
      </div>
      <div className='w-full h-1 bg-overlay-soft rounded-full overflow-hidden'>
        <div
          className='h-full bg-accent-primary rounded-full transition-all duration-300'
          style={{ width: `${pct}%` }}
        />
      </div>
      {statusLabel && <p className='text-xs text-text-tertiary mt-1.5'>{statusLabel}</p>}
    </div>
  )
}

function UploadRow({ upload }) {
  const { t } = useTranslation()
  const pct =
    upload.totalBytes > 0
      ? Math.min(100, Math.round((upload.uploadedBytes / upload.totalBytes) * 100))
      : 0

  return (
    <div className='px-5 py-3.5 border-b border-overlay-light last:border-0'>
      <div className='flex items-center justify-between gap-3 mb-2'>
        <div className='flex items-center gap-2 min-w-0'>
          <CircleArrowUp className='w-4 h-4 text-accent-primary flex-shrink-0' />
          <span className='text-sm font-medium text-text-primary truncate'>
            {upload.fileName || t('storage.attachment')}
          </span>
        </div>
        <span className='text-sm font-bold text-text-tertiary flex-shrink-0'>
          {formatBytes(upload.uploadedBytes)} / {formatBytes(upload.totalBytes)}
        </span>
      </div>
      <div className='w-full h-1 bg-overlay-soft rounded-full overflow-hidden'>
        <div
          className='h-full bg-accent-primary rounded-full transition-all duration-300'
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function TransferNoteGroup({ group, renderRow }) {
  return (
    <div className='border-b border-overlay-light last:border-0'>
      <div className='px-5 pt-3 pb-1 text-sm font-semibold text-text-tertiary truncate'>
        {group.title}
      </div>
      {group.items.map(renderRow)}
    </div>
  )
}

function getClearCopy({ multiVault, onlyThisVault, name, t }) {
  if (!multiVault) {
    return {
      title: t('storage.clearAllData'),
      description: t('storage.clearAllDataDesc'),
      button: t('storage.clearStorage'),
      confirmTitle: t('backup.clearAllDataTitle'),
      confirmDescription: t('backup.clearAllDataDesc')
    }
  }
  const description = onlyThisVault
    ? t('storage.clearVaultDesc', { name })
    : t('storage.clearOnlyVaultDesc', { name })
  return {
    title: t('storage.clearVault', { name }),
    description,
    button: t('storage.clearVaultBtn'),
    confirmTitle: t('storage.clearVaultConfirmTitle', { name }),
    confirmDescription: description
  }
}

export default function StorageSettings({ onOpenOnDeviceAi }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const localAiLoaded = useSelector(getLocalAiLoaded)

  useEffect(() => {
    if (LOCAL_AI_ENABLED && !localAiLoaded) dispatch(initLocalAi())
  }, [dispatch, localAiLoaded])
  const totalBlobBytes = useSelector(getTotalBlobBytes)
  const totalOnDiskBytes = useSelector(getTotalOnDiskBytes)
  const isReclaiming = useSelector(getIsReclaiming)
  const activeDownloads = useSelector(getActiveDownloads)
  const activeUploads = useSelector(getActiveUploads)
  const notesStorageInfo = useSelector(getNotesStorageInfo)
  const buckets = useSelector(selectStorageByKind)
  const isLoading = useSelector(getStorageIsLoading)
  const error = useSelector(getStorageError)
  const [confirmClear, setConfirmClear] = useState(false)
  const hasMultipleVaults = useSelector(getHasMultipleVaults)
  const currentVault = useSelector(getCurrentVault)
  const currentVaultName = getVaultLabel(currentVault, t)
  const { isClearing, clearAll } = useClearAllData()

  const noteTitleByKey = useMemo(() => {
    const map = {}
    for (const note of notesStorageInfo) map[note.key] = note.title
    return map
  }, [notesStorageInfo])

  const downloadGroups = useMemo(
    () => groupTransfersByNote(activeDownloads, noteTitleByKey, t('folders.untitled')),
    [activeDownloads, noteTitleByKey, t]
  )
  const uploadGroups = useMemo(
    () => groupTransfersByNote(activeUploads, noteTitleByKey, t('folders.untitled')),
    [activeUploads, noteTitleByKey, t]
  )

  useEffect(() => {
    dispatch(subscribeStorageInfo())
    return () => {
      dispatch(unsubscribeStorageInfo())
    }
  }, [dispatch])

  const handleDeleteMedia = (noteKey, mediaPath) => {
    dispatch(deleteNoteMedia({ noteKey, mediaPath }))
  }

  const handleRetryDownload = (url) => {
    dispatch(retryDownload({ url }))
  }

  const handlePauseDownload = (url) => {
    dispatch(pauseDownload({ url }))
  }

  const clearsOnlyThisVault = isMultiVaultEnabled() && hasMultipleVaults
  const clearCopy = getClearCopy({
    multiVault: isMultiVaultEnabled(),
    onlyThisVault: clearsOnlyThisVault,
    name: currentVaultName,
    t
  })

  const handleConfirmClear = () => {
    setConfirmClear(false)
    if (clearsOnlyThisVault && currentVault) dispatch(removeVault({ id: currentVault.id }))
    else clearAll()
  }

  const handleReclaim = () => {
    dispatch(reclaimStorage())
  }

  const [deviceStorage, setDeviceStorage] = useState(null)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [isDeletingOldVaults, setIsDeletingOldVaults] = useState(false)
  const [confirmOldVaults, setConfirmOldVaults] = useState(false)

  const refreshDeviceStorage = useCallback(async () => {
    const summary = await window.electronBridge?.getDeviceStorage?.().catch(() => null)
    if (summary) setDeviceStorage(summary)
  }, [])

  useEffect(() => {
    if (!isReclaiming) refreshDeviceStorage()
  }, [isReclaiming, refreshDeviceStorage])

  const handleClearCache = async () => {
    setIsClearingCache(true)
    try {
      await window.electronBridge?.clearCache?.()
      await refreshDeviceStorage()
    } finally {
      setIsClearingCache(false)
    }
  }

  const handleConfirmDeleteOldVaults = async () => {
    setConfirmOldVaults(false)
    setIsDeletingOldVaults(true)
    try {
      await window.electronBridge?.deleteOldVaults?.()
      await refreshDeviceStorage()
    } finally {
      setIsDeletingOldVaults(false)
    }
  }

  const hasBreakdown = useMemo(
    () => Boolean(buckets) && Object.values(buckets).some((bucket) => bucket.count > 0),
    [buckets]
  )

  return (
    <div className='max-w-2xl mx-auto space-y-6'>
      {error && (
        <div className='flex items-center gap-3 px-4 py-3 rounded-xl bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-sm'>
          <AlertTriangle className='w-4 h-4 flex-shrink-0' />
          {error}
        </div>
      )}

      {activeDownloads.length > 0 && (
        <div className='space-y-1'>
          <h3 className='text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'>
            {t('storage.syncingFromDevices')} ({activeDownloads.length})
          </h3>
          <div className={TRANSFER_LIST_CLASS}>
            {downloadGroups.map((group) => (
              <TransferNoteGroup
                key={group.noteKey}
                group={group}
                renderRow={(download) => (
                  <DownloadRow
                    key={download.url}
                    download={download}
                    onRetry={handleRetryDownload}
                    onPause={handlePauseDownload}
                  />
                )}
              />
            ))}
          </div>
        </div>
      )}

      {activeUploads.length > 0 && (
        <div className='space-y-1'>
          <h3 className='text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'>
            {t('storage.syncingToDevices')} ({activeUploads.length})
          </h3>
          <div className={TRANSFER_LIST_CLASS}>
            {uploadGroups.map((group) => (
              <TransferNoteGroup
                key={group.noteKey}
                group={group}
                renderRow={(upload) => <UploadRow key={upload.url} upload={upload} />}
              />
            ))}
          </div>
        </div>
      )}

      <div className='space-y-1'>
        <h3 className='text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'>
          {t('storage.usage')}
        </h3>
        <div className='bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden'>
          {isLoading && totalBlobBytes === 0 ? (
            <div className='px-6 py-8 flex items-center justify-center'>
              <svg
                className='animate-spin w-5 h-5 text-accent-primary'
                fill='none'
                viewBox='0 0 24 24'
              >
                <circle
                  className='opacity-20'
                  cx='12'
                  cy='12'
                  r='10'
                  stroke='currentColor'
                  strokeWidth='3'
                />
                <path
                  className='opacity-90'
                  fill='currentColor'
                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
                />
              </svg>
            </div>
          ) : (
            <>
              <div className='px-6 py-5 flex items-center justify-between border-b border-border-primary'>
                <div className='flex items-center gap-2'>
                  <Database className='w-4 h-4 text-text-tertiary' />
                  <span className='text-base font-semibold text-text-primary'>
                    {t('storage.notesData')}
                  </span>
                  <Tooltip text={t('storage.notesDataTooltip')}>
                    <Info className='w-3.5 h-3.5 text-text-tertiary/50 cursor-default' />
                  </Tooltip>
                </div>
                <span className='text-title font-black text-text-primary tracking-tight'>
                  {formatBytes(totalBlobBytes)}
                </span>
              </div>

              <div className='px-6 py-5 flex items-center justify-between border-b border-border-primary'>
                <div className='flex items-center gap-2'>
                  <HardDrive className='w-4 h-4 text-text-tertiary' />
                  <span className='text-base font-semibold text-text-secondary'>
                    {t('storage.diskFootprint')}
                  </span>
                  <Tooltip text={t('storage.diskFootprintTooltip')}>
                    <Info className='w-3.5 h-3.5 text-text-tertiary/50 cursor-default' />
                  </Tooltip>
                </div>
                <span className='text-base font-bold text-text-secondary'>
                  {formatBytes(totalOnDiskBytes)}
                </span>
              </div>

              <div className='px-6 py-5 flex items-center justify-between'>
                <div className='flex flex-col'>
                  <span className='text-base font-semibold text-text-tertiary'>
                    {t('storage.compact')}
                  </span>
                  <span className='text-sm text-text-tertiary/70'>{t('storage.compactDesc')}</span>
                </div>
                <button
                  onClick={handleReclaim}
                  disabled={isReclaiming}
                  className='px-3 py-1.5 rounded-xl bg-accent-primary/10 text-accent-primary text-sm font-semibold hover:bg-accent-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isReclaiming ? t('storage.compacting') : t('storage.compactNow')}
                </button>
              </div>

            </>
          )}
        </div>
      </div>

      <DeviceStorageSection
        summary={deviceStorage}
        showAiModels={LOCAL_AI_ENABLED}
        isClearingCache={isClearingCache}
        isDeletingOldVaults={isDeletingOldVaults}
        onClearCache={handleClearCache}
        onDeleteOldVaults={() => setConfirmOldVaults(true)}
        onOpenAiModels={onOpenOnDeviceAi}
      />

      {hasBreakdown && (
        <div className='space-y-1'>
          <h3 className='text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'>
            {t('backup.breakdownByType')}
          </h3>
          <div className='bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden'>
            <div className='p-2'>
              {buckets.image.count > 0 && (
                <div className='px-4 py-3 flex items-center justify-between hover:bg-overlay-subtle rounded-xl transition-colors'>
                  <div className='flex items-center gap-3'>
                    <ImageIcon className='w-4 h-4 text-text-tertiary' />
                    <span className='text-base font-medium text-text-primary'>
                      {t('backup.images')}
                    </span>
                    <span className='text-sm text-text-tertiary'>
                      {t('backup.items', { count: buckets.image.count })}
                    </span>
                  </div>
                  <span className='text-base font-bold text-text-secondary'>
                    {formatBytes(buckets.image.size)}
                  </span>
                </div>
              )}
              {buckets.video.count > 0 && (
                <div className='px-4 py-3 flex items-center justify-between hover:bg-overlay-subtle rounded-xl transition-colors'>
                  <div className='flex items-center gap-3'>
                    <Film className='w-4 h-4 text-text-tertiary' />
                    <span className='text-base font-medium text-text-primary'>
                      {t('backup.videos')}
                    </span>
                    <span className='text-sm text-text-tertiary'>
                      {t('backup.items', { count: buckets.video.count })}
                    </span>
                  </div>
                  <span className='text-base font-bold text-text-secondary'>
                    {formatBytes(buckets.video.size)}
                  </span>
                </div>
              )}
              {buckets.audio.count > 0 && (
                <div className='px-4 py-3 flex items-center justify-between hover:bg-overlay-subtle rounded-xl transition-colors'>
                  <div className='flex items-center gap-3'>
                    <Mic className='w-4 h-4 text-text-tertiary' />
                    <span className='text-base font-medium text-text-primary'>
                      {t('backup.voiceNotes')}
                    </span>
                    <span className='text-sm text-text-tertiary'>
                      {t('backup.items', { count: buckets.audio.count })}
                    </span>
                  </div>
                  <span className='text-base font-bold text-text-secondary'>
                    {formatBytes(buckets.audio.size)}
                  </span>
                </div>
              )}
              {buckets.file.count > 0 && (
                <div className='px-4 py-3 flex items-center justify-between hover:bg-overlay-subtle rounded-xl transition-colors'>
                  <div className='flex items-center gap-3'>
                    <FileText className='w-4 h-4 text-text-tertiary' />
                    <span className='text-base font-medium text-text-primary'>
                      {t('backup.files')}
                    </span>
                    <span className='text-sm text-text-tertiary'>
                      {t('backup.items', { count: buckets.file.count })}
                    </span>
                  </div>
                  <span className='text-base font-bold text-text-secondary'>
                    {formatBytes(buckets.file.size)}
                  </span>
                </div>
              )}
              {buckets.text.count > 0 && (
                <div className='px-4 py-3 flex items-center justify-between hover:bg-overlay-subtle rounded-xl transition-colors'>
                  <div className='flex items-center gap-3'>
                    <PenLine className='w-4 h-4 text-text-tertiary' />
                    <span className='text-base font-medium text-text-primary'>
                      {t('backup.text')}
                    </span>
                    <span className='text-sm text-text-tertiary'>
                      {t('backup.textAllNotesDesc')}
                    </span>
                  </div>
                  <span className='text-base font-bold text-text-secondary'>
                    {formatBytes(buckets.text.size)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {notesStorageInfo.length > 0 && (
        <div className='space-y-1'>
          <h3 className='text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'>
            {t('storage.perNoteBreakdown')}
          </h3>
          <div className='bg-bg-secondary border border-border-primary rounded-3xl overflow-y-auto overflow-x-hidden max-h-[440px]'>
            {notesStorageInfo.map((note) => (
              <NoteRow key={note.key} note={note} onDeleteMedia={handleDeleteMedia} />
            ))}
          </div>
        </div>
      )}

      <div className='space-y-1'>
        <h3 className='text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'>
          {t('storage.dangerZone')}
        </h3>
        <div className='bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden'>
          <div className='px-6 py-5 flex items-center justify-between gap-4'>
            <div className='space-y-1'>
              <p className='text-base font-bold text-text-primary'>{clearCopy.title}</p>
              <p className='text-sm text-text-tertiary font-medium opacity-60'>
                {clearCopy.description}
              </p>
            </div>
            <button
              onClick={() => setConfirmClear(true)}
              className='flex flex-shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-sm font-bold hover:bg-accent-danger/20 transition-all active:scale-95'
            >
              <Trash2 className='w-3.5 h-3.5' />
              {clearCopy.button}
            </button>
          </div>
        </div>
      </div>

      {isClearing && <ClearingOverlay />}

      {confirmClear && (
        <DangerConfirmModal
          title={clearCopy.confirmTitle}
          description={clearCopy.confirmDescription}
          confirmLabel={t('common.clear')}
          onConfirm={handleConfirmClear}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      {confirmOldVaults && (
        <DangerConfirmModal
          title={t('storage.device.deleteOldVaultsTitle')}
          description={t('storage.device.deleteOldVaultsMessage')}
          confirmLabel={t('storage.device.deleteOldVaults')}
          onConfirm={handleConfirmDeleteOldVaults}
          onCancel={() => setConfirmOldVaults(false)}
        />
      )}
    </div>
  )
}
