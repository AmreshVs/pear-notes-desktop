import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { ChevronRight, Trash2 } from 'lucide-react'

import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { getLocalAiLoaded, initLocalAi } from '@pear-notes/core/store/slices/localAiSlice.js'
import { getVaults } from '@pear-notes/core/store/slices/vaultsSlice.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import { useClearAllData } from '../../hooks/useClearAllData'
import { buildRemoveAllDetails } from '../../lib/removalDetails'
import { getDeviceStorageBreakdown, getVaultUsage } from '../../lib/storageBreakdown'
import { getVaultLabel } from '../../lib/vaultNames'

import ClearingOverlay from './ClearingOverlay'
import DangerConfirmModal from './DangerConfirmModal'

const TONE_CLASS = {
  openVault: 'bg-accent-primary',
  otherVault: 'bg-storage-other-vault',
  ai: 'bg-accent-success',
  app: 'bg-text-tertiary/40'
}

const SECTION_TITLE_CLASS = 'text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'
const CARD_CLASS = 'bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden'
const ROW_CLASS = 'w-full px-6 py-4 flex items-center gap-4 text-left'
const ROW_BORDER_CLASS = 'border-t border-border-primary/50'
const ROW_BUTTON_CLASS =
  'px-3 py-1.5 rounded-xl bg-accent-primary/10 text-accent-primary text-sm font-semibold hover:bg-accent-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

