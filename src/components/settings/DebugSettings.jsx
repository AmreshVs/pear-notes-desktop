import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check, Copy, Eye, RefreshCw } from 'lucide-react'

import {
  SENSITIVE_DEBUG_KEYS,
  SHOW_SENSITIVE_DEBUG_INFO
} from '@pear-notes/core/constant.js'
import { formatDebugReport, shortenHex } from '@pear-notes/core/utils.js'

import { copyToClipboard } from '../../lib/clipboard'
import { captureDebugSnapshot } from '../../lib/debugSnapshot'
import CopyFullReportModal from '../modals/CopyFullReportModal'

const POLL_INTERVAL_MS = 2000
const COPIED_RESET_MS = 2000

const TIMESTAMP_KEYS = [
  'lastBaseErrorAt',
  'lastSyncAt',
  'lastWakeAt',
  'backgroundServiceFailedAt',
  'activityOldestAt',
  'mediaLastRebuildAt',
  'mediaHealthCheckedAt'
]

function formatTimestamp(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '—'
  return new Date(value).toLocaleString()
}

function displayValue(value, key, { shorten = true } = {}) {
  if (key && TIMESTAMP_KEYS.includes(key)) return formatTimestamp(value)
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (Array.isArray(value)) {
    if (value.length === 0) return '—'
    return value.map((item) => displayValue(item, null, { shorten })).join(', ')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'number') return value.toLocaleString()
  return shorten ? shortenHex(String(value)) : String(value)
}

function Row({ label, value, emphasis, valueKey }) {
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(false)
  const shown = displayValue(value, valueKey)
  const full = displayValue(value, valueKey, { shorten: false })
  const canReveal = full !== shown

  const toggleReveal = useCallback(() => setRevealed((current) => !current), [])

  const valueClassName = `text-sm font-mono text-right break-all ${
    emphasis ? 'text-accent-primary font-bold' : 'text-text-secondary'
  }`

  return (
    <div className='px-6 py-2.5 flex items-start justify-between gap-6 border-b border-border-primary/40 last:border-b-0'>
      <span className='text-sm text-text-tertiary font-mono shrink-0'>{label}</span>
      {canReveal ? (
        <button
          type='button'
          onClick={toggleReveal}
          title={revealed ? t('debug.hideValue') : t('debug.revealValue')}
          aria-label={revealed ? t('debug.hideValue') : t('debug.revealValue')}
          className={`${valueClassName} cursor-pointer hover:text-text-primary`}
        >
          {revealed ? full : shown}
        </button>
      ) : (
        <span className={valueClassName}>{shown}</span>
      )}
    </div>
  )
}

function RevealableKey({ value, className }) {
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(false)
  const toggleReveal = useCallback(() => setRevealed((current) => !current), [])
  const short = shortenHex(value)

  if (!value || short === value) return <span className={className}>{value || '—'}</span>

  return (
    <button
      type='button'
      onClick={toggleReveal}
      title={revealed ? t('debug.hideValue') : t('debug.revealValue')}
      aria-label={revealed ? t('debug.hideValue') : t('debug.revealValue')}
      className={`${className} cursor-pointer break-all hover:text-text-secondary`}
    >
      {revealed ? value : short}
    </button>
  )
}

function Card({ title, children }) {
  return (
    <div className='mb-6'>
      <h3 className='text-text-primary text-sm font-bold tracking-tight mb-3 px-1'>{title}</h3>
      <div className='bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden'>
        {children}
      </div>
    </div>
  )
}

function Section({ title, data, emphasis = [] }) {
  if (!data || typeof data !== 'object') return null
  const entries = Object.entries(data).filter(
    ([key]) =>
      key !== 'downloads' &&
      key !== 'uploads' &&
      key !== 'devices' &&
      (SHOW_SENSITIVE_DEBUG_INFO || !SENSITIVE_DEBUG_KEYS.includes(key))
  )
  if (entries.length === 0) return null
  return (
    <Card title={title}>
      {entries.map(([key, value]) => (
        <Row key={key} label={key} value={value} valueKey={key} emphasis={emphasis.includes(key)} />
      ))}
    </Card>
  )
}

