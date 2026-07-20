import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  Check,
  Globe,
  Info,
  Link2,
  Loader2,
  Monitor,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2
} from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'

import {
  deleteSyncedDevice,
  getLocalPreferences,
  getSyncedDevices,
  updateSyncedDevice
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import {
  createInvite,
  getInvite,
  getInviteExpiresAt,
  getInviterStatus,
  getSyncIsLoading,
  subscribePairUser
} from '@pear-notes/core/store/slices/syncSlice.js'
import { setShowSettings } from '@pear-notes/core/store/slices/uiSlice.js'
import { extractInvite, isValidInvite } from '@pear-notes/core/utils.js'
import { getDeviceDisplayName } from '@pear-notes/core/utils.js'

import MergeConfirmModal from './MergeConfirmModal'

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

export default function SyncSettings({ onClose }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const inviteCode = useSelector(getInvite)
  const expiresAt = useSelector(getInviteExpiresAt)
  const isLoading = useSelector(getSyncIsLoading)
  const { step } = useSelector(getInviterStatus)
  const syncedDevices = useSelector(getSyncedDevices)
  const localPreferences = useSelector(getLocalPreferences)
  const isSynced = localPreferences['isSynced'] === 'true'

  const isInviteGenerated = !!inviteCode

  const [syncTab, setSyncTab] = useState('invite')
  const [copied, setCopied] = useState(false)
  const [pasteCode, setPasteCode] = useState('')
  const [pendingInvite, setPendingInvite] = useState(null)

  const handleCopyInvite = () => {
    if (!isInviteGenerated) return
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreateInvite = () => {
    dispatch(createInvite())
  }

  const handleConnect = () => {
    if (isValidInvite(pasteCode)) {
      setPendingInvite(extractInvite(pasteCode))
    }
  }

  const handleConfirmMerge = () => {
    if (!pendingInvite) return
    dispatch(subscribePairUser({ invite: pendingInvite }))
    setPendingInvite(null)
    setPasteCode('')
    if (onClose) {
      onClose()
    } else {
      dispatch(setShowSettings(false))
    }
  }

  const handleCancelMerge = () => {
    setPendingInvite(null)
  }

  const formatExpiration = (timestamp) => {
    if (!timestamp) return ''
    const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp
    const date = new Date(ms)
    if (isNaN(date.getTime())) return ''
    return t('sync.invite.expiry', { time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
  }

  return (
    <div className='max-w-2xl mx-auto px-6 py-4 space-y-6'>
      <div className='flex bg-bg-tertiary/50 p-1 rounded-xl border border-overlay-soft w-fit mx-auto'>
        <button
          onClick={() => setSyncTab('invite')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
            syncTab === 'invite'
              ? 'bg-accent-primary text-accent-on-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-overlay-soft'
          }`}
        >
          {t('sync.tabs.link')}
        </button>
        <button
          onClick={() => setSyncTab('manage')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
            syncTab === 'manage'
              ? 'bg-accent-primary text-accent-on-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-overlay-soft'
          }`}
        >
          {t('sync.tabs.devices')}
        </button>
      </div>

      <div className='space-y-6'>
        {syncTab === 'invite' ? (
          <div className='space-y-6'>
            {!isInviteGenerated ? (
              <div className='bg-bg-secondary border border-border-primary rounded-2xl p-10 flex flex-col items-center text-center space-y-5 hover:border-border-secondary transition-colors'>
                <div className='w-20 h-20 bg-accent-primary/5 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/10 shadow-inner'>
                  <Globe className='w-10 h-10 text-accent-primary' />
                </div>
                <div className='space-y-2'>
                  <h3 className='text-text-primary font-bold text-xl'>{t('sync.hero.title')}</h3>
                  <p className='text-text-tertiary text-sm max-w-sm leading-relaxed'>
                    {t('sync.hero.description')}
                  </p>
                </div>
                <button
                  onClick={handleCreateInvite}
                  disabled={isLoading}
                  className='group relative px-10 py-4 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-base transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover active:scale-95'
                >
                  <div className='absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity' />
                  {isLoading && <Loader2 className='w-4 h-4 animate-spin' />}
                  {isLoading ? t('sync.hero.preparing') : t('sync.hero.generateBtn')}
                </button>
              </div>
            ) : (
              <div className='space-y-5'>
                <div className='bg-bg-secondary border border-border-primary rounded-2xl p-8 relative overflow-hidden'>
                  <div className='absolute -top-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-3xl rounded-full pointer-events-none' />

                  <div className='flex items-center gap-3 mb-6'>
                    <div className='w-10 h-10 bg-accent-primary/10 rounded-full flex items-center justify-center border border-accent-primary/20'>
                      <ShieldCheck className='w-5 h-5 text-accent-primary' />
                    </div>
                    <div>
                      <h4 className='text-text-primary font-semibold'>{t('sync.invite.header')}</h4>
                      <p className='text-xs text-text-tertiary font-medium bg-bg-panel-tertiary/50 px-2 py-0.5 rounded-full inline-block mt-1'>
                        {expiresAt ? formatExpiration(expiresAt) : t('sync.invite.permanent')}
                      </p>
                    </div>
                  </div>

                  <div className='flex flex-col items-center mb-6 space-y-4'>
                    <div className='p-3 bg-white rounded-2xl shadow-sm'>
                      <QRCodeCanvas
                        value={inviteCode}
                        size={160}
                        level={'H'}
                        includeMargin={false}
                      />
                    </div>
                    <div className='text-center space-y-1'>
                      <h5 className='text-text-primary font-bold text-base'>{t('sync.invite.qrTitle')}</h5>
                      <p className='text-text-tertiary text-sm leading-relaxed max-w-[280px]'>
                        {t('sync.invite.qrDescription')}
                      </p>
                    </div>
                  </div>

                  <div className='space-y-3'>
                    <label className='text-xs uppercase tracking-wider font-bold text-text-tertiary ml-1'>
                      {t('sync.invite.codeLabel')}
                    </label>
                    <div className='relative group'>
                      <input
                        type='text'
                        readOnly
                        value={inviteCode}
                        className='w-full px-4 py-3 bg-bg-panel/40 border border-border-primary rounded-xl text-text-primary font-mono text-base tracking-wider shadow-inner outline-none transition-all group-hover:border-border-primary'
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleCopyInvite}
                    className={`w-full flex items-center justify-center gap-2 mt-6 px-6 py-4 rounded-xl font-bold text-base transition-colors duration-300 shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover active:scale-95 ${
                      copied
                        ? 'bg-accent-success text-white'
                        : 'bg-accent-primary text-accent-on-primary'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className='w-4 h-4' strokeWidth={2.5} /> {t('sync.invite.copied')}
                      </>
                    ) : (
                      <>
                        <Link2 className='w-4 h-4' /> {t('sync.invite.copyBtn')}
                      </>
                    )}
                  </button>
                </div>

                <div className='bg-accent-primary/5 border border-accent-primary/10 rounded-xl p-4 flex gap-4 items-start'>
                  <Info className='w-5 h-5 text-accent-primary shrink-0' />
                  <p className='text-xs text-text-tertiary leading-relaxed'>
                    {t('sync.invite.warning')}
                  </p>
                </div>
              </div>
            )}

            {!isSynced && (
              <div className='pt-6 border-t border-border-primary space-y-4'>
                <div className='flex items-center gap-2 ml-1'>
                  <Plus className='w-4 h-4 text-accent-primary' />
                  <h4 className='font-bold text-sm text-text-primary'>{t('sync.paste.header')}</h4>
                </div>

                <div className='relative flex gap-2'>
                  <input
                    type='text'
                    value={pasteCode}
                    onChange={(e) => setPasteCode(e.target.value)}
                    placeholder={t('sync.paste.placeholder')}
                    className='flex-1 px-4 py-3 rounded-xl bg-bg-panel-secondary/50 border border-border-primary text-text-primary text-sm focus:outline-none focus:border-accent-primary transition-colors placeholder:text-text-tertiary/50'
                  />
                  <button
                    onClick={handleConnect}
                    disabled={!isValidInvite(pasteCode) || isLoading || step !== 'idle'}
                    className='px-6 py-4 bg-accent-primary text-accent-on-primary rounded-xl hover:bg-accent-primary-hover disabled:bg-bg-panel-tertiary disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors text-base font-bold border border-accent-primary active:scale-95 flex items-center gap-2 shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)]'
                  >
                    {isLoading && <Loader2 className='w-4 h-4 animate-spin' />}
                    {t('sync.paste.linkBtn')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className='space-y-6'>
            <div className='space-y-1'>
              <h4 className='text-text-secondary font-bold text-xs uppercase tracking-widest ml-1 mb-3'>
                {t('sync.devices.thisDevice')}
              </h4>
              <div className='grid gap-4'>
                {syncedDevices
                  .filter((d) => d.isLocal)
                  .map((device) => (
                    <DeviceItem key={device.key} device={device} />
                  ))}
              </div>
            </div>

            <div className='space-y-1'>
              <h4 className='text-text-secondary font-bold text-xs uppercase tracking-widest ml-1 mb-3'>
                {t('sync.devices.otherDevices')}
              </h4>
              <div className='grid gap-4'>
                {syncedDevices.filter((d) => !d.isLocal).length > 0 ? (
                  syncedDevices
                    .filter((d) => !d.isLocal)
                    .map((device) => <DeviceItem key={device.key} device={device} isOther />)
                ) : (
                  <div className='p-6 bg-bg-tertiary/30 border border-dashed border-border-primary rounded-2xl flex flex-col items-center text-center space-y-2'>
                    <div className='w-10 h-10 bg-bg-panel/30 rounded-full flex items-center justify-center text-text-tertiary'>
                      <Smartphone className='w-5 h-5 opacity-50' />
                    </div>
                    <p className='text-xs text-text-tertiary italic'>
                      {t('sync.devices.empty')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className='pt-2'>
          <p className='text-center text-xs text-text-tertiary px-4'>
            <ShieldCheck className='w-3.5 h-3.5 text-accent-primary inline mr-1.5 opacity-60' />
            {t('sync.footer')}
          </p>
        </div>
      </div>

      <MergeConfirmModal
        open={!!pendingInvite}
        onConfirm={handleConfirmMerge}
        onCancel={handleCancelMerge}
      />
    </div>
  )
}

function DeviceItem({ device, isOther }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const Icon = device.deviceType === 'desktop' ? Monitor : Smartphone
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [editedTitle, setEditedTitle] = useState(device.title || '')

  const handleCloseDelete = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsConfirmingDelete(false)
      setIsExiting(false)
    }, 300)
  }

  const handleDoubleClick = () => {
    if (!isOther) {
      setIsEditing(true)
      setEditedTitle(device.title || '')
    }
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
          {device.isLocal && (
            <div className='absolute -bottom-1 -right-1 w-4 h-4 bg-accent-success border-2 border-bg-panel-secondary rounded-full shadow-sm' />
          )}
        </div>

        <div className='flex-1 min-w-0'>
          {isEditing ? (
            <input
              type='text'
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              className='w-full font-bold text-text-primary text-base bg-bg-panel border border-accent-primary rounded px-3 py-2 outline-none'
            />
          ) : (
            <div>
              <span
                className='font-bold text-text-primary text-base truncate cursor-pointer block'
                onDoubleClick={handleDoubleClick}
                title={device.isLocal ? t('folders.doubleClickToRename') : getDeviceDisplayName(device)}
              >
                {getDeviceDisplayName(device)}
              </span>
              <p className='text-xs text-text-tertiary font-bold uppercase tracking-tight mt-1.5'>
                {t(`sync.platforms.${getPlatformName(device.platform)}`, getPlatformName(device.platform))}
              </p>
            </div>
          )}
        </div>

        {isOther && (
          <button
            onClick={() => setIsConfirmingDelete(true)}
            aria-label={t('sync.devices.removeDevice', { name: getDeviceDisplayName(device) })}
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
                  {t('sync.delete.title')}
                </h3>
                <p className='text-text-tertiary text-sm leading-relaxed max-w-[280px]'>
                  {t('sync.delete.description')}
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
