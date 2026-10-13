import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowUp,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  MessageCircleQuestion,
  Search,
  ShieldCheck,
  TextCursor,
  X
} from 'lucide-react'

import { ASK_KIND, ASK_QUESTION_MAX_CHARS } from '@pear-notes/core/store/services/localAiAsk.js'
import { SUMMARY_MAX_TRANSCRIPT_CHARS } from '@pear-notes/core/store/services/localAiPrompts.js'
import { getMeaningSearchReady } from '@pear-notes/core/store/slices/localAiSlice.js'
import { openAskVault } from '@pear-notes/core/store/slices/uiSlice.js'

import { canApplyAskTurn, useAskNote } from '../../hooks/useAskNote'

import LocalAiWorkProgress from './LocalAiWorkProgress'
import RewriteChanges from './RewriteChanges'

const NUMBER_FORMAT = new Intl.NumberFormat()
const APPLY_LABELS = {
  edits: { idle: 'localAi.ask.apply', done: 'localAi.ask.applied' },
  rewrite: { idle: 'localAi.ask.replaceSelection', done: 'localAi.ask.replaced' }
}
const passLanguage = (code) => code ?? ''

export default function AskNoteModal({
  noteKey,
  selectionText,
  noteText,
  insertBlocked,
  onApplyEdits,
  onClose
}) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const meaningReady = useSelector(getMeaningSearchReady)
  const threadRef = useRef(null)
  const inputRef = useRef(null)
  const {
    scope,
    scopeInfo,
    hasSelection,
    question,
    setQuestion,
    turns,
    earlier,
    workView,
    busy,
    canSend,
    droppedTurns,
    emptySource,
    copiedId,
    handleSend,
    handleToggleScope,
    handleApply,
    handleCopy,
    handleClear,
    handleClose
  } = useAskNote({ noteKey, selectionText, noteText, onApplyEdits, onClose })

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
  }, [earlier, turns, workView])

  useEffect(() => {
    if (!busy) inputRef.current?.focus()
  }, [busy])

  const handleInputKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    handleSend()
  }

  const scopeLabel = scopeInfo.truncated
    ? t('localAi.ask.scopeNoteLong', {
        characters: NUMBER_FORMAT.format(SUMMARY_MAX_TRANSCRIPT_CHARS)
      })
    : t(scope === 'selection' ? 'localAi.ask.scopeSelection' : 'localAi.ask.scopeNote', {
        count: scopeInfo.words
      })
  const ScopeIcon = scope === 'selection' ? TextCursor : FileText

  const renderEdits = (turn) => {
    const isRewrite = turn.kind === ASK_KIND.REWRITE
    const disabled = turn.applied || insertBlocked || busy
    return (
      <div className='flex flex-col gap-2.5'>
        <p className='text-sm font-bold text-text-primary'>
          {isRewrite
            ? t('localAi.ask.rewriteTitle')
            : t('localAi.ask.editsTitle', { count: turn.edits.length })}
        </p>
        <RewriteChanges diff={turn.diff} resultText={turn.editedText} showFixCount={false} />
        {insertBlocked && !turn.applied && (
          <p className='text-xs text-text-tertiary'>{t('localAi.conflictBlocked')}</p>
        )}
        <button
          onClick={() => handleApply(turn.id)}
          disabled={disabled}
          className={`self-start flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:cursor-not-allowed ${
            turn.applied
              ? 'bg-accent-success/10 text-accent-success'
              : 'bg-accent-primary text-accent-on-primary hover:bg-accent-primary/90 disabled:opacity-40'
          }`}
        >
          {turn.applied && <CheckCircle2 className='w-4 h-4' />}
          {t(APPLY_LABELS[isRewrite ? 'rewrite' : 'edits'][turn.applied ? 'done' : 'idle'])}
        </button>
      </div>
    )
  }

  const renderAnswer = (turn) => {
    const notFound = turn.kind === ASK_KIND.NOT_FOUND
    const copied = copiedId === turn.id
    const answer = turn.error
      ? t(`localAi.ask.errors.${turn.error}`)
      : turn.answer || t(notFound ? 'localAi.ask.notFoundFallback' : 'localAi.ask.errors.failed')
    return (
      <div
        className={`flex flex-col gap-2 rounded-xl border border-overlay-soft px-4 py-3 ${
          notFound ? 'bg-overlay-subtle' : 'bg-bg-tertiary/40'
        }`}
      >
        <p
          className={`text-sm leading-relaxed whitespace-pre-wrap select-text ${
            notFound ? 'text-text-secondary' : 'text-text-primary'
          }`}
        >
          {answer}
        </p>
        {notFound && meaningReady && (
          <button
            onClick={() => {
              handleClose()
              dispatch(openAskVault({ question: turn.question }))
            }}
            className='self-start flex items-center gap-1.5 text-xs font-bold text-accent-primary hover:underline'
          >
            <Search className='w-3.5 h-3.5' />
            {t('localAi.askVault.searchAllNotes')}
          </button>
        )}
        {!notFound && turn.answer && (
          <button
            onClick={() => handleCopy(turn.id)}
            className='self-start flex items-center gap-1.5 text-xs font-bold text-text-tertiary hover:text-text-primary transition-colors'
          >
            {copied ? <Check className='w-3.5 h-3.5' /> : <Copy className='w-3.5 h-3.5' />}
            {t(copied ? 'localAi.actions.copied' : 'localAi.actions.copy')}
          </button>
        )}
      </div>
    )
  }

  const renderResult = (turn) => {
    if (turn.readOnly && (turn.kind === ASK_KIND.EDITS || turn.kind === ASK_KIND.REWRITE)) {
      return (
        <p className='text-xs text-text-tertiary'>
          {t(turn.applied ? 'localAi.ask.earlierChangeApplied' : 'localAi.ask.earlierChange')}
        </p>
      )
    }
    if (turn.status === 'working') {
      return workView ? <LocalAiWorkProgress view={workView} languageName={passLanguage} /> : null
    }
    if (turn.status === 'failed') {
      return (
        <p className='flex items-center gap-2 text-sm text-accent-danger'>
          <AlertTriangle className='w-4 h-4 shrink-0' />
          {t(`localAi.ask.errors.${turn.error}`)}
        </p>
      )
    }
    if (turn.diff && canApplyAskTurn(turn, scope)) {
      return renderEdits(turn)
    }
    return renderAnswer(turn)
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
    <div className='fixed inset-0 flex items-center justify-center z-[110] p-6'>
      <div
        className='absolute inset-0 bg-backdrop-medium backdrop-blur-xl animate-in fade-in duration-300'
        onClick={handleClose}
      />
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='ask-note-title'
        className='relative bg-bg-panel/95 backdrop-blur-3xl border border-border-primary rounded-[2rem] w-full max-w-xl max-h-[85vh] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out flex flex-col'
      >
        <div className='bg-overlay-faint border-b border-overlay-soft flex items-center justify-between px-6 py-5 shrink-0'>
          <div className='flex items-center gap-3 min-w-0'>
            <div className='w-9 h-9 shrink-0 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary border border-accent-primary/20'>
              <MessageCircleQuestion className='w-4 h-4' />
            </div>
            <div className='flex flex-col min-w-0'>
              <h2
                id='ask-note-title'
                className='text-text-primary font-black text-xl tracking-tighter leading-none'
              >
                {t(scope === 'selection' ? 'localAi.ask.titleSelection' : 'localAi.ask.titleNote')}
              </h2>
              <span className='text-xs font-medium mt-1.5 text-text-tertiary flex items-center gap-1'>
                {busy && <ShieldCheck className='w-3 h-3 shrink-0' aria-hidden='true' />}
                {busy
                  ? t('localAi.work.onDevice')
                  : t(
                      scope === 'selection'
                        ? 'localAi.ask.subtitleSelection'
                        : 'localAi.ask.subtitleNote'
                    )}
              </span>
            </div>
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            {(earlier.length > 0 || turns.length > 0) && (
              <button
                onClick={handleClear}
                disabled={busy}
                className='px-3 h-8 rounded-full text-xs font-bold text-text-tertiary enabled:hover:text-text-primary enabled:hover:bg-overlay-subtle transition-colors disabled:opacity-40'
              >
                {t('localAi.ask.clear')}
              </button>
            )}
            <button
              onClick={handleClose}
              className='w-8 h-8 shrink-0 flex items-center justify-center bg-overlay-subtle hover:bg-overlay-medium text-text-tertiary hover:text-text-primary rounded-full transition-all active:scale-90 border border-overlay-soft'
              title={t('common.close')}
              aria-label={t('common.close')}
            >
              <X className='w-4 h-4' />
            </button>
          </div>
        </div>

        <div className='flex flex-col gap-4 px-6 py-5 min-h-0'>
          <button
            onClick={handleToggleScope}
            disabled={!hasSelection || busy}
            title={hasSelection ? t('localAi.ask.scopeSwitchHint') : undefined}
            className='self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-overlay-subtle border border-overlay-soft text-xs font-bold text-text-secondary enabled:hover:bg-overlay-medium transition-colors disabled:cursor-default'
          >
            <ScopeIcon className='w-3.5 h-3.5' />
            {scopeLabel}
            {hasSelection && <ArrowLeftRight className='w-3.5 h-3.5' />}
          </button>

          {(earlier.length > 0 || turns.length > 0) && (
            <div
              ref={threadRef}
              className='flex flex-col gap-5 overflow-y-auto custom-scrollbar min-h-0 max-h-[50vh] pr-1'
              aria-live='polite'
            >
              {earlier.length > 0 && (
                <p className='text-xs font-bold text-text-tertiary'>{t('localAi.ask.earlier')}</p>
              )}
              {earlier.map(renderTurn)}
              {earlier.length > 0 && turns.length > 0 && (
                <div className='border-t border-overlay-soft' />
              )}
              {turns.map(renderTurn)}
            </div>
          )}

          {droppedTurns && (
            <p className='text-xs text-text-tertiary'>{t('localAi.ask.droppedTurns')}</p>
          )}

          {emptySource && (
            <p className='text-xs text-text-tertiary'>
              {t(scope === 'selection' ? 'localAi.ask.emptySelection' : 'localAi.ask.emptyNote')}
            </p>
          )}

          <div className='flex items-end gap-2'>
            <textarea
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={busy}
              rows={1}
              maxLength={ASK_QUESTION_MAX_CHARS}
              placeholder={t(
                turns.length > 0 ? 'localAi.ask.followUpPlaceholder' : 'localAi.ask.placeholder'
              )}
              aria-label={t('localAi.ask.inputLabel')}
              className='flex-1 resize-none field-sizing-content max-h-32 min-h-11 px-4 py-2.5 rounded-xl bg-bg-tertiary/40 border border-overlay-soft text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/50 disabled:opacity-60'
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              aria-label={t('localAi.ask.send')}
              title={t('localAi.ask.send')}
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
