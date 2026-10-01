import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'

import {
  DEVICE_STORAGE_ACTION,
  DEVICE_STORAGE_ROWS,
  getVisibleDeviceStorageRows
} from '@pear-notes/core/store/services/deviceStorage.js'
import { formatBytes } from '@pear-notes/core/utils.js'

const ROW_CLASS =
  'w-full px-6 py-5 flex items-center justify-between gap-4 border-t border-border-primary/50 text-left'
const BUTTON_CLASS =
  'px-3 py-1.5 rounded-xl bg-accent-primary/10 text-accent-primary text-sm font-semibold hover:bg-accent-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

function RowLabel({ row }) {
  const { t } = useTranslation()
  return (
    <div className='flex flex-col min-w-0'>
      <span className='text-base font-semibold text-text-tertiary'>{t(row.label)}</span>
      <span className='text-sm text-text-tertiary/70'>{t(row.desc)}</span>
    </div>
  )
}

export default function DeviceStorageSection({
  summary,
  showAiModels,
  isClearingCache,
  isDeletingOldVaults,
  onClearCache,
  onDeleteOldVaults,
  onOpenAiModels
}) {
  const { t } = useTranslation()

  const buttons = {
    [DEVICE_STORAGE_ACTION.CLEAR_CACHE]: {
      onClick: onClearCache,
      busy: isClearingCache,
      label: isClearingCache ? t('storage.clearingCache') : t('storage.clearCache')
    },
    [DEVICE_STORAGE_ACTION.DELETE_OLD_VAULTS]: {
      onClick: onDeleteOldVaults,
      busy: isDeletingOldVaults,
      label: isDeletingOldVaults
        ? t('storage.device.deletingOldVaults')
        : t('storage.device.deleteOldVaults')
    }
  }

  const renderRow = (category) => {
    const row = DEVICE_STORAGE_ROWS[category]
    const value = formatBytes(summary?.byCategory[category] ?? 0)

    if (row.action === DEVICE_STORAGE_ACTION.OPEN_AI_MODELS) {
      return (
        <button
          key={category}
          onClick={onOpenAiModels}
          className={`${ROW_CLASS} hover:bg-overlay-subtle transition-colors`}
        >
          <RowLabel row={row} />
          <div className='flex items-center gap-2 flex-shrink-0'>
            <span className='text-base font-bold text-text-secondary'>{value}</span>
            <ChevronRight className='w-4 h-4 text-text-tertiary' />
          </div>
        </button>
      )
    }

    const button = row.action ? buttons[row.action] : null
    return (
      <div key={category} className={ROW_CLASS}>
        <RowLabel row={row} />
        <div className='flex items-center gap-3 flex-shrink-0'>
          <span className='text-base font-bold text-text-secondary'>{value}</span>
          {button && (
            <button onClick={button.onClick} disabled={button.busy} className={BUTTON_CLASS}>
              {button.label}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-1'>
      <h3 className='text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'>
        {t('storage.device.title')}
      </h3>
      <div className='bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden'>
        <div className='px-6 py-5 flex items-center justify-between gap-4'>
          <div className='flex flex-col'>
            <span className='text-base font-semibold text-text-primary'>
              {t('storage.device.total')}
            </span>
            <span className='text-sm text-text-tertiary/70'>{t('storage.device.totalDesc')}</span>
          </div>
          <span className='text-title font-black text-text-primary tracking-tight'>
            {summary ? formatBytes(summary.total) : t('storage.device.measuring')}
          </span>
        </div>
        {getVisibleDeviceStorageRows(summary, showAiModels).map(renderRow)}
      </div>
    </div>
  )
}
