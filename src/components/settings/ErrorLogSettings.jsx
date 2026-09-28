import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileDown,
  RefreshCw,
  Trash2
} from 'lucide-react'

import { backendApi } from '@pear-notes/core/backend/api.js'

import { copyToClipboard } from '../../lib/clipboard'
import { buildErrorReport, saveErrorReport } from '../../lib/errorReport'

const COPIED_RESET_MS = 2000

const LEVEL_CLASS = {
  fatal: 'text-accent-danger',
  error: 'text-accent-danger',
  warn: 'text-accent-warning-text',
  info: 'text-text-tertiary',
  debug: 'text-text-tertiary'
}

function EntryRow({ entry }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((current) => !current), [])
  const level = entry.level || 'error'
  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <div className='px-6 py-3 border-b border-border-primary/40 last:border-b-0'>
      <button
        type='button'
        onClick={toggle}
        disabled={!entry.detail}
        className='w-full flex items-start gap-3 text-left disabled:cursor-default'
      >
        <Chevron
          className={`w-4 h-4 mt-0.5 shrink-0 text-text-tertiary ${entry.detail ? '' : 'invisible'}`}
        />
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-3 text-xs font-mono'>
            <span className={`font-bold uppercase ${LEVEL_CLASS[level] || LEVEL_CLASS.error}`}>
              {level}
            </span>
            <span className='text-text-tertiary'>{entry.source || 'backend'}</span>
            <span className='text-text-tertiary'>{new Date(entry.at).toLocaleString()}</span>
            {entry.count > 1 ? (
              <span className='text-text-tertiary'>
                {t('debug.errorLog.repeated', {
                  count: entry.count,
                  time: new Date(entry.lastAt).toLocaleTimeString()
                })}
              </span>
            ) : null}
          </div>
          <p className='mt-1 text-sm font-mono text-text-primary break-all'>{entry.message}</p>
        </div>
      </button>
      {open && entry.detail ? (
        <pre className='mt-2 ml-7 text-xs font-mono text-text-secondary whitespace-pre-wrap break-all'>
          {entry.detail}
        </pre>
      ) : null}
    </div>
  )
}