function Dot({ tone }) {
  return <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${TONE_CLASS[tone]}`} />
}

function StorageRow({ tone, label, value, bordered, onClick, action }) {
  const content = (
    <>
      {tone && <Dot tone={tone} />}
      <span className='flex-1 min-w-0 truncate text-base text-text-primary'>{label}</span>
      <span className='text-base text-text-secondary'>{value}</span>
      {action && (
        <button onClick={action.onClick} disabled={action.busy} className={ROW_BUTTON_CLASS}>
          {action.label}
        </button>
      )}
      {onClick && <ChevronRight className='w-4 h-4 text-text-tertiary flex-shrink-0' />}
    </>
  )
  const className = `${ROW_CLASS} ${bordered ? ROW_BORDER_CLASS : ''}`
  if (!onClick) return <div className={className}>{content}</div>
  return (
    <button onClick={onClick} className={`${className} hover:bg-overlay-subtle transition-colors`}>
      {content}
    </button>
  )
}

export default function DeviceStorageSettings({ onOpenOnDeviceAi, onOpenVaultStorage }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const vaults = useSelector(getVaults)
  const localAiLoaded = useSelector(getLocalAiLoaded)
  const { isClearing, clearAll } = useClearAllData()

  const [summary, setSummary] = useState(null)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [isDeletingOldVaults, setIsDeletingOldVaults] = useState(false)
  const [confirmOldVaults, setConfirmOldVaults] = useState(false)
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false)

  useEffect(() => {
    if (LOCAL_AI_ENABLED && !localAiLoaded) dispatch(initLocalAi())
  }, [dispatch, localAiLoaded])

  const refresh = useCallback(async () => {
    const next = await window.electronBridge?.getDeviceStorage?.().catch(() => null)
    if (next) setSummary(next)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const vaultUsage = useMemo(() => getVaultUsage(vaults, summary?.vaults), [summary, vaults])
  const breakdown = useMemo(
    () => getDeviceStorageBreakdown(summary, vaultUsage, LOCAL_AI_ENABLED),
    [summary, vaultUsage]
  )
  const removeAllDetails = useMemo(
    () =>
      buildRemoveAllDetails(t, {
        vaultNames: vaultUsage.map((vault) => getVaultLabel(vault, t)),
        vaultBytes: vaultUsage.reduce((sum, vault) => sum + vault.bytes, 0),
        aiBytes: breakdown.aiBytes,
        showAi: breakdown.showAi,
        dataBytes: breakdown.dataBytes
      }),
    [breakdown, t, vaultUsage]
  )

  const handleClearCache = async () => {
    setIsClearingCache(true)
    try {
      await window.electronBridge?.clearCache?.()
      await refresh()
    } finally {
      setIsClearingCache(false)
    }
  }

  const handleConfirmDeleteOldVaults = async () => {
    setConfirmOldVaults(false)
    setIsDeletingOldVaults(true)
    try {
      await window.electronBridge?.deleteOldVaults?.()
      await refresh()
    } finally {
      setIsDeletingOldVaults(false)
    }
  }

  const handleConfirmRemoveAll = () => {
    setConfirmRemoveAll(false)
    clearAll()
  }

  const hasOldVaults = breakdown.oldVaultBytes > 0

  return (
    <div className='max-w-2xl mx-auto space-y-6'>
      <div className={`${CARD_CLASS} px-6 py-5 space-y-2`}>
        <p className='text-sm text-text-tertiary'>{t('storage.device.onThisComputer')}</p>
        <p className='text-title font-black text-text-primary tracking-tight'>
          {summary ? formatBytes(summary.total) : t('storage.device.measuring')}
        </p>
        {summary && (
          <div className='flex h-2.5 rounded-full overflow-hidden mt-2'>
            {breakdown.segments.map((segment) => (
              <span
                key={segment.key}
                className={TONE_CLASS[segment.tone]}
                style={{ flexGrow: segment.share, flexBasis: 0 }}
              />
            ))}
          </div>
        )}
      </div>

      {vaultUsage.length > 0 && (
        <div className='space-y-1'>
          <h3 className={SECTION_TITLE_CLASS}>{t('vaults.title')}</h3>
          <div className={CARD_CLASS}>
            {vaultUsage.map((vault, index) => (
              <StorageRow
                key={vault.id}
                tone={vault.current ? 'openVault' : 'otherVault'}
                label={
                  vault.current
                    ? `${getVaultLabel(vault, t)} · ${t('storage.device.openTag')}`
                    : getVaultLabel(vault, t)
                }
                value={formatBytes(vault.bytes)}
                bordered={index > 0}
                onClick={vault.current ? onOpenVaultStorage : undefined}
              />
            ))}
          </div>
        </div>
      )}

      <div className='space-y-1'>
        <h3 className={SECTION_TITLE_CLASS}>{t('storage.device.thisComputer')}</h3>
        <div className={CARD_CLASS}>
          {breakdown.showAi && (
            <StorageRow
              tone='ai'
              label={t('settings.onDeviceAi.storageRow')}
              value={formatBytes(breakdown.aiBytes)}
              onClick={onOpenOnDeviceAi}
            />
          )}
          <StorageRow
            tone='app'
            label={t('storage.device.app')}
            value={formatBytes(Math.max(0, breakdown.appBytes - breakdown.cacheBytes))}
            bordered={breakdown.showAi}
          />
          <StorageRow
            tone='app'
            label={t('storage.cache')}
            value={formatBytes(breakdown.cacheBytes)}
            bordered
            action={{
              label: isClearingCache ? t('storage.clearingCache') : t('storage.clearCache'),
              busy: isClearingCache,
              onClick: handleClearCache
            }}
          />
          {hasOldVaults && (
            <StorageRow
              label={t('storage.device.oldVaults')}
              value={formatBytes(breakdown.oldVaultBytes)}
              bordered
              action={{
                label: isDeletingOldVaults
                  ? t('storage.device.deletingOldVaults')
                  : t('storage.device.deleteOldVaults'),
                busy: isDeletingOldVaults,
                onClick: () => setConfirmOldVaults(true)
              }}
            />
          )}
          <button
            onClick={() => setConfirmRemoveAll(true)}
            className={`${ROW_CLASS} ${ROW_BORDER_CLASS} text-accent-danger hover:bg-accent-danger/5 transition-colors`}
          >
            <Trash2 className='w-4 h-4 flex-shrink-0' />
            <span className='flex-1 text-base font-semibold'>{removeAllDetails.button}</span>
          </button>
        </div>
      </div>

      {isClearing && <ClearingOverlay />}

      {confirmRemoveAll && (
        <DangerConfirmModal
          title={removeAllDetails.title}
          confirmLabel={removeAllDetails.confirmLabel}
          removed={removeAllDetails.removed}
          kept={removeAllDetails.kept}
          note={removeAllDetails.note}
          onConfirm={handleConfirmRemoveAll}
          onCancel={() => setConfirmRemoveAll(false)}
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
