import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Database, History, Import, Lock, Share, Shield } from 'lucide-react'

import {
  getExportStatus,
  getImportStatus,
  resetExport,
  resetImport,
  setImportStatus,
  startExportBackup,
  startImportBackup
} from '@pear-notes/core/store/slices/backupSlice.js'
import {
  getTotalStorageSize,
  subscribeStorageInfo,
  unsubscribeStorageInfo
} from '@pear-notes/core/store/slices/storageSlice.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import { getBackupErrorMessage } from '../../utils/backupErrors'
import BackupPasswordModal from '../modals/BackupPasswordModal'

const LAST_BACKUP_KEY = 'pear_notes_last_backup'

export default function BackupSettings() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const exportStatus = useSelector(getExportStatus)
  const importStatus = useSelector(getImportStatus)
  const totalSize = useSelector(getTotalStorageSize) ?? 0

  const [lastBackup, setLastBackup] = useState(() => {
    const stored = localStorage.getItem(LAST_BACKUP_KEY)
    return stored ? new Date(stored) : null
  })
  const [modalState, setModalState] = useState({
    visible: false,
    done: false,
    doneType: null,
    error: false,
    errorMessage: ''
  })
  useEffect(() => {
    dispatch(subscribeStorageInfo())
    return () => {
      dispatch(unsubscribeStorageInfo())
    }
  }, [dispatch])

  const [showExportPasswordModal, setShowExportPasswordModal] = useState(false)
  const [showRestorePasswordModal, setShowRestorePasswordModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    if (exportStatus.step === 'idle') return
    if (exportStatus.step === 'error') {
      setTimeout(() => {
        setModalState({
          visible: true,
          done: false,
          doneType: null,
          error: true,
          errorMessage: exportStatus.message
        })
      }, 0)
      return
    }
    if (exportStatus.step === 'done') {
      const now = new Date()
      localStorage.setItem(LAST_BACKUP_KEY, now.toISOString())
      setTimeout(() => setLastBackup(now), 0)

      setTimeout(() => {
        setModalState({
          visible: true,
          done: true,
          doneType: 'export',
          error: false,
          errorMessage: ''
        })
      }, 0)
      dispatch(resetExport())
      return
    }
    setTimeout(() => {
      setModalState((prev) => ({
        ...prev,
        visible: true,
        done: false,
        doneType: null,
        error: false
      }))
    }, 0)
  }, [exportStatus.step, exportStatus.message, dispatch])

  useEffect(() => {
    if (importStatus.step === 'idle') return
    if (importStatus.step === 'error') {
      setTimeout(() => {
        setModalState({
          visible: true,
          done: false,
          doneType: null,
          error: true,
          errorMessage: importStatus.message
        })
      }, 0)
      return
    }
    if (importStatus.step === 'done') {
      setTimeout(() => {
        setModalState({
          visible: true,
          done: true,
          doneType: 'import',
          error: false,
          errorMessage: ''
        })
      }, 0)
      dispatch(resetImport())
      return
    }
    setTimeout(() => {
      setModalState((prev) => ({
        ...prev,
        visible: true,
        done: false,
        doneType: null,
        error: false
      }))
    }, 0)
  }, [importStatus.step, importStatus.message, dispatch])

  const isExporting =
    exportStatus.step !== 'idle' && exportStatus.step !== 'done' && exportStatus.step !== 'error'
  const isImporting =
    importStatus.step !== 'idle' && importStatus.step !== 'done' && importStatus.step !== 'error'
  const showModal = modalState.visible
  const isDone = modalState.done
  const isError = modalState.error
  const activeProgressStatus = isExporting ? exportStatus : importStatus

  const handleExport = () => {
    setShowExportPasswordModal(true)
  }

  const handleConfirmExport = async (password) => {
    setShowExportPasswordModal(false)
    const date = new Date().toISOString().split('T')[0]
    const defaultPath = `pear-notes-backup-${date}.pnbk`

    try {
      const result = await window.electronBridge.showSaveDialog({
        defaultPath,
        filters: [{ name: 'Pear Notes Backup', extensions: ['pnbk', 'pearnotes'] }]
      })

      if (result.canceled || !result.filePath) {
        return
      }

      setModalState({
        visible: true,
        done: false,
        doneType: 'export',
        error: false,
        errorMessage: ''
      })
      dispatch(resetExport())
      dispatch(startExportBackup({ password, filePath: result.filePath }))
    } catch (err) {
      console.error(err)
      setModalState({
        visible: true,
        done: false,
        doneType: null,
        error: true,
        errorMessage: String(err)
      })
    }
  }

  const handleImport = async () => {
    try {
      const result = await window.electronBridge.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Pear Notes Backup', extensions: ['pnbk', 'pearnotes'] }]
      })

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return
      }

      const filePath = result.filePaths[0]
      const name = filePath.split(/[/\\]/).pop() || ''

      setSelectedFile({ name, filePath })
      setShowRestorePasswordModal(true)
    } catch (err) {
      console.error(err)
    }
  }

  const handleConfirmRestore = async (password) => {
    if (!selectedFile) return
    const file = selectedFile
    setShowRestorePasswordModal(false)
    setSelectedFile(null)

    setModalState({
      visible: true,
      done: false,
      doneType: 'import',
      error: false,
      errorMessage: ''
    })
    dispatch(setImportStatus({ step: 'reading', progress: 5, message: t('backup.readingBackup') }))

    dispatch(resetImport())
    dispatch(startImportBackup({ filePath: file.filePath, password }))
  }

  const handleCancelExportPassword = () => {
    setShowExportPasswordModal(false)
  }

  const handleCancelRestorePassword = () => {
    setShowRestorePasswordModal(false)
    setSelectedFile(null)
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
          <History className='w-10 h-10 text-accent-primary' />
        </div>

        <div className='space-y-2'>
          <h3 className='text-text-primary font-bold text-xl'>{t('backup.hero.title')}</h3>
          <p className='text-text-tertiary text-sm max-w-sm leading-relaxed'>
            {t('backup.hero.description')}
          </p>
        </div>

        <div className='flex gap-3 pt-2'>
          <button
            onClick={handleExport}
            disabled={isExporting || isImporting}
            className='group relative px-8 py-3.5 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-base transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover active:scale-95 overflow-hidden'
          >
            <div className='absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity' />
            <Share className='w-4 h-4' />
            {t('backup.createBackup')}
          </button>
          <button
            onClick={handleImport}
            disabled={isExporting || isImporting}
            className='px-8 py-3.5 bg-overlay-light border border-overlay-medium text-text-secondary rounded-xl font-bold text-base hover:bg-overlay-medium hover:text-text-primary transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
          >
            <Import className='w-4 h-4' />
            {t('backup.restoreData')}
          </button>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='bg-bg-secondary border border-border-primary rounded-2xl p-5 flex items-center gap-4'>
          <div className='w-11 h-11 bg-accent-primary/10 rounded-xl flex items-center justify-center ring-1 ring-accent-primary/20 shrink-0'>
            <Shield className='w-5 h-5 text-accent-primary' />
          </div>
          <div className='min-w-0'>
            <p className='text-xs tracking-widest font-bold text-text-tertiary mb-1'>
              {t('backup.lastBackup')}
            </p>
            <p className='text-text-primary font-bold text-base truncate'>
              {lastBackup ? formatLastBackup(lastBackup) : t('backup.noBackup')}
            </p>
          </div>
        </div>

        <div className='bg-bg-secondary border border-border-primary rounded-2xl p-5 flex items-center gap-4'>
          <div className='w-11 h-11 bg-accent-primary/10 rounded-xl flex items-center justify-center ring-1 ring-accent-primary/20 shrink-0'>
            <Database className='w-5 h-5 text-accent-primary' />
          </div>
          <div className='min-w-0'>
            <p className='text-xs tracking-widest font-bold text-text-tertiary mb-1'>
              {t('backup.notesSize')}
            </p>
            <p className='text-text-primary font-bold text-base truncate'>
              {formatBytes(totalSize)}
            </p>
          </div>
        </div>
      </div>

      <div className='bg-bg-panel-secondary/40 border border-border-primary rounded-2xl p-6 space-y-3 relative overflow-hidden hover:border-border-secondary transition-colors'>
        <div className='flex items-center gap-3'>
          <Lock className='w-5 h-5 text-accent-primary' />
          <h4 className='text-text-primary font-bold text-base'>{t('backup.protectedTitle')}</h4>
        </div>
        <p className='text-text-tertiary text-xs leading-relaxed'>{t('backup.protectedDesc')}</p>
      </div>

      <BackupPasswordModal
        open={showExportPasswordModal}
        mode='create'
        onSubmit={handleConfirmExport}
        onCancel={handleCancelExportPassword}
      />

      <BackupPasswordModal
        open={showRestorePasswordModal}
        mode='enter'
        onSubmit={handleConfirmRestore}
        onCancel={handleCancelRestorePassword}
      />

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
                  <History
                    className={`w-7 h-7 ${isError ? 'text-accent-danger' : 'text-accent-primary'}`}
                  />
                </div>
              </div>

              <div className='space-y-2 w-full'>
                <h3 className='text-xl font-bold text-text-primary tracking-tight'>
                  {isError
                    ? t('backup.progress.errorTitle')
                    : isDone
                      ? modalState.doneType === 'export'
                        ? t('backup.progress.completeTitle')
                        : t('backup.progress.restoredTitle')
                      : modalState.doneType === 'export' || isExporting
                        ? t('backup.progress.creatingTitle')
                        : t('backup.progress.restoringTitle')}
                </h3>
                {(isError ? modalState.errorMessage : progressMessage) ? (
                  <p className='text-text-tertiary text-sm leading-relaxed'>
                    {isError ? getBackupErrorMessage(modalState.errorMessage) : progressMessage}
                  </p>
                ) : null}
              </div>

              {!isDone && !isError && (
                <div className='w-full space-y-2'>
                  <div className='flex justify-between text-xs text-text-tertiary font-medium'>
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
                    className='flex-1 py-4 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-base shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover transition-all active:scale-95'
                  >
                    {t('backup.progress.dismiss')}
                  </button>
                ) : (
                  <button
                    onClick={handleCancel}
                    className='flex-1 py-4 bg-overlay-subtle border border-overlay-soft text-text-tertiary rounded-xl font-bold text-sm hover:bg-overlay-medium transition-all active:scale-95'
                  >
                    {t('backup.progress.cancel')}
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