function Timeline({ title, timeline }) {
  const blocks = timeline?.blocks || []
  if (blocks.length === 0) return null
  return (
    <Card title={title}>
      <div className='px-6 py-4 overflow-x-auto'>
        {blocks.map((block, blockIndex) => {
          let previousAt = 0
          return (
            <div key={blockIndex} className='mb-3 last:mb-0'>
              <div className='text-xs text-text-tertiary font-mono mb-1'>
                {block.continued ? '(continued)' : '(boot)'}
              </div>
              {(block.marks || []).map((mark, markIndex) => {
                const step = mark.at - previousAt
                previousAt = mark.at
                return (
                  <div
                    key={markIndex}
                    className='flex items-baseline gap-4 text-xs font-mono whitespace-nowrap'
                  >
                    <span className='text-text-secondary flex-1'>{mark.label}</span>
                    <span className='text-text-tertiary w-20 text-right'>{mark.at}ms</span>
                    <span className='text-text-tertiary w-20 text-right'>+{step}ms</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default function DebugSettings() {
  const { t } = useTranslation()
  const [snapshot, setSnapshot] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmFullReport, setConfirmFullReport] = useState(false)
  const mountedRef = useRef(true)
  const copiedTimerRef = useRef(null)
  const heavyStorageRef = useRef(null)

  const load = useCallback(async (heavy) => {
    try {
      const next = await captureDebugSnapshot({ heavy })
      if (!mountedRef.current) return
      if (heavy && next?.storage) heavyStorageRef.current = next.storage
      const keepsHeavyStorage = !heavy && next && heavyStorageRef.current
      setSnapshot(
        keepsHeavyStorage
          ? { ...next, storage: { ...heavyStorageRef.current, ...next.storage } }
          : next
      )
      setError(next?.error ? String(next.error) : '')
    } catch (e) {
      if (!mountedRef.current) return
      setError(String(e?.message || e))
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const initial = setTimeout(() => load(true), 0)
    const timer = setInterval(() => load(false), POLL_INTERVAL_MS)
    return () => {
      mountedRef.current = false
      clearTimeout(initial)
      clearInterval(timer)
      clearTimeout(copiedTimerRef.current)
    }
  }, [load])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await load(true)
    if (mountedRef.current) setRefreshing(false)
  }, [load])

  const copy = useCallback(
    async (redact) => {
      if (!snapshot) return
      try {
        const ok = await copyToClipboard(formatDebugReport(snapshot, { redact }))
        if (!ok) throw new Error('clipboard write failed')
        setCopied(true)
        clearTimeout(copiedTimerRef.current)
        copiedTimerRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS)
      } catch (e) {
        setError(String(e?.message || e))
      }
    },
    [snapshot]
  )

  const handleCopy = useCallback(() => copy(true), [copy])

  const openFullReportConfirm = useCallback(() => setConfirmFullReport(true), [])

  const closeFullReportConfirm = useCallback(() => setConfirmFullReport(false), [])

  const handleCopyFull = useCallback(() => {
    setConfirmFullReport(false)
    copy(false)
  }, [copy])

  const devices = snapshot?.devices || []
  const downloads = snapshot?.swarm?.downloads || []
  const uploads = snapshot?.swarm?.uploads || []

  return (
    <div className='pb-4'>
      <CopyFullReportModal
        open={confirmFullReport}
        onConfirm={handleCopyFull}
        onCancel={closeFullReportConfirm}
      />
      <div className='flex items-center gap-3 mb-6'>
        <button
          onClick={handleCopy}
          disabled={!snapshot}
          className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-primary text-accent-on-primary text-sm font-bold disabled:opacity-40'
        >
          {copied ? <Check className='w-4 h-4' /> : <Copy className='w-4 h-4' />}
          {copied ? t('debug.copied') : t('debug.copy')}
        </button>
        {SHOW_SENSITIVE_DEBUG_INFO ? (
          <button
            onClick={openFullReportConfirm}
            disabled={!snapshot}
            className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg-secondary border border-border-primary text-text-secondary text-sm font-bold disabled:opacity-40'
          >
            <Eye className='w-4 h-4' />
            {t('debug.copyFull')}
          </button>
        ) : null}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg-secondary border border-border-primary text-text-secondary text-sm font-bold disabled:opacity-40'
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {t('debug.refresh')}
        </button>
        {snapshot?.capturedAt ? (
          <span className='text-xs text-text-tertiary font-mono'>
            {new Date(snapshot.capturedAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className='mb-6 flex items-start gap-3 px-5 py-4 rounded-2xl bg-accent-danger/10 border border-accent-danger/30'>
          <AlertTriangle className='w-4 h-4 text-accent-danger mt-0.5 shrink-0' />
          <span className='text-sm text-accent-danger font-mono break-all'>{error}</span>
        </div>
      ) : null}

      {!snapshot ? (
        <p className='text-sm text-text-tertiary'>{t('debug.loading')}</p>
      ) : (
        <>
          <Section
            title={t('debug.sections.autobase')}
            data={snapshot.autobase}
            emphasis={['backlog', 'majority', 'indexerCount']}
          />
          <Section title={t('debug.sections.swarm')} data={snapshot.swarm} />

          {devices.length > 0 ? (
            <Card title={t('debug.sections.devices')}>
              {devices.map((device) => (
                <div
                  key={device.localKey || device.title}
                  className='px-6 py-3 border-b border-border-primary/40 last:border-b-0'
                >
                  <div className='flex items-center justify-between gap-4'>
                    <span className='text-sm text-text-primary font-semibold'>
                      {device.title || t('debug.untitledDevice')}
                    </span>
                    <span className='text-xs font-mono text-text-tertiary'>
                      {[
                        device.platform,
                        device.isLocal ? t('debug.deviceLocal') : null,
                        device.isIndexer ? t('debug.deviceLeader') : null,
                        device.isOnline ? t('debug.deviceOnline') : t('debug.deviceOffline')
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  {SHOW_SENSITIVE_DEBUG_INFO ? (
                    <div className='mt-1'>
                      <RevealableKey
                        value={device.localKey}
                        className='text-xs font-mono text-text-tertiary'
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </Card>
          ) : null}

          {downloads.length > 0 || uploads.length > 0 ? (
            <Card title={t('debug.sections.transfers')}>
              {downloads.map((item, index) => (
                <Row
                  key={`down-${index}`}
                  label={`down ${item.fileName || '—'}`}
                  value={`${item.downloadedBytes}/${item.totalBytes} ${item.status}${
                    item.stalled ? ' STALLED' : ''
                  }`}
                />
              ))}
              {uploads.map((item, index) => (
                <Row
                  key={`up-${index}`}
                  label={`up ${item.fileName || '—'}`}
                  value={`${item.uploadedBytes}/${item.totalBytes} ${item.status}`}
                />
              ))}
            </Card>
          ) : null}

          <Section title={t('debug.sections.sync')} data={snapshot.sync} />
          <Section title={t('debug.sections.storage')} data={snapshot.storage} />
          <Section title={t('debug.sections.app')} data={snapshot.app} />
          <Section title={t('debug.sections.runtime')} data={snapshot.runtime} />
          <Timeline title={t('debug.sections.backendBoot')} timeline={snapshot.backendBoot} />
          <Timeline title={t('debug.sections.appBoot')} timeline={snapshot.appBoot} />
        </>
      )}
    </div>
  )
}
