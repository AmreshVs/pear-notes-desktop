import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlignLeft,
  Briefcase,
  Check,
  Copy,
  Languages,
  List,
  Mic,
  Minimize2,
  Paperclip,
  RotateCcw,
  ScanText,
  ShieldCheck,
  Smile,
  Sparkles,
  SpellCheck,
  Square,
  Type,
  Wand2,
  X
} from 'lucide-react'

import { formatBytes } from '@pear-notes/core/utils.js'

import { useLocalAiSheet } from '../../hooks/useLocalAiSheet'
import { copyToClipboard } from '../../lib/clipboard'
import { formatTime } from '../../utils/formatters'

import LocalAiShimmer from './LocalAiShimmer'
import LocalAiWorkProgress from './LocalAiWorkProgress'
import RewriteChanges from './RewriteChanges'

const COPIED_RESET_MS = 2000
const REPORT_EMAIL = 'vsamreshpro@gmail.com'

const NOTE_TASK_ERRORS = { empty: 'emptyNote', failed: 'failedNoteTask' }
const SELECTION_ERRORS = { empty: 'emptySelection', tooLong: 'selectionTooLong' }

const ERROR_KEY_OVERRIDES = {
  extract: { empty: 'emptyImage', failed: 'failedExtract' },
  describe: { empty: 'emptyDescribe', failed: 'failedDescribe' },
  translate: {
    empty: 'emptyTranslate',
    failed: 'failedTranslate',
    noSpace: 'noSpace',
    downloadFailed: 'failedDownload'
  },
  summarizeNote: NOTE_TASK_ERRORS,
  suggestTitle: NOTE_TASK_ERRORS,
  keyPoints: NOTE_TASK_ERRORS,
  fixGrammar: NOTE_TASK_ERRORS,
  rewrite: NOTE_TASK_ERRORS,
  makeShorter: NOTE_TASK_ERRORS,
  makeProfessional: NOTE_TASK_ERRORS,
  makeFriendly: NOTE_TASK_ERRORS
}

const SELECTION_HERO_BASE = {
  summarizeNote: 'summarizeSelection',
  keyPoints: 'keyPointsSelection',
  translate: 'translateSelection'
}

const HEADER_ICONS = {
  extract: ScanText,
  describe: Sparkles,
  translate: Languages,
  summarizeNote: AlignLeft,
  suggestTitle: Type,
  keyPoints: List,
  fixGrammar: SpellCheck,
  rewrite: Wand2,
  makeShorter: Minimize2,
  makeProfessional: Briefcase,
  makeFriendly: Smile
}

const REPORTABLE_MODES = ['describe', 'translate', 'suggestTitle', 'keyPoints']

const SELECT_CLASS =
  'w-full px-3 py-2 rounded-xl bg-bg-tertiary/40 border border-overlay-soft text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40 disabled:opacity-50'

const SECONDARY_BUTTON_CLASS =
  'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-bg-tertiary/40 hover:bg-bg-tertiary/60 text-text-secondary hover:text-text-primary transition-all font-bold text-sm tracking-tight border border-overlay-soft active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'

const PRIMARY_BUTTON_CLASS =
  'flex-1 px-4 py-3 rounded-xl transition-all font-bold text-sm tracking-tight flex items-center justify-center shadow-lg active:scale-95 bg-accent-primary hover:bg-accent-primary/90 text-accent-on-primary shadow-accent-primary/20 disabled:opacity-40 disabled:cursor-not-allowed'

function heroKeys(mode, phase, error, scope) {
  if (phase === 'error') {
    const errorKey =
      (scope === 'selection' && SELECTION_ERRORS[error]) || ERROR_KEY_OVERRIDES[mode]?.[error] || error
    return { title: `localAi.errors.${errorKey}.title`, subtitle: `localAi.errors.${errorKey}.subtitle` }
  }
  const base = (scope === 'selection' && SELECTION_HERO_BASE[mode]) || mode
  const visiblePhase = phase === 'idle' ? (mode === 'dictate' ? 'recording' : 'working') : phase
  return {
    title: `localAi.${base}.${visiblePhase}.title`,
    subtitle: `localAi.${base}.${visiblePhase}.subtitle`
  }
}

