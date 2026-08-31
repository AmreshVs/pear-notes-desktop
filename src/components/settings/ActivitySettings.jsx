import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { ChevronDown, History, Info, Trash2 } from 'lucide-react'

import {
  ACTIVITY_FILTER,
  ACTIVITY_RETENTION_DAY_OPTIONS,
  ACTIVITY_RETENTION_FOREVER
} from '@pear-notes/core/constant.js'
import {
  clearActivity,
  fetchActivity,
  fetchActivityStats,
  fetchMoreActivity,
  getActivityDayGroups,
  getActivityDeviceFilter,
  getActivityFilter,
  getActivityHasMore,
  getActivityIsClearing,
  getActivityIsLoading,
  getActivityIsLoadingMore,
  getActivityStats,
  setActivityDeviceFilter,
  setActivityFilter,
  subscribeActivity,
  unsubscribeActivity
} from '@pear-notes/core/store/slices/activitySlice.js'
import {
  getActivityLogEnabled,
  getActivityRetentionDays,
  updateSetting
} from '@pear-notes/core/store/slices/settingsSlice.js'
import { getSyncedDevices } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import { resolveActivityDeviceName } from '../../lib/activityDevice'
import { isNoteUnlocked, useNoteLockVersion } from '../../lib/noteLock'
import ActivityEntryRow from '../common/ActivityEntryRow'

const FILTERS = [
  { id: ACTIVITY_FILTER.ALL, labelKey: 'activity.filters.all' },
  { id: ACTIVITY_FILTER.NOTES, labelKey: 'activity.filters.notes' },
  { id: ACTIVITY_FILTER.FOLDERS, labelKey: 'activity.filters.folders' },
  { id: ACTIVITY_FILTER.DEVICES, labelKey: 'activity.filters.devices' }
]

