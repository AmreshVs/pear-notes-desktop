import {
  getExportBuffer,
  getExportStatus,
  getImportStatus,
  resetExport,
  resetImport,
  startExportBackup,
  startImportBackup
} from '@pear-notes/core/store/slices/backupSlice.js'
import { getTotalStorageSize } from '@pear-notes/core/store/slices/storageSlice.js'
import { initApp } from '@pear-notes/core/store/slices/uiSlice.js'
import { CloudDownload, Database, HardDrive, Lock, Shield, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

const LAST_BACKUP_KEY = 'pear_notes_last_backup'

function toUint8Array(data) {
  if (data instanceof Uint8Array) return data
  return new Uint8Array(Object.values(data))
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

export default function BackupSettings() {
  const dispatch = useDispatch()
  const exportStatus = useSelector(getExportStatus)
  const importStatus = useSelector(getImportStatus)
  const exportBuffer = useSelector(getExportBuffer)
  const totalSize = useSelector(getTotalStorageSize) ?? 0

  const fileInputRef = useRef(null)
  const [lastBackup, setLastBackup] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem(LAST_BACKUP_KEY)
    if (stored) setLastBackup(new Date(stored))
  }, [])

  useEffect(() => {
    if (exportStatus.step !== 'done' || !exportBuffer) return
    try {
      const uint8 = toUint8Array(exportBuffer)
      const blob = new Blob([uint8], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `pear-notes-backup-${date}.pnbk`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      const now = new Date()
      localStorage.setItem(LAST_BACKUP_KEY, now.toISOString())
      setLastBackup(now)
    } catch {}
  }, [exportStatus.step, exportBuffer])

  useEffect(() => {
    if (importStatus.step !== 'done') return
    dispatch(initApp())
  }, [importStatus.step, dispatch])

  const activeStatus =
    exportStatus.step !== 'idle'
      ? exportStatus
      : importStatus.step !== 'idle'
      ? importStatus
      : null

  const isExporting = exportStatus.step !== 'idle' && exportStatus.step !== 'error'
  const isImporting = importStatus.step !== 'idle' && importStatus.step !== 'error'
  const showModal = activeStatus !== null
  const isDone = exportStatus.step === 'done' || importStatus.step === 'done'
  const isError = exportStatus.step === 'error' || importStatus.step === 'error'

  const handleExport = () => {
    dispatch(resetExport())
    dispatch(startExportBackup())
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const buffer = await file.arrayBuffer()
    dispatch(resetImport())
    dispatch(startImportBackup({ buffer: new Uint8Array(buffer) }))
  }

  const handleDismiss = () => {
    if (exportStatus.step === 'done' || exportStatus.step === 'error') dispatch(resetExport())
    if (importStatus.step === 'done' || importStatus.step === 'error') dispatch(resetImport())
  }

  const handleCancel = () => {
    dispatch(resetExport())
    dispatch(resetImport())
  }

  const progressValue = activeStatus?.progress ?? 0
  const progressMessage = activeStatus?.message ?? ''
  const progressStep = activeStatus?.step ?? ''

  const formatLastBackup = (date) =>
    date?.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className='max-w-2xl mx-auto px-6 py-4 space-y-6'>
      <div className='relative bg-bg-panel-secondary/40 backdrop-blur-md border border-border-primary rounded-2xl p-10 flex flex-col items-center text-center space-y-5 overflow-hidden hover:border-border-secondary transition-colors'>
        <div className='absolute -top-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-3xl rounded-full pointer-events-none' />

        <div className='w-20 h-20 bg-accent-primary/10 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/20 shadow-inner'>
          <CloudDownload className='w-10 h-10 text-accent-primary' />
        </div>

        <div className='space-y-2'>
          <h3 className='text-text-primary font-bold text-xl'>Secure Your Vault</h3>
          <p className='text-text-tertiary text-sm max-w-sm leading-relaxed'>
            Export a fully encrypted backup of all your notes, folders, and media. Restore anytime
            to recover your data.
          </p>
        </div>

        <div className='flex gap-3 pt-2'>
          <button
            onClick={handleExport}
            disabled={isExporting || isImporting}
            className='group relative px-8 py-3.5 bg-accent-primary text-text-primary rounded-xl font-bold text-[15px] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover active:scale-95 overflow-hidden'
          >
            <div className='absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity' />
            <HardDrive className='w-4 h-4' />
            Create Backup
          </button>
          <button
            onClick={handleImport}
            disabled={isExporting || isImporting}
            className='px-8 py-3.5 bg-white/[0.04] border border-white/[0.08] text-text-secondary rounded-xl font-bold text-[15px] hover:bg-white/[0.08] hover:text-text-primary transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
          >
            <Upload className='w-4 h-4' />
            Restore Data
          </button>
        </div>

        <input
          ref={fileInputRef}
          type='file'
          accept='.pnbk'
          className='hidden'
          onChange={handleFileSelected}
        />
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='bg-bg-panel-secondary/30 border border-border-primary rounded-2xl p-5 flex items-center gap-4'>
          <div className='w-11 h-11 bg-accent-primary/10 rounded-xl flex items-center justify-center ring-1 ring-accent-primary/20'>
            <Database className='w-5 h-5 text-accent-primary' />
          </div>
          <div>
            <p className='text-[10px] uppercase tracking-widest font-bold text-text-tertiary mb-1'>
              Notes Size
            </p>
            <p className='text-text-primary font-bold text-base'>{formatBytes(totalSize)}</p>
          </div>
        </div>

        <div className='bg-bg-panel-secondary/30 border border-border-primary rounded-2xl p-5 flex items-center gap-4'>
          <div className='w-11 h-11 bg-accent-primary/10 rounded-xl flex items-center justify-center ring-1 ring-accent-primary/20'>
            <Lock className='w-5 h-5 text-accent-primary' />
          </div>
          <div>
            <p className='text-[10px] uppercase tracking-widest font-bold text-text-tertiary mb-1'>
              Encryption
            </p>
            <p className='text-text-primary font-bold text-base'>AES-256</p>
          </div>
        </div>
      </div>

      {lastBackup && (
        <div className='bg-accent-primary/5 border border-accent-primary/10 rounded-xl p-4 flex gap-4 items-center'>
          <Shield className='w-5 h-5 text-accent-primary shrink-0' />
          <p className='text-xs text-text-tertiary leading-relaxed'>
            Last backup:{' '}
            <span className='text-text-primary font-semibold'>{formatLastBackup(lastBackup)}</span>
          </p>
        </div>
      )}

      {showModal && (
        <div className='fixed inset-0 z-[2000] flex items-center justify-center p-6'>
          <div className='absolute inset-0 bg-black/60 backdrop-blur-3xl animate-in fade-in duration-300' />

          <div className='relative bg-bg-panel/80 backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] p-10 max-w-sm w-full animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)]'>
            <div
              className={`absolute -top-24 -left-24 w-48 h-48 blur-[80px] rounded-full ${isError ? 'bg-accent-danger/20' : 'bg-accent-primary/10'}`}
            />
            <div
              className={`absolute -bottom-24 -right-24 w-48 h-48 blur-[80px] rounded-full ${isError ? 'bg-accent-danger/10' : 'bg-accent-primary/5'}`}
            />

            <div className='relative z-10 flex flex-col items-center text-center space-y-6'>
              <div className='w-20 h-20 relative flex items-center justify-center'>
                {!isDone && !isError && (
                  <div className='absolute inset-0 rounded-full border-4 border-accent-primary/20 border-t-accent-primary animate-spin' />
                )}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isError ? 'bg-accent-danger/15 ring-1 ring-accent-danger/30' : 'bg-accent-primary/10 ring-1 ring-accent-primary/20'}`}
                >
                  <CloudDownload
                    className={`w-7 h-7 ${isError ? 'text-accent-danger' : 'text-accent-primary'}`}
                  />
                </div>
              </div>

              <div className='space-y-2 w-full'>
                <h3 className='text-xl font-bold text-text-primary tracking-tight'>
                  {isError
                    ? 'Something went wrong'
                    : isDone
                    ? 'All done!'
                    : isExporting
                    ? 'Creating Backup...'
                    : 'Restoring Data...'}
                </h3>
                {progressMessage ? (
                  <p className='text-text-tertiary text-sm leading-relaxed'>{progressMessage}</p>
                ) : null}
              </div>

              {!isDone && !isError && (
                <div className='w-full space-y-2'>
                  <div className='flex justify-between text-[11px] text-text-tertiary font-medium'>
                    <span>{progressStep.replace(/_/g, ' ')}</span>
                    <span>{Math.round(progressValue)}%</span>
                  </div>
                  <div className='w-full h-2 bg-white/[0.06] rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-accent-primary rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(var(--accent-primary-rgb),0.5)]'
                      style={{ width: `${progressValue}%` }}
                    />
                  </div>
                </div>
              )}

              <div className='flex gap-3 w-full pt-2'>
                {isDone || isError ? (
                  <button
                    onClick={handleDismiss}
                    className='flex-1 py-4 bg-accent-primary text-text-primary rounded-xl font-bold text-[15px] shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover transition-all active:scale-95'
                  >
                    Dismiss
                  </button>
                ) : (
                  <button
                    onClick={handleCancel}
                    className='flex-1 py-4 bg-white/[0.03] border border-white/[0.05] text-text-tertiary rounded-xl font-bold text-sm hover:bg-white/[0.08] transition-all active:scale-95'
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