export default function LocalAiSheetModal({
  request,
  insertBlocked,
  summaryAvailable = false,
  onInsert,
  onAttachAudio,
  onClose
}) {
  const { t } = useTranslation()
  const {
    mode,
    phase,
    error,
    text,
    elapsed,
    workView,
    summary,
    summaryPhase,
    scope,
    canReplace,
    isRewrite,
    rewriteDiff,
    sourceLanguage,
    targetLanguage,
    translateLanguages,
    downloadProgress,
    noSpaceBytes,
    handleChooseTarget,
    handleChooseSource,
    handleDownloadNow,
    handleStop,
    handleAgain,
    handleSummarize,
    handleClose,
    handleInsert,
    hasSavedAudio,
    canAttachAudio,
    handleRetrySavedAudio,
    handleAttachAudio
  } = useLocalAiSheet(request, { onInsert, onAttachAudio, onClose })
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

  const languageName = (code) => {
    if (!code) return ''
    return code === 'en' ? t('localAi.translate.english') : t(`settings.onDeviceAi.languages.${code}`)
  }

  const heroParams = {
    language: languageName(targetLanguage),
    percent: downloadProgress.percent,
    size: formatBytes(phase === 'error' ? noSpaceBytes : downloadProgress.missingBytes)
  }
  const keys = heroKeys(mode, phase, error, scope)
  const isRecording = phase === 'recording'
  const isBusy = phase === 'working'
  const canInsert = phase === 'preview' && !insertBlocked && summaryPhase !== 'working'
  const canSummarize = summaryAvailable && mode === 'transcribe' && phase === 'preview'
  const showReportLink = REPORTABLE_MODES.includes(mode) || canReplace || !!summary
  const rewriteUnchanged = phase === 'preview' && !!rewriteDiff?.unchanged
  const isWorking = phase === 'working' || (phase === 'idle' && mode !== 'dictate')
  const showGeneratedDisclaimer =
    (mode === 'keyPoints' || mode === 'suggestTitle' || canReplace) && !rewriteUnchanged
  const insertLabel =
    mode === 'suggestTitle'
      ? 'localAi.actions.useTitle'
      : scope === 'selection'
        ? 'localAi.actions.insertBelow'
        : 'localAi.actions.insert'
  const HeaderIcon = HEADER_ICONS[mode] ?? Mic

  const copyButton = (
    <button
      onClick={handleCopy}
      className='flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-bg-tertiary/40 hover:bg-bg-tertiary/60 text-text-secondary hover:text-text-primary transition-all font-bold text-sm tracking-tight border border-overlay-soft active:scale-95'
      aria-live='polite'
    >
      {copied ? <Check className='w-4 h-4' /> : <Copy className='w-4 h-4' />}
      {copied ? t('localAi.actions.copied') : t('localAi.actions.copy')}
    </button>
  )

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
        className={`relative bg-bg-panel/95 backdrop-blur-3xl border border-border-primary rounded-[2rem] w-full ${isRewrite ? 'max-w-xl' : 'max-w-md'} shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out flex flex-col`}
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
                {rewriteUnchanged
                  ? t('localAi.rewriteChanges.noChangesTitle')
                  : t(keys.title, heroParams)}
              </h2>
              <span className='text-xs font-medium mt-1.5 text-text-tertiary flex items-center gap-1'>
                {isWorking && <ShieldCheck className='w-3 h-3 shrink-0' aria-hidden='true' />}
                {isWorking
                  ? t('localAi.work.onDevice')
                  : rewriteUnchanged
                  ? t('localAi.rewriteChanges.noChangesSubtitle')
                  : phase === 'preview' && insertBlocked
                    ? t('localAi.conflictBlocked')
                    : t(keys.subtitle, heroParams)}
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
          {mode === 'translate' && sourceLanguage && phase !== 'error' && (
            <div className='grid grid-cols-2 gap-3 mb-4'>
              <label className='flex flex-col gap-1.5 text-xs font-bold text-text-tertiary'>
                {t('localAi.translate.from')}
                <select
                  value={sourceLanguage}
                  disabled={isBusy}
                  onChange={(event) => handleChooseSource(event.target.value)}
                  className={SELECT_CLASS}
                >
                  {translateLanguages.map((code) => (
                    <option key={code} value={code}>
                      {languageName(code)}
                    </option>
                  ))}
                </select>
              </label>
              <label className='flex flex-col gap-1.5 text-xs font-bold text-text-tertiary'>
                {t('localAi.translate.to')}
                <select
                  value={targetLanguage ?? ''}
                  disabled={isBusy}
                  onChange={(event) => handleChooseTarget(event.target.value)}
                  className={SELECT_CLASS}
                >
                  {!targetLanguage && <option value='' disabled />}
                  {translateLanguages
                    .filter((code) => code !== sourceLanguage)
                    .map((code) => (
                      <option key={code} value={code}>
                        {languageName(code)}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          )}

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

          {phase === 'downloading' && (
            <div
              className='py-2'
              role='progressbar'
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={downloadProgress.percent}
            >
              <div className='h-1.5 rounded-full bg-overlay-medium overflow-hidden'>
                <div
                  className='h-full rounded-full bg-accent-primary transition-all'
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          {phase === 'working' && workView && (
            <LocalAiWorkProgress view={workView} languageName={languageName} />
          )}

          {((phase === 'working' && !workView) || phase === 'idle') && (
            <div className='flex flex-col gap-4 py-2' role='progressbar' aria-busy='true'>
              <LocalAiShimmer />
            </div>
          )}

          {phase === 'preview' && rewriteDiff && (
            <RewriteChanges
              key={text}
              diff={rewriteDiff}
              resultText={text}
              showFixCount={mode === 'fixGrammar'}
            />
          )}

          {phase === 'preview' && !rewriteDiff && (
            <div className='max-h-72 overflow-y-auto custom-scrollbar rounded-xl bg-bg-tertiary/40 border border-overlay-soft px-4 py-3'>
              {mode !== 'summarizeNote' && (
                <p
                  className={
                    mode === 'suggestTitle'
                      ? 'text-lg font-bold leading-snug text-text-primary select-text'
                      : 'text-sm leading-relaxed text-text-primary whitespace-pre-wrap select-text'
                  }
                >
                  {text}
                </p>
              )}
              {summary && (
                <div
                  className={`space-y-1.5 select-text ${mode === 'summarizeNote' ? '' : 'mt-3 pt-3 border-t border-overlay-soft'}`}
                >
                  {summary.summary && (
                    <>
                      <p className='text-sm font-bold text-text-primary'>{t('localAi.summary.title')}</p>
                      <p className='text-sm leading-relaxed text-text-primary'>{summary.summary}</p>
                    </>
                  )}
                  {summary.actionItems.length > 0 && (
                    <>
                      <p className='text-sm font-bold text-text-primary pt-1'>
                        {t('localAi.summary.actionItems')}
                      </p>
                      <ul className='list-disc pl-5 space-y-1'>
                        {summary.actionItems.map((item, index) => (
                          <li key={index} className='text-sm leading-relaxed text-text-primary'>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {phase === 'preview' && summaryPhase === 'working' && (
            <div className='mt-4 space-y-2' role='progressbar' aria-busy='true'>
              {[88, 64].map((width, index) => (
                <div
                  key={width}
                  className='h-2 rounded-full bg-accent-primary/25 animate-pulse motion-reduce:animate-none'
                  style={{ width: `${width}%`, animationDelay: `${index * 180}ms` }}
                />
              ))}
              <p className='text-sm text-text-secondary'>{t('localAi.summary.working')}</p>
            </div>
          )}

          {phase === 'preview' && summary && (
            <p className='mt-2 text-xs text-text-tertiary'>{t('localAi.summary.disclaimer')}</p>
          )}

          {phase === 'preview' && showGeneratedDisclaimer && (
            <p className='mt-2 text-xs text-text-tertiary'>{t('localAi.generatedDisclaimer')}</p>
          )}

          {phase === 'preview' && showReportLink && (
            <button
              onClick={() =>
                window.electronBridge.openExternal(
                  `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(t('localAi.reportSubject'))}`
                )
              }
              className='mt-2 text-xs font-bold text-accent-primary hover:underline'
            >
              {t('localAi.actions.reportProblem')}
            </button>
          )}

          {phase === 'preview' && summaryPhase === 'failed' && (
            <p className='mt-3 text-sm text-accent-danger'>{t('localAi.summary.failed')}</p>
          )}

          {canSummarize && !summary && summaryPhase !== 'working' && (
            <button
              onClick={handleSummarize}
              className='mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-primary/10 text-accent-primary text-sm font-bold hover:bg-accent-primary/20 transition-colors active:scale-95'
            >
              <Sparkles className='w-4 h-4' />
              {t('localAi.summary.action')}
            </button>
          )}

          {phase === 'error' && <div className='h-2' />}
        </div>

        {(phase === 'preview' || phase === 'error' || phase === 'waiting') && (
          <div className='flex gap-3 p-5 border-t border-overlay-soft bg-overlay-faint relative z-10'>
            {phase === 'waiting' ? (
              <button onClick={handleDownloadNow} className={PRIMARY_BUTTON_CLASS}>
                {t('localAi.actions.downloadNow')}
              </button>
            ) : phase === 'error' && hasSavedAudio ? (
              <>
                {canAttachAudio && (
                  <button onClick={handleAttachAudio} className={SECONDARY_BUTTON_CLASS}>
                    <Paperclip className='w-4 h-4' />
                    {t('localAi.actions.attachAudio')}
                  </button>
                )}
                <button onClick={handleRetrySavedAudio} className={PRIMARY_BUTTON_CLASS}>
                  {t('localAi.actions.again')}
                </button>
              </>
            ) : rewriteUnchanged ? (
              <button onClick={handleClose} className={PRIMARY_BUTTON_CLASS}>
                {t('common.close')}
              </button>
            ) : phase === 'preview' && canReplace ? (
              <>
                {copyButton}
                <button
                  onClick={() => handleInsert('insert')}
                  disabled={!canInsert}
                  className={SECONDARY_BUTTON_CLASS}
                >
                  {t('localAi.actions.insertBelow')}
                </button>
                <button
                  onClick={() => handleInsert('replace')}
                  disabled={!canInsert}
                  className={PRIMARY_BUTTON_CLASS}
                >
                  {t('localAi.actions.replace')}
                </button>
              </>
            ) : (
              <>
                <button onClick={handleAgain} className={SECONDARY_BUTTON_CLASS}>
                  <RotateCcw className='w-4 h-4' />
                  {t(
                    mode === 'dictate' && phase === 'preview'
                      ? 'localAi.actions.recordAgain'
                      : 'localAi.actions.again'
                  )}
                </button>
                {phase === 'preview' && copyButton}
                {phase === 'preview' && (
                  <button
                    onClick={() => handleInsert('insert')}
                    disabled={!canInsert}
                    className={PRIMARY_BUTTON_CLASS}
                  >
                    {t(insertLabel)}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
