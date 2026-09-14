import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Mic, RotateCcw, ScanText, Square, X } from 'lucide-react'

import { useLocalAiSheet } from '../../hooks/useLocalAiSheet'
import { copyToClipboard } from '../../lib/clipboard'
import { formatTime } from '../../utils/formatters'

const COPIED_RESET_MS = 2000

function heroKeys(mode, phase, error) {
  if (phase === 'error') {
    const errorKey =
      mode === 'extract' && error === 'empty'
        ? 'emptyImage'
        : mode === 'extract' && error === 'failed'
          ? 'failedExtract'
          : error
    return { title: `localAi.errors.${errorKey}.title`, subtitle: `localAi.errors.${errorKey}.subtitle` }
  }
  const visiblePhase = phase === 'idle' ? (mode === 'dictate' ? 'recording' : 'working') : phase
  return {
    title: `localAi.${mode}.${visiblePhase}.title`,
    subtitle: `localAi.${mode}.${visiblePhase}.subtitle`
  }
}

export default function LocalAiSheetModal({ request, insertBlocked, onInsert, onClose }) {
  const { t } = useTranslation()
  const {
    mode,
    phase,
    error,
    text,
    elapsed,
    pageProgress,
    handleStop,
    handleAgain,
    handleClose,
    handleInsert
  } = useLocalAiSheet(request, { onInsert, onClose })
  const [copiedText, setCopiedText] = useState(null)
  const copiedTimerRef = useRef(null)
  const copied = copiedText !== null && copiedText === text

  useEffect(
    () => () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    },
    []
  )

  const handleCopy = async () => {
    if (!text) return
    await copyToClipboard(text)
    setCopiedText(text)
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopiedText(null), COPIED_RESET_MS)
  }

  const keys = heroKeys(mode, phase, error)
  const isRecording = phase === 'recording'
  const canInsert = phase === 'preview' && !insertBlocked
  const HeaderIcon = mode === 'extract' ? ScanText : Mic

  return (
    <div className='fixed inset-0 flex items-center justify-center z-[110] p-6'>
      <div
        className='absolute inset-0 bg-backdrop-medium backdrop-blur-xl animate-in fade-in duration-300'
        onClick={isRecording ? undefined : handleClose}
      />
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='local-ai-sheet-title'
        className='relative bg-bg-panel/95 backdrop-blur-3xl border border-border-primary rounded-[2rem] w-full max-w-md shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out flex flex-col'
      >
        <div className='absolute -top-32 -left-32 w-64 h-64 bg-accent-primary/10 blur-[80px] rounded-full pointer-events-none' />
        <div className='absolute -bottom-32 -right-32 w-64 h-64 bg-accent-primary/5 blur-[80px] rounded-full pointer-events-none' />
        <div className='bg-overlay-faint border-b border-overlay-soft flex items-center justify-between px-6 py-5 relative z-10'>
          <div className='flex items-center gap-3 min-w-0'>
            <div className='w-9 h-9 shrink-0 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary border border-accent-primary/20'>
              <HeaderIcon className='w-4 h-4' />
            </div>
            <div className='flex flex-col min-w-0'>
              <h2
                id='local-ai-sheet-title'
                className='text-text-primary font-black text-xl tracking-tighter leading-none'
              >
                {t(keys.title)}
              </h2>
              <span className='text-xs font-medium mt-1.5 text-text-tertiary'>
                {phase === 'preview' && insertBlocked ? t('localAi.conflictBlocked') : t(keys.subtitle)}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className='w-8 h-8 shrink-0 flex items-center justify-center bg-overlay-subtle hover:bg-overlay-medium text-text-tertiary hover:text-text-primary rounded-full transition-all active:scale-90 border border-overlay-soft'
            title={t('common.close')}
            aria-label={t('common.close')}
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <div className='px-6 py-5 relative z-10' aria-live='polite'>
          {isRecording && (
            <div className='flex flex-col items-center gap-2'>
              <div className='text-5xl font-mono font-black text-text-primary mb-3 tracking-tighter'>
                {formatTime(Math.floor(elapsed / 1000))}
              </div>
              <button
                onClick={handleStop}
                className='relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 bg-accent-danger shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                title={t('localAi.actions.stop')}
                aria-label={t('localAi.actions.stop')}
              >
                <div className='absolute inset-0 rounded-full animate-soft-ping' />
                <Square className='relative z-10 w-7 h-7 text-white fill-white' />
              </button>
            </div>
          )}

          {(phase === 'working' || phase === 'idle') && (
            <div className='flex flex-col gap-4 py-2' role='progressbar' aria-busy='true'>
              <div className='space-y-2.5' aria-hidden='true'>
                {[94, 100, 82, 58].map((width, index) => (
                  <div
                    key={width}
                    className='h-2.5 rounded-full bg-accent-primary/25 animate-pulse motion-reduce:animate-none'
                    style={{ width: `${width}%`, animationDelay: `${index * 180}ms` }}
                  />
                ))}
              </div>
              {pageProgress && (
                <span className='text-sm text-text-secondary'>
                  {t('localAi.extract.pageProgress', pageProgress)}
                </span>
              )}
            </div>
          )}

          {phase === 'preview' && (
            <div className='max-h-72 overflow-y-auto custom-scrollbar rounded-xl bg-bg-tertiary/40 border border-overlay-soft px-4 py-3'>
              <p className='text-sm leading-relaxed text-text-primary whitespace-pre-wrap select-text'>
                {text}
              </p>
            </div>
          )}

          {phase === 'error' && <div className='h-2' />}
        </div>

        {(phase === 'preview' || phase === 'error') && (
          <div className='flex gap-3 p-5 border-t border-overlay-soft bg-overlay-faint relative z-10'>
            <button
              onClick={handleAgain}
              className='flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-bg-tertiary/40 hover:bg-bg-tertiary/60 text-text-secondary hover:text-text-primary transition-all font-bold text-sm tracking-tight border border-overlay-soft active:scale-95'
            >
              <RotateCcw className='w-4 h-4' />
              {t(
                mode === 'dictate' && phase === 'preview'
                  ? 'localAi.actions.recordAgain'
                  : 'localAi.actions.again'
              )}
            </button>
            {phase === 'preview' && (
              <button
                onClick={handleCopy}
                className='flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-bg-tertiary/40 hover:bg-bg-tertiary/60 text-text-secondary hover:text-text-primary transition-all font-bold text-sm tracking-tight border border-overlay-soft active:scale-95'
                aria-live='polite'
              >
                {copied ? <Check className='w-4 h-4' /> : <Copy className='w-4 h-4' />}
                {copied ? t('localAi.actions.copied') : t('localAi.actions.copy')}
              </button>
            )}
            {phase === 'preview' && (
              <button
                onClick={handleInsert}
                disabled={!canInsert}
                className='flex-1 px-4 py-3 rounded-xl transition-all font-bold text-sm tracking-tight flex items-center justify-center shadow-lg active:scale-95 bg-accent-primary hover:bg-accent-primary/90 text-accent-on-primary shadow-accent-primary/20 disabled:opacity-40 disabled:cursor-not-allowed'
              >
                {t('localAi.actions.insert')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
