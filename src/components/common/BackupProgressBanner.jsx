import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { AlertCircle, CheckCircle2, Import, Loader2, Share } from 'lucide-react'

import { getExportStatus, getImportStatus } from '@pear-notes/core/store/slices/backupSlice.js'

export default function BackupProgressBanner() {
  const { t } = useTranslation()
  const exportStatus = useSelector(getExportStatus)
  const importStatus = useSelector(getImportStatus)

  const isExporting = exportStatus.step !== 'idle'
  const isImporting = importStatus.step !== 'idle'
  const isActive = isExporting || isImporting

  useEffect(() => {
    window.electronBridge?.setPowerSaveBlocker?.(isActive)
  }, [isActive])

  useEffect(() => {
    return () => window.electronBridge?.setPowerSaveBlocker?.(false)
  }, [])

  if (!isExporting && !isImporting) return null

  const status = isExporting ? exportStatus : importStatus
  const isExport = isExporting

  const isDone = status.step === 'done'
  const isError = status.step === 'error'
  const progressValue = status.progress || 0
  const progressMessage = status.message || ''

  return (
    <div className='fixed bottom-6 right-6 w-80 bg-bg-secondary border border-border-primary rounded-xl shadow-2xl p-4 flex flex-col gap-3 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300'>
      <div className='flex items-center gap-3'>
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isError
              ? 'bg-red-500/10 text-red-500'
              : isDone
                ? 'bg-green-500/10 text-green-500'
                : 'bg-accent-primary/10 text-accent-primary'
          }`}
        >
          {isError ? (
            <AlertCircle className='w-5 h-5' />
          ) : isDone ? (
            <CheckCircle2 className='w-5 h-5' />
          ) : isExport ? (
            <Share className='w-5 h-5' />
          ) : (
            <Import className='w-5 h-5' />
          )}
        </div>

        <div className='flex-1 min-w-0'>
          <h4 className='text-text-primary font-semibold text-sm truncate'>
            {isError
              ? t('common.error')
              : isDone
                ? isExport
                  ? t('backup.progress.completeTitle')
                  : t('backup.restoreComplete')
                : isExport
                  ? t('backup.progress.backingUp')
                  : t('backup.progress.restoring')}
          </h4>
          <p className='text-text-tertiary text-xs truncate'>
            {isError ? status.message : progressMessage}
          </p>
        </div>

        {!isDone && !isError && <Loader2 className='w-4 h-4 text-accent-primary animate-spin' />}
      </div>

      {!isError && (
        <div className='w-full h-1.5 bg-bg-primary rounded-full overflow-hidden'>
          <div
            className={`h-full transition-all duration-300 ${isDone ? 'bg-green-500' : 'bg-accent-primary'}`}
            style={{ width: `${progressValue}%` }}
          />
        </div>
      )}
    </div>
  )
}
