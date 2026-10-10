import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import {
  AlertTriangle,
  ArrowUp,
  Check,
  CheckCircle2,
  Copy,
  FilePlus2,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react'

import { ASK_QUESTION_MAX_CHARS } from '@pear-notes/core/store/services/localAiAsk.js'
import { toMeaningSnippet } from '@pear-notes/core/store/services/localAiSearch.js'
import { VAULT_ASK_KIND } from '@pear-notes/core/store/services/localAiVaultAsk.js'
import { selectNote } from '@pear-notes/core/store/slices/notesSlice.js'

import { useAskVault } from '../../hooks/useAskVault'

import LocalAiWorkProgress from './LocalAiWorkProgress'

const CITATION = /\[(\d{1,2})\]/g
const passLanguage = (code) => code ?? ''

export default function AskVaultModal({ initialQuestion, onOpenSettings, onClose }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const threadRef = useRef(null)
  const inputRef = useRef(null)
  const {
    question,
    setQuestion,
    turns,
    workView,
    busy,
    ready,
    meaningReady,
    canSend,
    copiedId,
    savedId,
    handleSend,
    handleCopy,
    handleSave,
    handleClose
  } = useAskVault({
    initialQuestion,
    sourcesLabel: t('localAi.askVault.sources'),
    onClose
  })

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  useEffect(() => {
    const thread = threadRef.current
    if (thread) thread.scrollTop = thread.scrollHeight
  }, [turns, workView])

  useEffect(() => {
    if (!busy) inputRef.current?.focus()
  }, [busy])

  const openNote = (noteKey) => {
    dispatch(selectNote(noteKey))
    handleClose()
  }

  const handleInputKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    handleSend()
  }

  const renderAnswerText = (turn) => {
    const byNumber = new Map(turn.sources.map((source) => [source.n, source]))
    const parts = []
    let last = 0
    for (const match of turn.result.answer.matchAll(CITATION)) {
      const source = byNumber.get(Number(match[1]))
      if (match.index > last) parts.push(turn.result.answer.slice(last, match.index))
      parts.push(
        source ? (
          <button
            key={`${turn.id}-${match.index}`}
            onClick={() => openNote(source.noteKey)}
            title={source.title || t('activity.untitledNote')}
            className='inline-flex items-center justify-center min-w-5 h-5 px-1 mx-0.5 rounded-md bg-accent-primary/10 text-accent-primary text-[11px] font-bold align-baseline hover:bg-accent-primary/20'
          >
            {match[1]}
          </button>
        ) : (
          match[0]
        )
      )
      last = match.index + match[0].length
    }
    if (last < turn.result.answer.length) parts.push(turn.result.answer.slice(last))
    return parts
  }

  const renderSources = (turn) => {
    const cited = new Set(turn.result.citations.map((citation) => citation.n))
    const shown = cited.size
      ? turn.sources.filter((source) => cited.has(source.n))
      : turn.sources.slice(0, 3)
    if (!shown.length) return null
    return (
      <div className='flex flex-col gap-1'>
        <p className='text-[11px] font-bold uppercase tracking-wide text-text-tertiary'>
          {t(cited.size ? 'localAi.askVault.sources' : 'localAi.askVault.relatedNotes')}
        </p>
        {shown.map((source) => (
          <button
            key={`${turn.id}-${source.n}`}
            onClick={() => openNote(source.noteKey)}
            className='flex flex-col items-start gap-0.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-overlay-subtle transition-colors'
          >
            <span className='text-xs font-bold text-text-primary'>
              {cited.size ? `[${source.n}] ` : ''}
              {source.title || t('activity.untitledNote')}
            </span>
            <span className='text-xs text-text-tertiary line-clamp-2'>
              {toMeaningSnippet(source.text)}
            </span>
          </button>
        ))}
      </div>
    )
  }

  const renderResult = (turn) => {
    if (turn.status === 'working') {
      return workView ? <LocalAiWorkProgress view={workView} languageName={passLanguage} /> : null
    }
    if (turn.status === 'failed') {
      return (
        <p className='flex items-center gap-2 text-sm text-accent-danger'>
          <AlertTriangle className='w-4 h-4 shrink-0' />
          {t(`localAi.askVault.errors.${turn.error}`)}
        </p>
      )
    }
    if (turn.result.kind === VAULT_ASK_KIND.NOT_FOUND) {
      return (
        <div className='flex flex-col gap-2 rounded-xl border border-overlay-soft px-4 py-3 bg-overlay-subtle'>
          <p className='text-sm text-text-secondary'>{t('localAi.askVault.notFound')}</p>
          {renderSources(turn)}
        </div>
      )
    }
    const copied = copiedId === turn.id
    const saved = savedId === turn.id
    return (
      <div className='flex flex-col gap-3 rounded-xl border border-overlay-soft px-4 py-3 bg-bg-tertiary/40'>
        <p className='text-sm leading-relaxed whitespace-pre-wrap select-text text-text-primary'>
          {renderAnswerText(turn)}
        </p>
        {!turn.result.verified && (
          <p className='text-xs text-text-tertiary'>{t('localAi.askVault.unverified')}</p>
        )}
        {renderSources(turn)}
        <div className='flex items-center gap-4'>
          <button
            onClick={() => handleCopy(turn.id)}
            className='flex items-center gap-1.5 text-xs font-bold text-text-tertiary hover:text-text-primary transition-colors'
          >
            {copied ? <Check className='w-3.5 h-3.5' /> : <Copy className='w-3.5 h-3.5' />}
            {t(copied ? 'localAi.actions.copied' : 'localAi.actions.copy')}
          </button>
          <button
            onClick={() => handleSave(turn.id)}
            disabled={saved}
            className='flex items-center gap-1.5 text-xs font-bold text-text-tertiary enabled:hover:text-text-primary transition-colors disabled:text-accent-success'
          >
            {saved ? (
              <CheckCircle2 className='w-3.5 h-3.5' />
            ) : (
              <FilePlus2 className='w-3.5 h-3.5' />
            )}
            {t(saved ? 'localAi.askVault.saved' : 'localAi.askVault.saveAsNote')}
          </button>
        </div>
      </div>
    )
  }

  const renderTurn = (turn) => (
    <div key={turn.id} className='flex flex-col gap-2.5'>
      <p className='self-end max-w-[85%] px-3.5 py-2 rounded-2xl bg-accent-primary text-accent-on-primary text-sm font-medium whitespace-pre-wrap'>
        {turn.question}
      </p>
      {renderResult(turn)}
    </div>
  )

  return (
    <div className='fixed inset-0 flex items-start justify-center z-[110] p-6 pt-[12vh]'>
      <div
        className='absolute inset-0 bg-backdrop-medium backdrop-blur-xl animate-in fade-in duration-300'
        onClick={handleClose}
      />
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='ask-vault-title'
        className='relative bg-bg-panel/95 backdrop-blur-3xl border border-border-primary rounded-[2rem] w-full max-w-2xl max-h-[76vh] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-300 ease-out flex flex-col'
      >
        <div className='bg-overlay-faint border-b border-overlay-soft flex items-center justify-between px-6 py-5 shrink-0'>
          <div className='flex items-center gap-3 min-w-0'>
            <div className='w-9 h-9 shrink-0 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary border border-accent-primary/20'>
              <Sparkles className='w-4 h-4' />
            </div>
            <div className='flex flex-col min-w-0'>
              <h2
                id='ask-vault-title'
                className='text-text-primary font-black text-xl tracking-tighter leading-none'
              >
                {t('localAi.askVault.title')}
              </h2>
              <span className='text-xs font-medium mt-1.5 text-text-tertiary flex items-center gap-1'>
                {busy && <ShieldCheck className='w-3 h-3 shrink-0' aria-hidden='true' />}
                {t(busy ? 'localAi.work.onDevice' : 'localAi.askVault.subtitle')}
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

        <div className='flex flex-col gap-4 px-6 py-5 min-h-0'>
          {!ready && (
            <div className='flex flex-col gap-2 rounded-xl border border-overlay-soft px-4 py-3 bg-overlay-subtle'>
              <p className='text-sm text-text-secondary'>
                {t(meaningReady ? 'localAi.askVault.askNotReady' : 'localAi.askVault.notReady')}
              </p>
              <button
                onClick={() => {
                  handleClose()
                  onOpenSettings()
                }}
                className='self-start text-xs font-bold text-accent-primary hover:underline'
              >
                {t('localAi.askVault.openSettings')}
              </button>
            </div>
          )}

          {turns.length > 0 && (
            <div
              ref={threadRef}
              className='flex flex-col gap-5 overflow-y-auto custom-scrollbar min-h-0 max-h-[50vh] pr-1'
              aria-live='polite'
            >
              {turns.map(renderTurn)}
            </div>
          )}

          <div className='flex items-end gap-2'>
            <textarea
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={busy || !ready}
              rows={1}
              maxLength={ASK_QUESTION_MAX_CHARS}
              placeholder={t(
                turns.length > 0
                  ? 'localAi.askVault.followUpPlaceholder'
                  : 'localAi.askVault.placeholder'
              )}
              aria-label={t('localAi.askVault.inputLabel')}
              className='flex-1 resize-none field-sizing-content max-h-32 min-h-11 px-4 py-2.5 rounded-xl bg-bg-tertiary/40 border border-overlay-soft text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/50 disabled:opacity-60'
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              aria-label={t('localAi.askVault.send')}
              title={t('localAi.askVault.send')}
              className='w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-accent-primary text-accent-on-primary hover:bg-accent-primary/90 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'
            >
              <ArrowUp className='w-4 h-4' strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
