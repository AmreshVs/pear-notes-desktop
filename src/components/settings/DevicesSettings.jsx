import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  Check,
  CircleMinus,
  Crown,
  Loader2,
  Monitor,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  TriangleAlert
} from 'lucide-react'

import { DEVICE_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'
import {
  canAddSyncLeader,
  canRemoveSyncLeader,
  clearIndexerError,
  deleteSyncedDevice,
  getIndexerError,
  getIndexerErrorDeviceKey,
  getIndexerPendingKey,
  getIndexerPendingStep,
  getSyncedDevices,
  getSyncLeaderPlan,
  setDeviceIndexer,
  updateSyncedDevice
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { getVaults } from '@pear-notes/core/store/slices/vaultsSlice.js'
import { getDeviceDisplayName, isRawDeviceKey } from '@pear-notes/core/utils.js'

import { getIndexerErrorKey, getIndexerStepKey } from '../../lib/indexerUtils'
import { syncLeaderLine } from '../../lib/syncLeaderLine'
import { getVaultLabel } from '../../lib/vaultNames'

import AddDevicePanel from './AddDevicePanel'

const DEVICE_KEY_TAIL_LENGTH = 5

const PLATFORM_NAMES = {
  darwin: 'macOS',
  win32: 'Windows',
  linux: 'Linux',
  android: 'Android',
  ios: 'iOS'
}

function getPlatformName(platform) {
  return PLATFORM_NAMES[platform] || platform
}

export default function DevicesSettings({ adding, onAdd }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const syncedDevices = useSelector(getSyncedDevices)
  const vaults = useSelector(getVaults)
  const leaderPlan = useSelector(getSyncLeaderPlan)
  const [leaderAction, setLeaderAction] = useState(null)
  const vaultName = getVaultLabel(
    vaults.find((vault) => vault.current),
    t
  )

  const otherDevices = syncedDevices.filter((d) => !d.isLocal)

  const openLeaderAction = (device, isIndexer) => {
    dispatch(clearIndexerError())
    setLeaderAction({ device, isIndexer })
  }

  const confirmLeaderAction = () => {
    const { device, isIndexer } = leaderAction
    setLeaderAction(null)
    dispatch(setDeviceIndexer({ key: device.key, localKey: device.localKey, isIndexer }))
  }

  if (adding) {
    return (
      <div className='max-w-2xl mx-auto px-6 py-4'>
        <AddDevicePanel name={vaultName} />
      </div>
    )
  }

  return (
    <div className='max-w-2xl mx-auto px-6 py-4 space-y-6'>
      <p className='text-sm text-text-tertiary leading-relaxed'>
        {t('sync.devices.screenDesc', { name: vaultName })}
      </p>

      <div className='space-y-6'>
        <div className='space-y-1'>
          <h4 className='text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'>
            {t('sync.devices.thisDevice')}
          </h4>
          <div className='grid gap-4'>
            {syncedDevices
              .filter((d) => d.isLocal)
              .map((device) => (
                <DeviceItem
                  key={device.key}
                  device={device}
                  vaultName={vaultName}
                  leaderPlan={leaderPlan}
                  onLeaderAction={openLeaderAction}
                />
              ))}
          </div>
        </div>

        <div className='space-y-1'>
          <h4 className='text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'>
            {t('sync.devices.otherDevices')}
          </h4>
          <div className='grid gap-4'>
            {otherDevices.map((device) => (
              <DeviceItem
                key={device.key}
                device={device}
                isOther
                vaultName={vaultName}
                leaderPlan={leaderPlan}
                onLeaderAction={openLeaderAction}
              />
            ))}
            <button
              type='button'
              onClick={onAdd}
              className='p-5 bg-bg-secondary border border-border-primary rounded-2xl flex items-center gap-5 text-left hover:bg-bg-tertiary/50 hover:border-border-secondary transition-colors active:scale-[0.99]'
            >
              <div className='w-14 h-14 bg-bg-panel/50 rounded-2xl flex items-center justify-center text-accent-primary border border-border-primary'>
                <Plus className='w-7 h-7' />
              </div>
              <span className='px-2 font-bold text-base text-accent-primary'>
                {t('sync.add.button')}
              </span>
            </button>
          </div>
          {otherDevices.length === 0 && (
            <p className='px-2 pt-2 text-xs text-text-tertiary'>{t('sync.devices.empty')}</p>
          )}

          <SyncLeadersPanel
            plan={leaderPlan}
            onSuggest={(device) => openLeaderAction(device, true)}
          />
        </div>

        <div className='pt-2'>
          <p className='text-center text-xs text-text-tertiary px-4'>
            <ShieldCheck className='w-3.5 h-3.5 text-accent-primary inline mr-1.5 opacity-60' />
            {t('sync.footer')}
          </p>
        </div>
      </div>

      {leaderAction && (
        <LeaderConfirmModal
          device={leaderAction.device}
          isIndexer={leaderAction.isIndexer}
          onCancel={() => setLeaderAction(null)}
          onConfirm={confirmLeaderAction}
        />
      )}
    </div>
  )
}

function DeviceItem({ device, isOther, vaultName, leaderPlan, onLeaderAction }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const Icon = device.deviceType === 'desktop' ? Monitor : Smartphone
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [editedTitle, setEditedTitle] = useState(device.title || '')

  const indexerPendingKey = useSelector(getIndexerPendingKey)
  const indexerPendingStep = useSelector(getIndexerPendingStep)
  const indexerError = useSelector(getIndexerError)
  const indexerErrorDeviceKey = useSelector(getIndexerErrorDeviceKey)
  const canAddLeader = canAddSyncLeader(device, leaderPlan)
  const canRemoveLeader = canRemoveSyncLeader(device, leaderPlan)
  const isTransferring = indexerPendingKey === device.key
  const indexerStepKey = getIndexerStepKey(indexerPendingStep)
  const indexerErrorKey =
    indexerErrorDeviceKey === device.key ? getIndexerErrorKey(indexerError) : ''

  const presenceLabelKey = !device.presenceKnown
    ? 'sync.devices.presenceUnknown'
    : device.isOnline
      ? 'sync.devices.online'
      : 'sync.devices.offline'

  const presenceDotColor = !device.presenceKnown
    ? 'bg-text-tertiary'
    : device.isOnline
      ? 'bg-accent-success'
      : 'bg-accent-danger'

  const hasCustomTitle = device.title && !isRawDeviceKey(device.title)
  const fullDeviceName = hasCustomTitle ? device.title : device.key || getDeviceDisplayName(device)
  const deviceNameTail = hasCustomTitle ? '' : fullDeviceName.slice(-DEVICE_KEY_TAIL_LENGTH)
  const deviceNameHead = deviceNameTail
    ? fullDeviceName.slice(0, -DEVICE_KEY_TAIL_LENGTH)
    : fullDeviceName

  const handleCloseDelete = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsConfirmingDelete(false)
      setIsExiting(false)
    }, 300)
  }

  const handleStartRename = () => {
    if (!isOther) {
      setIsEditing(true)
      setEditedTitle(device.title || '')
    }
  }

  const handleActionMouseDown = (e) => {
    if (isEditing) e.preventDefault()
  }

  const handleBlur = () => {
    if (editedTitle.trim() && editedTitle !== device.title) {
      dispatch(updateSyncedDevice({ key: device.key, title: editedTitle.trim() }))
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditedTitle(device.title || '')
    }
  }

  return (
    <>
      <div className='group relative p-5 bg-bg-secondary border border-border-primary rounded-2xl flex items-center gap-5 hover:bg-bg-tertiary/50 hover:border-border-secondary transition-colors hardware-accelerated overflow-hidden'>
        <div className='w-14 h-14 bg-bg-panel/50 rounded-2xl flex items-center justify-center text-accent-primary border border-border-primary shadow-inner relative'>
          <Icon className='w-7 h-7' />
          <div
            role='img'
            aria-label={t(presenceLabelKey)}
            title={t(presenceLabelKey)}
            className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-bg-panel-secondary rounded-full shadow-sm ${presenceDotColor}`}
          />
        </div>

        <div className='flex-1 min-w-0'>
          {isEditing ? (
            <input
              type='text'
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              maxLength={DEVICE_NAME_MAX_LENGTH}
              autoFocus
              aria-label={t('sync.devices.rename')}
              className='block w-full h-9 px-2 font-bold text-text-primary text-base leading-9 bg-bg-panel border border-accent-primary rounded-md outline-none'
            />
          ) : (
            <span
              className='flex w-full h-9 px-2 items-center font-bold text-text-primary text-base leading-9 border border-transparent rounded-md cursor-pointer'
              onDoubleClick={handleStartRename}
              title={
                device.isLocal
                  ? t('folders.doubleClickToRename')
                  : device.key || getDeviceDisplayName(device)
              }
            >
              <span className='truncate min-w-0'>{deviceNameHead}</span>
              {deviceNameTail && <span className='shrink-0'>{deviceNameTail}</span>}
              {device.isIndexer && (
                <span className='ml-2.5 shrink-0 self-center inline-flex items-center gap-1 h-5 px-2 rounded-full bg-accent-primary/15 text-accent-primary text-[11px] leading-none font-semibold whitespace-nowrap'>
                  <Crown className='w-3 h-3 shrink-0' />
                  {t('sync.devices.indexerBadge')}
                </span>
              )}
            </span>
          )}
          <p className='px-2 text-xs text-text-tertiary font-bold tracking-tight truncate'>
            {t(
              `sync.platforms.${getPlatformName(device.platform)}`,
              getPlatformName(device.platform)
            )}
          </p>
          {!!indexerErrorKey && (
            <p className='px-2 mt-1 text-xs text-accent-danger'>{t(indexerErrorKey)}</p>
          )}
        </div>

        {isTransferring && (
          <span className='flex items-center gap-2 text-xs text-text-tertiary font-bold pr-2 shrink-0'>
            <Loader2 className='w-3.5 h-3.5 animate-spin' />
            {t(indexerStepKey)}
          </span>
        )}

        {canAddLeader && !isTransferring && (
          <button
            onClick={() => onLeaderAction(device, true)}
            aria-label={t('sync.devices.makeIndexer')}
            title={t('sync.devices.makeIndexer')}
            className='opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-2 hover:bg-accent-primary/10 rounded-lg text-accent-primary transition-all flex items-center gap-2'
          >
            <Crown className='w-4 h-4' />
          </button>
        )}

        {canRemoveLeader && !isTransferring && (
          <button
            onClick={() => onLeaderAction(device, false)}
            aria-label={t('sync.devices.removeIndexer')}
            title={t('sync.devices.removeIndexer')}
            className='opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-2 hover:bg-accent-primary/10 rounded-lg text-accent-primary transition-all flex items-center gap-2'
          >
            <CircleMinus className='w-4 h-4' />
          </button>
        )}

        {device.isLocal && (
          <button
            onClick={isEditing ? handleBlur : handleStartRename}
            onMouseDown={handleActionMouseDown}
            aria-label={isEditing ? t('sync.devices.confirmRename') : t('sync.devices.rename')}
            title={isEditing ? t('sync.devices.confirmRename') : t('sync.devices.rename')}
            className={`p-2 rounded-lg text-accent-primary hover:bg-accent-primary/10 transition-all flex items-center gap-2 ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}`}
          >
            {isEditing ? <Check className='w-4 h-4' /> : <Pencil className='w-4 h-4' />}
          </button>
        )}

        {isOther && !device.isIndexer && (
          <button
            onClick={() => setIsConfirmingDelete(true)}
            aria-label={t('sync.devices.removeDevice', { name: getDeviceDisplayName(device) })}
            title={t('sync.delete.menu', { name: vaultName })}
            className='opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-2 hover:bg-accent-danger/10 rounded-lg text-accent-danger transition-all flex items-center gap-2'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        )}
      </div>

      {isConfirmingDelete && (
        <div className='fixed inset-0 z-[2000] flex items-center justify-center p-6 sm:p-0'>
          <div
            className={`absolute inset-0 bg-backdrop-medium backdrop-blur-3xl animate-in ${isExiting ? 'animate-out fade-out' : 'fade-in'} duration-300`}
            onClick={handleCloseDelete}
          />

          <div
            className={`relative bg-bg-panel/95 backdrop-blur-3xl border border-border-primary rounded-[2rem] p-10 max-w-sm w-full animate-in ${isExiting ? 'animate-out zoom-out-95 slide-out-to-bottom-8' : 'zoom-in-95 slide-in-from-bottom-8'} duration-300 ease-out overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)]`}
          >
            <div className='absolute -top-24 -left-24 w-48 h-48 bg-accent-danger/20 blur-[80px] rounded-full' />
            <div className='absolute -bottom-24 -right-24 w-48 h-48 bg-accent-danger/10 blur-[80px] rounded-full' />

            <div className='relative z-10 flex flex-col items-center text-center space-y-6'>
              <div className='w-20 h-20 bg-accent-danger/15 rounded-3xl flex items-center justify-center ring-1 ring-accent-danger/30 mb-2 shadow-[0_0_30px_rgba(var(--accent-danger-rgb),0.2)]'>
                <ShieldAlert className='w-10 h-10 text-accent-danger' />
              </div>

              <div className='space-y-2'>
                <h3 className='text-2xl font-bold text-text-primary tracking-tight'>
                  {t('sync.delete.title', { name: vaultName })}
                </h3>
                <p className='text-text-tertiary text-sm leading-relaxed max-w-[280px]'>
                  {t('sync.delete.description', { name: vaultName })}
                </p>
              </div>

              <div className='flex gap-3 w-full pt-2'>
                <button
                  onClick={handleCloseDelete}
                  className='flex-1 py-4 bg-overlay-subtle border border-overlay-soft text-text-tertiary rounded-xl font-bold text-sm hover:bg-overlay-medium transition-all active:scale-95'
                >
                  {t('sync.delete.cancel')}
                </button>
                <button
                  onClick={() => {
                    dispatch(deleteSyncedDevice({ key: device.key }))
                    setIsConfirmingDelete(false)
                  }}
                  className='flex-1 py-4 bg-accent-danger text-white rounded-xl font-bold text-base shadow-[0_8px_25px_rgba(var(--accent-danger-rgb),0.3)] hover:bg-accent-danger-hover transition-all active:scale-95'
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SyncLeadersPanel({ plan, onSuggest }) {
  const { t } = useTranslation()
  const offlineNames = plan.offlineLeaders.map(getDeviceDisplayName).join(', ')
  const leaderLine = syncLeaderLine(plan, t)

  return (
    <div className='mt-6 ml-1 space-y-3'>
      {!!leaderLine && (
        <div className='flex items-start gap-2'>
          <Crown className='w-3.5 h-3.5 text-accent-primary shrink-0 mt-0.5' />
          <p className='text-xs text-text-tertiary leading-relaxed'>{leaderLine}</p>
        </div>
      )}

      {plan.needsBothOnline && (
        <div className='flex items-start gap-2'>
          <TriangleAlert className='w-3.5 h-3.5 text-text-tertiary shrink-0 mt-0.5' />
          <p className='text-xs text-text-tertiary leading-relaxed'>
            {t('sync.devices.leadersTwoWarning')}
          </p>
        </div>
      )}

      {!!offlineNames && (
        <div className='flex items-start gap-2'>
          <TriangleAlert className='w-3.5 h-3.5 text-text-tertiary shrink-0 mt-0.5' />
          <p className='text-xs text-text-tertiary leading-relaxed'>
            {t('sync.devices.indexerOfflineNotice', { name: offlineNames })}
          </p>
        </div>
      )}

      {plan.suggested && (
        <button
          onClick={() => onSuggest(plan.suggested)}
          className='w-full p-4 bg-accent-primary/10 border border-accent-primary/30 rounded-2xl flex items-center gap-3 text-left hover:bg-accent-primary/15 transition-colors'
        >
          <Crown className='w-4 h-4 text-accent-primary shrink-0' />
          <span className='flex-1 min-w-0'>
            <span className='block text-sm font-bold text-text-primary truncate'>
              {t('sync.devices.leadersSuggest', { name: getDeviceDisplayName(plan.suggested) })}
            </span>
            <span className='block text-xs text-text-tertiary'>
              {t('sync.devices.leadersSuggestHint')}
            </span>
          </span>
        </button>
      )}
    </div>
  )
}

function LeaderConfirmModal({ device, isIndexer, onCancel, onConfirm }) {
  const { t } = useTranslation()
  const name = getDeviceDisplayName(device)
  const title = isIndexer
    ? device.isLocal
      ? t('sync.devices.makeIndexerTitleLocal')
      : t('sync.devices.makeIndexerTitle', { name })
    : device.isLocal
      ? t('sync.devices.removeIndexerTitleLocal')
      : t('sync.devices.removeIndexerTitle', { name })
  const body = isIndexer
    ? device.isLocal
      ? t('sync.devices.makeIndexerBodyLocal')
      : t('sync.devices.makeIndexerBody', { name })
    : t('sync.devices.removeIndexerBody')

  return (
    <div className='fixed inset-0 z-[2000] flex items-center justify-center p-6 sm:p-0'>
      <div
        className='absolute inset-0 bg-backdrop-medium backdrop-blur-3xl animate-in fade-in duration-300'
        onClick={onCancel}
      />

      <div className='relative bg-bg-panel/95 backdrop-blur-3xl border border-border-primary rounded-[2rem] p-10 max-w-sm w-full animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)]'>
        <div className='absolute -top-24 -left-24 w-48 h-48 bg-accent-primary/20 blur-[80px] rounded-full' />

        <div className='relative z-10 flex flex-col items-center text-center space-y-6'>
          <div className='w-20 h-20 bg-accent-primary/15 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/30 mb-2'>
            {isIndexer ? (
              <Crown className='w-10 h-10 text-accent-primary' />
            ) : (
              <CircleMinus className='w-10 h-10 text-accent-primary' />
            )}
          </div>

          <div className='space-y-2'>
            <h3 className='text-2xl font-bold text-text-primary tracking-tight'>{title}</h3>
            <p className='text-text-tertiary text-sm leading-relaxed max-w-[280px]'>{body}</p>
          </div>

          <div className='flex gap-3 w-full pt-2'>
            <button
              onClick={onCancel}
              className='flex-1 py-4 bg-overlay-subtle border border-overlay-soft text-text-tertiary rounded-xl font-bold text-sm hover:bg-overlay-medium transition-all active:scale-95'
            >
              {t('sync.delete.cancel')}
            </button>
            <button
              onClick={onConfirm}
              className='flex-1 py-4 bg-accent-primary text-white rounded-xl font-bold text-base hover:opacity-90 transition-all active:scale-95'
            >
              {isIndexer
                ? t('sync.devices.makeIndexerConfirm')
                : t('sync.devices.removeIndexerConfirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
