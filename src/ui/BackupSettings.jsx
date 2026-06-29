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
import { CloudDownload, Database, HardDrive, Lock, Shield, Upload, Eye, EyeOff, Key } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getDbEncryptionKey } from '../utils.js'
import { formatBytes } from '../utils/formatters'

const LAST_BACKUP_KEY = 'pear_notes_last_backup'

function toUint8Array(data) {
  if (data instanceof Uint8Array) return data
  return new Uint8Array(Object.values(data))
}

export default function BackupSettings() {
  const dispatch = useDispatch()
  const exportStatus = useSelector(getExportStatus)
  const importStatus = useSelector(getImportStatus)
  const exportBuffer = useSelector(getExportBuffer)
  const totalSize = useSelector(getTotalStorageSize) ?? 0

  const fileInputRef = useRef(null)
  const [lastBackup, setLastBackup] = useState(() => {
    const stored = localStorage.getItem(LAST_BACKUP_KEY)
    return stored ? new Date(stored) : null
  })
  const [modalState, setModalState] = useState({ visible: false, done: false, doneType: null, error: false, errorMessage: '' })
  const [deviceRecoveryKey] = useState(() => getDbEncryptionKey())
  const [isKeyVisible, setIsKeyVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [enteredKey, setEnteredKey] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)

  const handleCopyRecoveryKey = async () => {
    if (deviceRecoveryKey) {
      await navigator.clipboard.writeText(deviceRecoveryKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  useEffect(() => {
    if (exportStatus.step === 'idle') return
    if (exportStatus.step === 'error') {
      setTimeout(() => {
        setModalState({ visible: true, done: false, doneType: null, error: true, errorMessage: exportStatus.message })
      }, 0)
      return
    }
    if (exportStatus.step === 'done' && exportBuffer) {
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
        setTimeout(() => setLastBackup(now), 0)
      } catch (err) {
        console.error(err)
      }

      setTimeout(() => {
        setModalState({ visible: true, done: true, doneType: 'export', error: false, errorMessage: '' })
      }, 0)
      dispatch(resetExport())
      return
    }
    setTimeout(() => {
      setModalState((prev) => ({ ...prev, visible: true, done: false, doneType: null, error: false }))
    }, 0)
  }, [exportStatus.step, exportStatus.message, exportBuffer, dispatch])

  useEffect(() => {
    if (importStatus.step === 'idle') return
    if (importStatus.step === 'error') {
      setTimeout(() => {
        setModalState({ visible: true, done: false, doneType: null, error: true, errorMessage: importStatus.message })
      }, 0)
      return
    }
    if (importStatus.step === 'done') {
      setTimeout(() => {
        setModalState({ visible: true, done: true, doneType: 'import', error: false, errorMessage: '' })
      }, 0)
      dispatch(resetImport())
      return
    }
    setTimeout(() => {
      setModalState((prev) => ({ ...prev, visible: true, done: false, doneType: null, error: false }))
    }, 0)
  }, [importStatus.step, importStatus.message, dispatch])

  const isExporting = exportStatus.step !== 'idle' && exportStatus.step !== 'done' && exportStatus.step !== 'error'
  const isImporting = importStatus.step !== 'idle' && importStatus.step !== 'done' && importStatus.step !== 'error'
  const showModal = modalState.visible
  const isDone = modalState.done
  const isError = modalState.error
  const activeProgressStatus = isExporting ? exportStatus : importStatus

  const handleExport = () => {
    const confirmed = window.confirm(
      "Backup Recovery Key\n\nPlease make sure you have copied your Recovery Key securely. You will need it to restore this backup on other devices.\n\nContinue to create backup?"
    )
    if (!confirmed) return

    setModalState({ visible: true, done: false, doneType: 'export', error: false, errorMessage: '' })
    dispatch(resetExport())
    dispatch(startExportBackup())
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!file.name.endsWith('.pnbk') && !file.name.endsWith('.pearnotes')) {
      alert('Please select a valid backup file (.pnbk or .pearnotes)')
      return
    }

    setSelectedFile(file)
    setEnteredKey('')
    setShowPromptModal(true)
  }

  const handleConfirmRestore = async () => {
    if (!selectedFile || enteredKey.trim().length !== 64) return
    const key = enteredKey.trim()
    const file = selectedFile
    setShowPromptModal(false)
    setSelectedFile(null)

    const buffer = await file.arrayBuffer()
    setModalState({ visible: true, done: false, doneType: 'import', error: false, errorMessage: '' })
    dispatch(resetImport())
    dispatch(startImportBackup({ buffer: new Uint8Array(buffer), recoveryKey: key }))
  }


  const handleDismiss = () => {
    if (modalState.doneType === 'import') {
      location.reload()
      return
    }
    if (modalState.error) {
      dispatch(resetExport())
      dispatch(resetImport())
    }
    setModalState({ visible: false, done: false, doneType: null, error: false, errorMessage: '' })
  }

  const handleCancel = () => {
    dispatch(resetExport())
    dispatch(resetImport())
    setModalState({ visible: false, done: false, doneType: null, error: false, errorMessage: '' })
  }

  const progressValue = activeProgressStatus?.progress ?? 0
  const progressMessage = activeProgressStatus?.message ?? ''
  const progressStep = activeProgressStatus?.step ?? ''

  const formatLastBackup = (date) =>
    date?.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className='max-w-2xl mx-auto px-6 py-4 space-y-6'>
      <div className='relative bg-bg-secondary border border-border-primary rounded-2xl p-10 flex flex-col items-center text-center space-y-5 overflow-hidden hover:border-border-secondary transition-colors'>
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
            className='px-8 py-3.5 bg-overlay-light border border-overlay-medium text-text-secondary rounded-xl font-bold text-[15px] hover:bg-overlay-medium hover:text-text-primary transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
          >
            <Upload className='w-4 h-4' />
            Restore Data
          </button>
        </div>

        <input
          ref={fileInputRef}
          type='file'
          accept='.pnbk,.pearnotes'
          className='hidden'
          onChange={handleFileSelected}
        />
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='bg-bg-secondary border border-border-primary rounded-2xl p-5 flex items-center gap-4'>
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

        <div className='bg-bg-secondary border border-border-primary rounded-2xl p-5 flex items-center gap-4'>
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

      <div className='bg-bg-panel-secondary/40 border border-border-primary rounded-2xl p-6 space-y-4 relative overflow-hidden hover:border-border-secondary transition-colors'>
        <div className='flex items-center gap-3'>
          <Key className='w-5 h-5 text-accent-primary' />
          <h4 className='text-text-primary font-bold text-[15px]'>Recovery Key</h4>
        </div>
        <p className='text-text-tertiary text-xs leading-relaxed'>
          Save this key securely. You will need it to restore this backup on a new device.
        </p>
        <div className='flex items-center bg-overlay-faint border border-overlay-medium rounded-xl p-1 h-12 pl-4'>
          <p className='flex-1 text-sm font-mono text-text-secondary select-all truncate mr-2'>
            {isKeyVisible ? deviceRecoveryKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
          </p>
          <button
            onClick={() => setIsKeyVisible(!isKeyVisible)}
            className='w-10 h-10 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors'
          >
            {isKeyVisible ? <EyeOff className='w-4.5 h-4.5' /> : <Eye className='w-4.5 h-4.5' />}
          </button>
          <button
            onClick={handleCopyRecoveryKey}
            className='h-10 px-4 bg-accent-primary text-text-primary rounded-lg font-bold text-xs hover:bg-accent-primary-hover active:scale-95 transition-all'
          >
            {copied ? 'Copied!' : 'Copy Key'}
          </button>
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

      {showPromptModal && (
        <div className='fixed inset-0 z-[2000] flex items-center justify-center p-6'>
          <div className='absolute inset-0 bg-backdrop-medium backdrop-blur-3xl animate-in fade-in duration-300' onClick={() => {
            setShowPromptModal(false)
            setSelectedFile(null)
          }} />

          <div className='relative bg-bg-panel/95 backdrop-blur-3xl border border-border-primary rounded-[2rem] p-8 max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)]'>
            <div className='absolute -top-24 -left-24 w-48 h-48 bg-accent-primary/10 blur-[80px] rounded-full' />
            <div className='absolute -bottom-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-[80px] rounded-full' />

            <div className='relative z-10 flex flex-col space-y-6'>
              <div className='flex flex-col items-center text-center space-y-2'>
                <div className='w-14 h-14 rounded-2xl bg-accent-primary/10 flex items-center justify-center ring-1 ring-accent-primary/20 mb-2'>
                  <Key className='w-6 h-6 text-accent-primary' />
                </div>
                <h3 className='text-lg font-bold text-text-primary'>Enter Recovery Key</h3>
                <p className='text-text-tertiary text-xs leading-relaxed max-w-[280px]'>
                  Please enter the 64-character Recovery Key of the device that created this backup to decrypt your data.
                </p>
              </div>

              <div className='space-y-1.5'>
                <input
                  type='text'
                  value={enteredKey}
                  onChange={(e) => setEnteredKey(e.target.value)}
                  placeholder='Enter 64-character hex key'
                  className='w-full px-4 py-3 bg-overlay-faint border border-overlay-medium focus:border-accent-primary/30 rounded-xl text-sm font-mono text-text-primary placeholder:text-text-tertiary/40 outline-none transition-colors'
                  maxLength={64}
                />
                {enteredKey.trim() && enteredKey.trim().length !== 64 && (
                  <p className='text-[11px] text-accent-danger/80 ml-1'>
                    Must be exactly 64 characters (currently {enteredKey.trim().length})
                  </p>
                )}
              </div>

              <div className='flex gap-3 w-full pt-2'>
                <button
                  onClick={() => {
                    setShowPromptModal(false)
                    setSelectedFile(null)
                  }}
                  className='flex-1 py-3 bg-overlay-subtle border border-overlay-soft text-text-tertiary rounded-xl font-bold text-sm hover:bg-overlay-medium transition-all active:scale-95'
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRestore}
                  disabled={enteredKey.trim().length !== 64}
                  className='flex-1 py-3 bg-accent-primary text-text-primary rounded-xl font-bold text-sm shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed'
                >
                  Restore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className='fixed inset-0 z-[2000] flex items-center justify-center p-6'>
          <div className='absolute inset-0 bg-backdrop-medium backdrop-blur-3xl animate-in fade-in duration-300' />

          <div className='relative bg-bg-panel/95 backdrop-blur-3xl border border-border-primary rounded-[2rem] p-10 max-w-sm w-full animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)]'>
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
                    : modalState.doneType === 'export' || isExporting
                    ? 'Creating Backup...'
                    : 'Restoring Data...'}
                </h3>
                {(isError ? modalState.errorMessage : progressMessage) ? (
                  <p className='text-text-tertiary text-sm leading-relaxed'>{isError ? modalState.errorMessage : progressMessage}</p>
                ) : null}
              </div>

              {!isDone && !isError && (
                <div className='w-full space-y-2'>
                  <div className='flex justify-between text-[11px] text-text-tertiary font-medium'>
                    <span>{progressStep.replace(/_/g, ' ')}</span>
                    <span>{Math.round(progressValue)}%</span>
                  </div>
                  <div className='w-full h-2 bg-divider-light rounded-full overflow-hidden'>
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
                    className='flex-1 py-4 bg-overlay-subtle border border-overlay-soft text-text-tertiary rounded-xl font-bold text-sm hover:bg-overlay-medium transition-all active:scale-95'
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
