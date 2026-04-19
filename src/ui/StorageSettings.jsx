import {
  subscribeStorageInfo,
  getNotesStorageInfo,
  getTotalBlobBytes,
  getTotalOnDiskBytes,
  getReclaimableBytes,
  getStorageIsLoading,
  getStorageError,
  deleteNoteMedia,
  selectStorageByKind,
  mediaKind
} from '@pear-notes/core/store/slices/storageSlice.js'
import { clearStorage, getNeedsReload } from '@pear-notes/core/store/slices/syncSlice.js'
import { AlertTriangle, ChevronDown, ChevronRight, Database, HardDrive, Info, Trash2, X, Image as ImageIcon, Film, Mic, FileText, PenLine } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

function formatBytes(bytes) {
  if (!bytes || bytes < 1) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}

function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false)
  return (
    <span
      className='relative inline-flex items-center'
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 rounded-xl bg-bg-panel border border-white/[0.1] text-[12px] text-text-tertiary leading-relaxed shadow-xl z-50 pointer-events-none animate-in fade-in duration-150'>
          {text}
        </span>
      )}
    </span>
  )
}

function NoteRow({ note, onDeleteMedia }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className='border-b border-white/[0.04] last:border-0'>
      <button
        onClick={() => setExpanded((v) => !v)}
        className='w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition-colors group'
      >
        <div className='flex items-center gap-3 min-w-0'>
          {expanded
            ? <ChevronDown className='w-3.5 h-3.5 text-text-tertiary flex-shrink-0' />
            : <ChevronRight className='w-3.5 h-3.5 text-text-tertiary flex-shrink-0' />}
          <span className='text-[14px] font-medium text-text-primary truncate'>
            {note.title || 'Untitled'}
          </span>
        </div>
        <span className='text-[13px] font-bold text-text-tertiary flex-shrink-0 ml-4'>
          {formatBytes(note.totalSize)}
        </span>
      </button>

      {expanded && (
        <div className='px-5 pb-3 space-y-1'>
          <div className='flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-colors'>
            <div className='flex items-center gap-2 min-w-0'>
              <PenLine className='w-4 h-4 text-text-tertiary flex-shrink-0' />
              <span className='text-[13px] text-text-secondary truncate'>Text</span>
              <span className='text-[12px] text-text-tertiary flex-shrink-0'>{formatBytes(note.contentSize)}</span>
            </div>
            {/* No delete button for Text */}
          </div>

          {note.media?.map((m) => {
            const kind = mediaKind(m.name)
            let Icon = FileText
            if (kind === 'image') Icon = ImageIcon
            if (kind === 'video') Icon = Film
            if (kind === 'audio') Icon = Mic

            return (
              <div key={m.path} className='flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-colors group/item'>
                <div className='flex items-center gap-2 min-w-0'>
                  <Icon className='w-4 h-4 text-text-tertiary flex-shrink-0' />
                  <span className='text-[13px] text-text-secondary truncate'>{m.name}</span>
                  <span className='text-[12px] text-text-tertiary flex-shrink-0'>{formatBytes(m.size)}</span>
                </div>
                <button
                  onClick={() => onDeleteMedia(note.key, m.path)}
                  className='opacity-0 group-hover/item:opacity-100 p-1.5 rounded-lg hover:bg-accent-danger/10 text-text-tertiary hover:text-accent-danger transition-all ml-2 flex-shrink-0'
                  title='Remove from note'
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

export default function StorageSettings() {
  const dispatch = useDispatch()
  const totalBlobBytes = useSelector(getTotalBlobBytes)
  const totalOnDiskBytes = useSelector(getTotalOnDiskBytes)
  const reclaimableBytes = useSelector(getReclaimableBytes)
  const notesStorageInfo = useSelector(getNotesStorageInfo)
  const buckets = useSelector(selectStorageByKind)
  const isLoading = useSelector(getStorageIsLoading)
  const error = useSelector(getStorageError)
  const needsReload = useSelector(getNeedsReload)

  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    dispatch(subscribeStorageInfo())
  }, [dispatch])

  useEffect(() => {
    if (needsReload) {
      Pear.reload()
    }
  }, [needsReload])

  const handleDeleteMedia = (noteKey, mediaPath) => {
    dispatch(deleteNoteMedia({ noteKey, mediaPath }))
  }

  const handleClearStorage = () => {
    setConfirmClear(false)
    dispatch(clearStorage())
  }

  const blobPct = totalOnDiskBytes > 0 ? Math.round((totalBlobBytes / totalOnDiskBytes) * 100) : 100

  return (
    <div className='max-w-2xl mx-auto space-y-6'>
      {error && (
        <div className='flex items-center gap-3 px-4 py-3 rounded-xl bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-[13px]'>
          <AlertTriangle className='w-4 h-4 flex-shrink-0' />
          {error}
        </div>
      )}

      <div className='space-y-1'>
        <h3 className='text-text-primary/40 font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>Usage</h3>
        <div className='bg-bg-panel/20 border border-white/[0.05] rounded-3xl overflow-hidden backdrop-blur-md'>
          {isLoading && totalBlobBytes === 0 ? (
            <div className='px-6 py-8 flex items-center justify-center'>
              <svg className='animate-spin w-5 h-5 text-accent-primary' fill='none' viewBox='0 0 24 24'>
                <circle className='opacity-20' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' />
                <path className='opacity-90' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
              </svg>
            </div>
          ) : (
            <>
              <div className='px-6 py-5 flex items-center justify-between border-b border-white/[0.05]'>
                <div className='flex items-center gap-2'>
                  <Database className='w-4 h-4 text-text-tertiary' />
                  <span className='text-[15px] font-semibold text-text-primary'>Notes data</span>
                  <Tooltip text='Total size of media currently referenced by your notes.'>
                    <Info className='w-3.5 h-3.5 text-text-tertiary/50 cursor-default' />
                  </Tooltip>
                </div>
                <span className='text-[22px] font-black text-text-primary tracking-tight'>
                  {formatBytes(totalBlobBytes)}
                </span>
              </div>

              <div className='px-6 py-5 flex items-center justify-between border-b border-white/[0.05]'>
                <div className='flex items-center gap-2'>
                  <HardDrive className='w-4 h-4 text-text-tertiary' />
                  <span className='text-[15px] font-semibold text-text-secondary'>On-disk footprint</span>
                  <Tooltip text='Hypercore storage is append-only. Deleted media stays on disk until you clear all data.'>
                    <Info className='w-3.5 h-3.5 text-text-tertiary/50 cursor-default' />
                  </Tooltip>
                </div>
                <span className='text-[15px] font-bold text-text-secondary'>{formatBytes(totalOnDiskBytes)}</span>
              </div>

              {reclaimableBytes > 0 && (
                <div className='px-6 py-5 flex items-center justify-between border-b border-white/[0.05]'>
                  <span className='text-[15px] font-semibold text-text-tertiary'>Reclaimable</span>
                  <span className='text-[15px] font-bold text-accent-primary'>{formatBytes(reclaimableBytes)}</span>
                </div>
              )}

              <div className='px-6 py-4'>
                <div className='w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-accent-primary rounded-full transition-all duration-500'
                    style={{ width: `${blobPct}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {buckets && (
        <div className='space-y-1'>
          <h3 className='text-text-primary/40 font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>Breakdown by type</h3>
          <div className='bg-bg-panel/20 border border-white/[0.05] rounded-3xl overflow-hidden backdrop-blur-md'>
             {isLoading && totalBlobBytes === 0 ? null : (
               <div className='p-2'>
                 {buckets.image.count > 0 && (
                   <div className='px-4 py-3 flex items-center justify-between hover:bg-white/[0.03] rounded-xl transition-colors'>
                     <div className='flex items-center gap-3'>
                       <ImageIcon className='w-4 h-4 text-text-tertiary' />
                       <span className='text-[14px] font-medium text-text-primary'>Images</span>
                       <span className='text-[13px] text-text-tertiary'>{buckets.image.count} items</span>
                     </div>
                     <span className='text-[14px] font-bold text-text-secondary'>{formatBytes(buckets.image.size)}</span>
                   </div>
                 )}
                 {buckets.video.count > 0 && (
                   <div className='px-4 py-3 flex items-center justify-between hover:bg-white/[0.03] rounded-xl transition-colors'>
                     <div className='flex items-center gap-3'>
                       <Film className='w-4 h-4 text-text-tertiary' />
                       <span className='text-[14px] font-medium text-text-primary'>Videos</span>
                       <span className='text-[13px] text-text-tertiary'>{buckets.video.count} items</span>
                     </div>
                     <span className='text-[14px] font-bold text-text-secondary'>{formatBytes(buckets.video.size)}</span>
                   </div>
                 )}
                 {buckets.audio.count > 0 && (
                   <div className='px-4 py-3 flex items-center justify-between hover:bg-white/[0.03] rounded-xl transition-colors'>
                     <div className='flex items-center gap-3'>
                       <Mic className='w-4 h-4 text-text-tertiary' />
                       <span className='text-[14px] font-medium text-text-primary'>Voice notes</span>
                       <span className='text-[13px] text-text-tertiary'>{buckets.audio.count} items</span>
                     </div>
                     <span className='text-[14px] font-bold text-text-secondary'>{formatBytes(buckets.audio.size)}</span>
                   </div>
                 )}
                 {buckets.file.count > 0 && (
                   <div className='px-4 py-3 flex items-center justify-between hover:bg-white/[0.03] rounded-xl transition-colors'>
                     <div className='flex items-center gap-3'>
                       <FileText className='w-4 h-4 text-text-tertiary' />
                       <span className='text-[14px] font-medium text-text-primary'>Files</span>
                       <span className='text-[13px] text-text-tertiary'>{buckets.file.count} items</span>
                     </div>
                     <span className='text-[14px] font-bold text-text-secondary'>{formatBytes(buckets.file.size)}</span>
                   </div>
                 )}
                 {buckets.text.count > 0 && (
                   <div className='px-4 py-3 flex items-center justify-between hover:bg-white/[0.03] rounded-xl transition-colors'>
                     <div className='flex items-center gap-3'>
                       <PenLine className='w-4 h-4 text-text-tertiary' />
                       <span className='text-[14px] font-medium text-text-primary'>Text</span>
                       <span className='text-[13px] text-text-tertiary'>(all notes)</span>
                     </div>
                     <span className='text-[14px] font-bold text-text-secondary'>{formatBytes(buckets.text.size)}</span>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>
      )}

      {notesStorageInfo.length > 0 && (
        <div className='space-y-1'>
          <h3 className='text-text-primary/40 font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>Per-Note Breakdown</h3>
          <div className='bg-bg-panel/20 border border-white/[0.05] rounded-3xl overflow-hidden backdrop-blur-md'>
            {notesStorageInfo.map((note) => (
              <NoteRow key={note.key} note={note} onDeleteMedia={handleDeleteMedia} />
            ))}
          </div>
        </div>
      )}

      <div className='space-y-1'>
        <h3 className='text-text-primary/40 font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>Danger Zone</h3>
        <div className='bg-bg-panel/20 border border-white/[0.05] rounded-3xl overflow-hidden backdrop-blur-md'>
          <div className='px-6 py-5 flex items-center justify-between'>
            <div className='space-y-1'>
              <p className='text-[15px] font-bold text-text-primary'>Clear All Data</p>
              <p className='text-[13px] text-text-tertiary font-medium opacity-60'>
                Permanently deletes all notes, folders, settings, and media.
              </p>
            </div>
            <button
              onClick={() => setConfirmClear(true)}
              disabled={totalOnDiskBytes === 0}
              className='flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-[13px] font-bold hover:bg-accent-danger/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95'
            >
              <Trash2 className='w-3.5 h-3.5' />
              Clear Storage
            </button>
          </div>
        </div>
      </div>

      {confirmClear && (
        <div className='fixed inset-0 z-[300] flex items-center justify-center p-6'>
          <div className='absolute inset-0 bg-black/60 backdrop-blur-xl' onClick={() => setConfirmClear(false)} />
          <div className='relative bg-bg-panel/90 backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] p-8 max-w-sm w-full shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 fade-in duration-200'>
            <div className='flex flex-col items-center text-center space-y-4'>
              <div className='w-14 h-14 rounded-2xl bg-accent-danger/10 flex items-center justify-center ring-1 ring-accent-danger/20'>
                <Trash2 className='w-6 h-6 text-accent-danger' />
              </div>
              <div className='space-y-2'>
                <h3 className='text-[18px] font-bold text-text-primary'>Clear All Data?</h3>
                <p className='text-[13px] text-text-tertiary leading-relaxed'>
                  This will permanently delete ALL notes, folders, settings, and media. This cannot be undone.
                </p>
              </div>
              <div className='flex gap-3 w-full pt-2'>
                <button
                  onClick={() => setConfirmClear(false)}
                  className='flex-1 py-3 bg-white/[0.04] border border-white/[0.08] text-text-secondary rounded-xl font-bold text-[14px] hover:bg-white/[0.08] transition-all active:scale-95'
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearStorage}
                  className='flex-1 py-3 bg-accent-danger text-white rounded-xl font-bold text-[14px] hover:opacity-90 transition-all active:scale-95 shadow-[0_4px_15px_rgba(var(--accent-danger-rgb),0.3)]'
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
