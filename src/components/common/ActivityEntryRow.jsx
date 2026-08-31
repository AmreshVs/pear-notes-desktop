import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { ChevronDown, ChevronRight, Lock, Monitor, Smartphone } from 'lucide-react'

import { findDeviceByLocalKey, getActivityMessage } from '@pear-notes/core/activity.js'
import { ACTIVITY_EVENT } from '@pear-notes/core/constant.js'
import {
  fetchActivityDiff,
  getActivityDiffs
} from '@pear-notes/core/store/slices/activitySlice.js'
import { getSyncedDevices } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'

import { resolveActivityDeviceName } from '../../lib/activityDevice'

import DiffView from './DiffView'

const DIFFABLE = new Set([ACTIVITY_EVENT.NOTE_EDITED])

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ActivityEntryRow({
  entry,
  expanded,
  onToggle,
  showTarget = true,
  isUnlocked = false
}) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const devices = useSelector(getSyncedDevices)
  const diffs = useSelector(getActivityDiffs)

  const device = useMemo(
    () => findDeviceByLocalKey(devices, entry.device),
    [devices, entry.device]
  )

  const deviceName = useMemo(
    () => resolveActivityDeviceName(entry.device, devices, t),
    [entry.device, devices, t]
  )

  const DeviceIcon = device?.deviceType === 'mobile' ? Smartphone : Monitor

  const hidden = entry.locked && !isUnlocked
  const canExpand = DIFFABLE.has(entry.event) && entry.hasDiff && !hidden
  const diff = diffs[entry.id]

  const message = getActivityMessage(entry, t, { hidden, showTarget })

  const handleToggle = () => {
    if (!canExpand) return
    if (!expanded && !diff) dispatch(fetchActivityDiff({ id: entry.id }))
    onToggle(entry.id)
  }

  const isRange = entry.lastAt > entry.at
  const timeLabel = isRange
    ? `${formatTime(entry.at)} – ${formatTime(entry.lastAt)}`
    : formatTime(entry.at)

  return (
    <div
      className={`bg-bg-secondary border rounded-2xl overflow-hidden transition-colors ${
        expanded ? 'border-accent-primary/40' : 'border-border-primary'
      }`}
    >
      <div
        role={canExpand ? 'button' : undefined}
        tabIndex={canExpand ? 0 : undefined}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (!canExpand) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleToggle()
          }
        }}
        className={`p-4 flex items-start gap-3 ${
          canExpand ? 'cursor-pointer hover:bg-overlay-faint' : ''
        } transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50`}
      >
        <div className='w-8 h-8 shrink-0 rounded-xl bg-bg-tertiary flex items-center justify-center text-text-secondary'>
          <DeviceIcon className='w-4 h-4' />
        </div>

        <div className='flex-1 min-w-0 space-y-1'>
          <p className='text-sm text-text-secondary leading-snug'>
            <span className='font-bold text-text-primary'>{deviceName}</span>{' '}
            {message}
          </p>

          <div className='flex items-center gap-3 flex-wrap text-[0.7rem] text-text-tertiary font-medium tabular-nums'>
            <span>{timeLabel}</span>
            {entry.ops > 1 && <span>{t('activity.saveCount', { count: entry.ops })}</span>}
            {hidden && (
              <span className='inline-flex items-center gap-1 text-text-muted'>
                <Lock className='w-3 h-3' />
                {t('activity.locked')}
              </span>
            )}
          </div>
        </div>

        {canExpand && (
          <div className='shrink-0 text-text-tertiary pt-1'>
            {expanded ? (
              <ChevronDown className='w-4 h-4' />
            ) : (
              <ChevronRight className='w-4 h-4' />
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className='px-4 pb-4'>
          {diff?.available ? (
            <DiffView before={diff.before} after={diff.after} compact />
          ) : (
            <div className='px-4 py-3 bg-bg-tertiary/40 border border-border-secondary rounded-2xl text-xs text-text-tertiary'>
              {diff ? t('activity.diff.unavailable') : t('activity.diff.loading')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
