import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { AlertTriangle, Check } from 'lucide-react'

import { MEDIA_SYNC_PAUSED_KEY, METERED_CONNECTION_KEY } from '@pear-notes/core/constant.js'
import {
  getHasLinkedDevices,
  getRemoteSyncedDevices
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import {
  getMediaSyncFlag,
  getSyncStatusSnapshot,
  setMediaSyncFlag
} from '@pear-notes/core/utils.js'

import {
  applyCloseToTray,
  applyStartAtLogin,
  CLOSE_TO_TRAY_KEY,
  getAppBehaviorPreference,
  readStartAtLogin,
  setAppBehaviorPreference,
  START_AT_LOGIN_KEY
} from '../../lib/appBehavior'
import { formatRelativeDate } from '../../utils/formatters'

const REFRESH_INTERVAL_MS = 30000

const SECTION_TITLE_CLASS = 'text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'
const CARD_CLASS =
  'bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden divide-y divide-border-primary'
const ROW_CLASS =
  'p-6 flex items-center justify-between gap-6 group hover:bg-overlay-faint transition-colors'
const LABEL_CLASS = 'block text-text-primary text-base font-bold'
const DESC_CLASS = 'text-sm text-text-tertiary font-medium opacity-60'

function Toggle({ on, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${on ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border-primary'}`}
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-text-primary transition-transform ${on ? 'translate-x-5' : ''}`}
      />
    </button>
  )
}

export default function SyncSettings({ onOpenDiagnostics }) {
  const { t } = useTranslation()
  const hasLinkedDevices = useSelector(getHasLinkedDevices)
  const remoteDevices = useSelector(getRemoteSyncedDevices)

  const [closeToTray, setCloseToTray] = useState(true)
  const [startAtLogin, setStartAtLogin] = useState(false)
  const [mediaPaused, setMediaPaused] = useState(false)
  const [metered, setMetered] = useState(false)
  const [snapshot, setSnapshot] = useState({ lastSyncAt: 0, lastReceived: 0 })

  const refreshStatus = useCallback(() => {
    getSyncStatusSnapshot().then(setSnapshot)
  }, [])

  useEffect(() => {
    let active = true
    getAppBehaviorPreference(CLOSE_TO_TRAY_KEY, true).then((v) => {
      if (active) setCloseToTray(v)
    })
    readStartAtLogin(false).then((v) => {
      if (active) setStartAtLogin(v)
    })
    getMediaSyncFlag(MEDIA_SYNC_PAUSED_KEY).then((v) => {
      if (active) setMediaPaused(v)
    })
    getMediaSyncFlag(METERED_CONNECTION_KEY).then((v) => {
      if (active) setMetered(v)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    refreshStatus()
    const timer = setInterval(refreshStatus, REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [refreshStatus])

  const isCloseToTrayOn = closeToTray && hasLinkedDevices
  const onlineDevices = remoteDevices.filter((device) => device.isOnline)
  const peerName = remoteDevices[0]?.title || ''

  let verdict = 'ok'
  if (!hasLinkedDevices) verdict = 'noDevices'
  else if (!snapshot.lastSyncAt) verdict = 'neverSynced'
  else if (onlineDevices.length === 0) verdict = 'waiting'
  else if (isCloseToTrayOn) verdict = 'canSleep'

  const handleToggleCloseToTray = () => {
    if (!hasLinkedDevices) return
    const next = !closeToTray
    setCloseToTray(next)
    setAppBehaviorPreference(CLOSE_TO_TRAY_KEY, next)
    applyCloseToTray(next)
  }

  const handleToggleStartAtLogin = async () => {
    const next = !startAtLogin
    setStartAtLogin(next)
    const applied = await applyStartAtLogin(next)
    setStartAtLogin(applied)
    setAppBehaviorPreference(START_AT_LOGIN_KEY, applied)
  }

  const handleToggleMediaPaused = () => {
    const next = !mediaPaused
    setMediaPaused(next)
    setMediaSyncFlag(MEDIA_SYNC_PAUSED_KEY, next)
  }

  const handleToggleMetered = () => {
    const next = !metered
    setMetered(next)
    setMediaSyncFlag(METERED_CONNECTION_KEY, next)
  }

  return (
    <div className='space-y-12 max-w-2xl mx-auto'>
      <div className='space-y-1'>
        <h3 className={SECTION_TITLE_CLASS}>{t('settings.syncStatus.title')}</h3>
        <div className={CARD_CLASS}>
          {hasLinkedDevices && (
            <>
              <div className={ROW_CLASS}>
                <span className={DESC_CLASS}>{t('settings.syncStatus.lastSynced')}</span>
                <span className='text-sm font-bold text-text-primary tabular-nums'>
                  {snapshot.lastSyncAt
                    ? formatRelativeDate(snapshot.lastSyncAt)
                    : t('settings.syncStatus.never')}
                </span>
              </div>

              <div className={ROW_CLASS}>
                <span className={DESC_CLASS}>{t('settings.syncStatus.received')}</span>
                <span className='text-sm font-bold text-text-primary tabular-nums'>
                  {snapshot.lastReceived > 0
                    ? t('settings.syncStatus.receivedCount', { count: snapshot.lastReceived })
                    : t('settings.syncStatus.nothingNew')}
                </span>
              </div>

              <div className={ROW_CLASS}>
                <span className={DESC_CLASS}>{t('settings.syncStatus.devicesOnline')}</span>
                <span className='text-sm font-bold text-text-primary truncate'>
                  {onlineDevices.length > 0
                    ? onlineDevices.map((device) => device.title).join(', ')
                    : t('settings.syncStatus.noneReachable')}
                </span>
              </div>
            </>
          )}

          <div className='p-6 flex items-start gap-3'>
            {verdict === 'ok' ? (
              <Check size={16} className='shrink-0 mt-0.5 text-green-500' />
            ) : (
              <AlertTriangle size={16} className='shrink-0 mt-0.5 text-accent-primary' />
            )}
            <p className='text-sm text-text-secondary leading-relaxed'>
              {t(`settings.syncStatus.verdict.${verdict}`, { device: peerName })}
            </p>
          </div>
        </div>
      </div>

      <div className='space-y-1'>
        <h3 className={SECTION_TITLE_CLASS}>{t('settings.general.startupAndBackground')}</h3>
        <div className={CARD_CLASS}>
          <div className={ROW_CLASS}>
            <div className={`space-y-1 min-w-0 ${hasLinkedDevices ? '' : 'opacity-50'}`}>
              <label className={LABEL_CLASS}>{t('settings.general.keepRunning')}</label>
              <p className={DESC_CLASS}>
                {hasLinkedDevices
                  ? t('settings.general.keepRunningDesc')
                  : t('settings.general.keepRunningUnlinked')}
              </p>
            </div>
            <Toggle
              on={isCloseToTrayOn}
              onClick={handleToggleCloseToTray}
              disabled={!hasLinkedDevices}
            />
          </div>

          <div className={ROW_CLASS}>
            <div className='space-y-1 min-w-0'>
              <label className={LABEL_CLASS}>{t('settings.general.startAtLogin')}</label>
              <p className={DESC_CLASS}>{t('settings.general.startAtLoginDesc')}</p>
            </div>
            <Toggle on={startAtLogin} onClick={handleToggleStartAtLogin} />
          </div>
        </div>
      </div>

      <div className='space-y-1'>
        <h3 className={SECTION_TITLE_CLASS}>{t('settings.mediaSync.title')}</h3>
        <div className={CARD_CLASS}>
          <div className={ROW_CLASS}>
            <div className='space-y-1 min-w-0'>
              <label className={LABEL_CLASS}>{t('settings.mediaSync.pauseMedia')}</label>
              <p className={DESC_CLASS}>{t('settings.mediaSync.pauseMediaDesc')}</p>
            </div>
            <Toggle on={mediaPaused} onClick={handleToggleMediaPaused} />
          </div>

          <div className={ROW_CLASS}>
            <div className='space-y-1 min-w-0'>
              <label className={LABEL_CLASS}>{t('settings.general.meteredConnection')}</label>
              <p className={DESC_CLASS}>{t('settings.general.meteredConnectionDesc')}</p>
            </div>
            <Toggle on={metered} onClick={handleToggleMetered} />
          </div>
        </div>
      </div>

      {onOpenDiagnostics ? (
        <div className='pt-2 text-center'>
          <button
            onClick={onOpenDiagnostics}
            className='text-text-tertiary text-xs opacity-60 hover:opacity-100 hover:underline transition-opacity'
          >
            {t('debug.openDiagnostics')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