export default function ErrorLogSettings() {
  const { t } = useTranslation()
  const [log, setLog] = useState(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const mountedRef = useRef(true)
  const copiedTimerRef = useRef(null)
  const savedTimerRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const next = await backendApi.getErrorLog()
      if (!mountedRef.current) return
      setLog(next)
      setError(next?.error ? String(next.error) : '')
    } catch (e) {
      if (mountedRef.current) setError(String(e?.message || e))
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const initial = setTimeout(load, 0)
    return () => {
      mountedRef.current = false
      clearTimeout(initial)
      clearTimeout(copiedTimerRef.current)
      clearTimeout(savedTimerRef.current)
    }
  }, [load])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    if (mountedRef.current) setRefreshing(false)
  }, [load])

  const runReportAction = useCallback(async (action) => {
    setBusy(true)
    try {
      await action()
    } catch (e) {
      if (mountedRef.current) setError(String(e?.message || e))
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }, [])

  const handleSave = useCallback(
    () =>
      runReportAction(async () => {
        const { saved: done, log: latest } = await saveErrorReport()
        if (!mountedRef.current) return
        setLog(latest)
        if (!done) return
        setSaved(true)
        clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaved(false), COPIED_RESET_MS)
      }),
    [runReportAction]
  )

  const handleCopy = useCallback(
    () =>
      runReportAction(async () => {
        const { report, log: latest } = await buildErrorReport()
        const ok = await copyToClipboard(report)
        if (!ok) throw new Error('clipboard write failed')
        if (!mountedRef.current) return
        setLog(latest)
        setCopied(true)
        clearTimeout(copiedTimerRef.current)
        copiedTimerRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS)
      }),
    [runReportAction]
  )

  const handleClear = useCallback(async () => {
    if (!confirmingClear) {
      setConfirmingClear(true)
      return
    }
    setConfirmingClear(false)
    try {
      await backendApi.clearErrorLog()
      await load()
    } catch (e) {
      if (mountedRef.current) setError(String(e?.message || e))
    }
  }, [confirmingClear, load])

  const cancelClear = useCallback(() => setConfirmingClear(false), [])

  const recording = log?.enabled === true

  const handleToggleRecording = useCallback(async () => {
    const next = !recording
    setLog((current) => ({ ...(current || {}), enabled: next }))
    try {
      await backendApi.setErrorLogEnabled(next)
    } catch (e) {
      if (mountedRef.current) setError(String(e?.message || e))
    }
    await load()
  }, [recording, load])

  const entries = log?.entries || []

  return (
    <div className='pb-4'>
      <p className='text-sm text-text-tertiary mb-6 max-w-xl leading-relaxed'>
        {t('debug.errorLog.description')}
      </p>

      <div className='mb-6 bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden'>
        <div className='p-6 flex items-center justify-between gap-6 group hover:bg-overlay-faint transition-colors'>
          <div className='space-y-1 min-w-0'>
            <label className='block text-text-primary text-base font-bold'>
              {t('debug.errorLog.record')}
            </label>
            <p className='text-sm text-text-tertiary font-medium opacity-60'>
              {t('debug.errorLog.recordDesc')}
            </p>
          </div>
          <button
            onClick={handleToggleRecording}
            disabled={!log}
            aria-label={t('debug.errorLog.record')}
            aria-pressed={recording}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-40 ${
              recording ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border-primary'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-text-primary transition-transform ${
                recording ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-3 mb-6'>
        <button
          onClick={handleSave}
          disabled={busy}
          className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-primary text-accent-on-primary text-sm font-bold disabled:opacity-40'
        >
          {saved ? <Check className='w-4 h-4' /> : <FileDown className='w-4 h-4' />}
          {saved ? t('debug.errorLog.saved') : t('debug.errorLog.save')}
        </button>
        <button
          onClick={handleCopy}
          disabled={busy}
          className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg-secondary border border-border-primary text-text-secondary text-sm font-bold disabled:opacity-40'
        >
          {copied ? <Check className='w-4 h-4' /> : <Copy className='w-4 h-4' />}
          {copied ? t('debug.copied') : t('debug.errorLog.copy')}
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg-secondary border border-border-primary text-text-secondary text-sm font-bold disabled:opacity-40'
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {t('debug.refresh')}
        </button>
        {confirmingClear ? (
          <button
            onClick={cancelClear}
            className='px-4 py-2.5 rounded-xl border border-border-primary text-text-secondary text-sm font-bold hover:bg-overlay-subtle transition-colors'
          >
            {t('common.cancel')}
          </button>
        ) : null}
        <button
          onClick={handleClear}
          disabled={entries.length === 0}
          className='px-4 py-2.5 rounded-xl border border-accent-danger/50 text-accent-danger text-sm font-bold hover:bg-accent-danger/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2'
        >
          <Trash2 className='w-4 h-4' />
          {confirmingClear ? t('debug.errorLog.clearYes') : t('debug.errorLog.clear')}
        </button>
        {confirmingClear ? (
          <span className='text-xs text-text-tertiary'>{t('debug.errorLog.clearConfirm')}</span>
        ) : null}
      </div>

      {error ? (
        <div className='mb-6 flex items-start gap-3 px-5 py-4 rounded-2xl bg-accent-danger/10 border border-accent-danger/30'>
          <AlertTriangle className='w-4 h-4 text-accent-danger mt-0.5 shrink-0' />
          <span className='text-sm text-accent-danger font-mono break-all'>{error}</span>
        </div>
      ) : null}

      {!log ? (
        <p className='text-sm text-text-tertiary'>{t('debug.errorLog.loading')}</p>
      ) : entries.length === 0 ? (
        <p className='text-sm text-text-tertiary'>
          {t(recording ? 'debug.errorLog.empty' : 'debug.errorLog.emptyOff')}
        </p>
      ) : (
        <div className='mb-6'>
          <h3 className='text-text-primary text-sm font-bold tracking-tight mb-3 px-1'>
            {t('debug.errorLog.count', { count: entries.length })}
          </h3>
          <div className='bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden'>
            {entries.map((entry, index) => (
              <EntryRow key={`${entry.at}-${index}`} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