function formatDay(value, t) {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return t('activity.today')
  if (date.toDateString() === yesterday.toDateString()) return t('activity.yesterday')
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function ActivitySettings() {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const enabled = useSelector(getActivityLogEnabled)
  const retentionDays = useSelector(getActivityRetentionDays)
  const groups = useSelector(getActivityDayGroups)
  const filter = useSelector(getActivityFilter)
  const deviceFilter = useSelector(getActivityDeviceFilter)
  const hasMore = useSelector(getActivityHasMore)
  const isLoading = useSelector(getActivityIsLoading)
  const isLoadingMore = useSelector(getActivityIsLoadingMore)
  const isClearing = useSelector(getActivityIsClearing)
  const stats = useSelector(getActivityStats)
  const devices = useSelector(getSyncedDevices)

  const [expandedId, setExpandedId] = useState(null)
  const [confirmingClear, setConfirmingClear] = useState(false)

  useNoteLockVersion()

  useEffect(() => {
    dispatch(fetchActivity())
    dispatch(fetchActivityStats())
    dispatch(subscribeActivity())
    return () => {
      dispatch(unsubscribeActivity())
    }
  }, [dispatch])

  useEffect(() => {
    dispatch(fetchActivity())
  }, [dispatch, filter, deviceFilter])

  const deviceOptions = useMemo(
    () =>
      devices
        .filter((device) => device.localKey)
        .map((device) => ({
          value: device.localKey,
          label: resolveActivityDeviceName(device.localKey, devices, t)
        })),
    [devices, t]
  )

  const handleToggle = () => {
    dispatch(updateSetting({ key: 'activityLogEnabled', value: !enabled }))
  }

  const handleRetentionChange = (event) => {
    dispatch(
      updateSetting({ key: 'activityRetentionDays', value: Number(event.target.value) })
    )
  }

  const handleClear = () => {
    if (!confirmingClear) {
      setConfirmingClear(true)
      return
    }
    setConfirmingClear(false)
    setExpandedId(null)
    dispatch(clearActivity())
  }

  const isEmpty = !isLoading && groups.length === 0

  return (
    <div className='space-y-8 animate-in fade-in duration-500'>
      <div className='space-y-1'>
        <h3 className='text-text-secondary font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>
          {t('activity.settings.title')}
        </h3>

        <div className='bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden backdrop-blur-md'>
          <div className='p-6 flex items-center justify-between gap-6 border-b border-border-primary group hover:bg-overlay-faint transition-colors'>
            <div className='space-y-1 min-w-0'>
              <label className='block text-text-primary text-base font-bold'>
                {t('activity.settings.record')}
              </label>
              <p className='text-sm text-text-tertiary font-medium opacity-60'>
                {t('activity.settings.recordDesc')}
              </p>
            </div>
            <button
              onClick={handleToggle}
              aria-label={t('activity.settings.record')}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                enabled ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border-primary'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-text-primary transition-transform ${
                  enabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          <div
            className={`p-6 flex items-center justify-between gap-6 border-b border-border-primary group hover:bg-overlay-faint transition-colors ${
              enabled ? '' : 'opacity-50'
            }`}
          >
            <div className='space-y-1 min-w-0'>
              <label className='block text-text-primary text-base font-bold'>
                {t('activity.settings.retention')}
              </label>
              <p className='text-sm text-text-tertiary font-medium opacity-60'>
                {t('activity.settings.retentionDesc')}
              </p>
            </div>
            <div className='relative group/select'>
              <select
                value={retentionDays}
                disabled={!enabled}
                onChange={handleRetentionChange}
                className='appearance-none bg-bg-tertiary/50 border border-border-primary text-text-primary text-sm font-bold py-2.5 pl-4 pr-10 rounded-xl outline-none focus:border-accent-primary/50 transition-all cursor-pointer hover:bg-bg-tertiary disabled:cursor-not-allowed'
              >
                {ACTIVITY_RETENTION_DAY_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {days === ACTIVITY_RETENTION_FOREVER
                      ? t('activity.settings.keepEverything')
                      : t('activity.settings.days', { count: days })}
                  </option>
                ))}
              </select>
              <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none group-hover/select:text-accent-primary transition-colors' />
            </div>
          </div>

          <div className='px-6 py-4 flex items-start gap-3 bg-accent-selected-bg border-b border-border-primary'>
            <Info className='w-4 h-4 text-accent-primary-text shrink-0 mt-0.5' />
            <p className='text-xs text-text-secondary leading-relaxed'>
              {t('activity.settings.syncNotice')}
            </p>
          </div>

          <div className='p-6 flex items-center justify-between gap-6'>
            <div className='space-y-1 min-w-0'>
              <label className='block text-text-primary text-base font-bold'>
                {t('activity.settings.clear')}
              </label>
              <p className='text-sm text-text-tertiary font-medium opacity-60 tabular-nums'>
                {confirmingClear
                  ? t('activity.settings.clearConfirm')
                  : t('activity.settings.stored', {
                      count: stats.count,
                      size: formatBytes(stats.bytes)
                    })}
              </p>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              {confirmingClear && (
                <button
                  onClick={() => setConfirmingClear(false)}
                  className='px-4 py-2.5 rounded-xl border border-border-primary text-text-secondary text-sm font-bold hover:bg-overlay-subtle transition-colors'
                >
                  {t('common.cancel')}
                </button>
              )}
              <button
                onClick={handleClear}
                disabled={isClearing || stats.count === 0}
                className='px-4 py-2.5 rounded-xl border border-accent-danger/50 text-accent-danger text-sm font-bold hover:bg-accent-danger/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2'
              >
                <Trash2 className='w-4 h-4' />
                {confirmingClear ? t('activity.settings.clearYes') : t('activity.settings.clear')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className='space-y-1'>
        <h3 className='text-text-secondary font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>
          {t('activity.timeline')}
        </h3>

        <div className='flex items-center gap-2 flex-wrap mb-4 ml-1'>
          {FILTERS.map((option) => (
            <button
              key={option.id}
              onClick={() => dispatch(setActivityFilter(option.id))}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                filter === option.id
                  ? 'bg-accent-selected-bg border-accent-selected-border text-accent-primary-text'
                  : 'border-border-primary text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {t(option.labelKey)}
            </button>
          ))}

          {deviceOptions.length > 0 && (
            <div className='relative group/select ml-auto'>
              <select
                value={deviceFilter}
                onChange={(e) => dispatch(setActivityDeviceFilter(e.target.value))}
                className='appearance-none bg-bg-tertiary/50 border border-border-primary text-text-secondary text-xs font-bold py-1.5 pl-3 pr-8 rounded-full outline-none focus:border-accent-primary/50 cursor-pointer hover:bg-bg-tertiary'
              >
                <option value=''>{t('activity.filters.anyDevice')}</option>
                {deviceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className='absolute right-2.5 top-1/2 transform -translate-y-1/2 w-3 h-3 text-text-tertiary pointer-events-none' />
            </div>
          )}
        </div>

        {isEmpty ? (
          <div className='bg-bg-secondary border border-border-primary rounded-3xl p-10 flex flex-col items-center text-center gap-3'>
            <div className='w-14 h-14 rounded-2xl bg-bg-tertiary flex items-center justify-center'>
              <History className='w-6 h-6 text-text-tertiary' />
            </div>
            <p className='text-text-primary font-bold'>
              {enabled ? t('activity.empty.title') : t('activity.empty.disabledTitle')}
            </p>
            <p className='text-sm text-text-tertiary max-w-sm leading-relaxed'>
              {enabled ? t('activity.empty.description') : t('activity.empty.disabledDescription')}
            </p>
          </div>
        ) : (
          <div className='space-y-6'>
            {groups.map((group) => (
              <div key={group.day} className='space-y-2'>
                <p className='text-[0.65rem] uppercase tracking-[0.18em] text-text-tertiary font-bold ml-2'>
                  {formatDay(group.at, t)}
                </p>
                <div className='space-y-2'>
                  {group.entries.map((entry) => (
                    <ActivityEntryRow
                      key={entry.id}
                      entry={entry}
                      expanded={expandedId === entry.id}
                      onToggle={(id) => setExpandedId((current) => (current === id ? null : id))}
                      isUnlocked={isNoteUnlocked(entry.targetKey)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={() => dispatch(fetchMoreActivity())}
                disabled={isLoadingMore}
                className='w-full py-3 rounded-2xl border border-border-primary text-text-secondary text-sm font-bold hover:bg-overlay-subtle transition-colors disabled:opacity-50'
              >
                {isLoadingMore ? t('common.loading') : t('activity.loadMore')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
