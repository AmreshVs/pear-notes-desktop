import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  CornerDownRight,
  FilePlus2,
  Lock,
  Search,
  Sparkles
} from 'lucide-react'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import { ASK_QUESTION_MAX_CHARS } from '@pear-notes/core/store/services/localAiAsk.js'
import { isIndexable } from '@pear-notes/core/store/services/localAiIndex.js'
import { toMeaningSnippet } from '@pear-notes/core/store/services/localAiSearch.js'
import { VAULT_ASK_KIND } from '@pear-notes/core/store/services/localAiVaultAsk.js'
import { taskDoneId } from '@pear-notes/core/store/services/noteTasks.js'
import { loadDoneIds } from '@pear-notes/core/store/services/upcomingTasks.js'
import { getFolders, getSelectedFolder } from '@pear-notes/core/store/slices/foldersSlice.js'
import { selectAskIndexNotice } from '@pear-notes/core/store/slices/localAiSlice.js'
import { getNotesData, selectNote } from '@pear-notes/core/store/slices/notesSlice.js'

import { useAskVault } from '../../hooks/useAskVault'
import { useLocalToggle } from '../../hooks/useLocalToggle'
import { REMINDERS_TOGGLE_KEY } from '../../hooks/useReminders'

import AskVaultSearchResults from './AskVaultSearchResults'
import LocalAiWorkProgress from './LocalAiWorkProgress'

const CITATION = /\[(\d{1,2})\]/g
const IS_MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
const SHORTCUT = IS_MAC ? '⌘ K' : 'Ctrl K'
const SUGGESTION_TITLE_MAX = 40
const DAY_MS = 24 * 60 * 60 * 1000
const passLanguage = (code) => code ?? ''

const KBD =
  'shrink-0 text-[11px] font-semibold text-text-tertiary border border-overlay-medium rounded-md px-1.5 py-px'
const ACTION =
  'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold border transition-colors'
const SECONDARY_ACTION = `${ACTION} bg-overlay-subtle border-overlay-soft text-text-primary hover:bg-overlay-medium`

function indexNoticeText(t, notice) {
  if (notice.kind === 'indexing') {
    return notice.total
      ? t('localAi.askVault.indexNotice.indexing', { done: notice.done, total: notice.total })
      : t('localAi.askVault.indexNotice.indexingStart')
  }
  if (notice.kind === 'charging') {
    return t('localAi.askVault.indexNotice.charging', { count: notice.total })
  }
  return t(`localAi.askVault.indexNotice.${notice.kind}`)
}

const isoToday = () => {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const shortTitle = (title) =>
  title.length > SUGGESTION_TITLE_MAX ? `${title.slice(0, SUGGESTION_TITLE_MAX - 1)}…` : title

export default function AskVaultModal({ initialQuestion, onOpenSettings, onClose }) {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const threadRef = useRef(null)
  const inputRef = useRef(null)
  const firstResultRef = useRef(null)
  const indexNotice = useSelector(selectAskIndexNotice)
  const notesData = useSelector(getNotesData)
  const folders = useSelector(getFolders)
  const selectedFolder = useSelector(getSelectedFolder)
  const [remindersOn, toggleReminders] = useLocalToggle(REMINDERS_TOGGLE_KEY, false)
  const [mode, setMode] = useState('ask')
  const [scope, setScope] = useState(ALL_NOTES_KEY)
  const [searchQuery, setSearchQuery] = useState('')
  const [upcoming, setUpcoming] = useState([])
  const folderById = useMemo(
    () =>
      new Map(folders.filter((folder) => !folder.isSystem).map((folder) => [folder.id, folder])),
    [folders]
  )
  const currentFolder = folderById.get(selectedFolder) ?? null
  const scopeKey = scope !== ALL_NOTES_KEY && !folderById.has(scope) ? ALL_NOTES_KEY : scope
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
    scope: scopeKey,
    sourcesLabel: t('localAi.askVault.sources'),
    onClose
  })

  const scopedNotes = useMemo(
    () =>
      Object.entries(notesData ?? {}).filter(
        ([, note]) =>
          isIndexable(note) && (scopeKey === ALL_NOTES_KEY || note.folderKey === scopeKey)
      ),
    [notesData, scopeKey]
  )

  const suggestions = useMemo(() => {
    const recent = scopedNotes
      .filter(([, note]) => note.title?.trim())
      .sort(([, a], [, b]) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .map(([, note]) => shortTitle(note.title.trim()))
    const titles = [...new Set(recent)]
    const counts = new Map()
    for (const [, note] of scopedNotes) {
      if (folderById.has(note.folderKey)) {
        counts.set(note.folderKey, (counts.get(note.folderKey) ?? 0) + 1)
      }
    }
    const [topFolder] = [...counts.entries()].sort((a, b) => b[1] - a[1])
    const folderName = folderById.get(scopeKey)?.name ?? folderById.get(topFolder?.[0])?.name
    return [
      titles[0] && t('localAi.askVault.suggest.note', { title: titles[0] }),
      titles[1] && t('localAi.askVault.suggest.keyPoints', { title: titles[1] }),
      folderName
        ? t('localAi.askVault.suggest.folder', { folder: folderName })
        : titles[2] && t('localAi.askVault.suggest.note', { title: titles[2] })
    ].filter(Boolean)
  }, [folderById, scopeKey, scopedNotes, t])

  useEffect(() => {
    inputRef.current?.focus()
  }, [mode])

  useEffect(() => {
    let live = true
    Promise.all([backendApi.getUpcomingTasks(), loadDoneIds().catch(() => new Set())])
      .then(([tasks, doneIds]) => {
        if (!live) return
        const today = isoToday()
        setUpcoming(
          (tasks ?? []).filter(
            (task) => !task.done && task.date >= today && !doneIds.has(taskDoneId(task))
          )
        )
      })
      .catch(() => {})
    return () => {
      live = false
    }
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

  const formatDay = (date, withYear) =>
    date.toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric',
      ...(withYear ? { year: 'numeric' } : {})
    })

  const editedLabel = (updatedAt) => {
    if (!updatedAt) return ''
    const date = new Date(updatedAt)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date >= today) return t('localAi.askVault.editedToday')
    if (date >= new Date(today.getTime() - DAY_MS)) return t('localAi.askVault.editedYesterday')
    return t('localAi.askVault.editedOn', {
      date: formatDay(date, date.getFullYear() !== today.getFullYear())
    })
  }

  const openNote = (noteKey) => {
    dispatch(selectNote(noteKey))
    handleClose()
  }

  const handleInputKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (mode === 'search') {
      if (firstResultRef.current) openNote(firstResultRef.current)
      return
    }
    handleSend()
  }

  const focusFollowUp = () => {
    inputRef.current?.focus()
  }

  const citedSources = (turn) => {
    const cited = new Set(turn.result.citations.map((citation) => citation.n))
    return cited.size ? turn.sources.filter((source) => cited.has(source.n)) : []
  }

  const reminderFor = (turn) => {
    const keys = new Set(citedSources(turn).map((source) => source.noteKey))
    if (!keys.size) return null
    const [first] = upcoming
      .filter((task) => keys.has(task.noteKey))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
    if (!first) return null
    const [year, month, day] = first.date.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return formatDay(date, year !== new Date().getFullYear())
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
            className='inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 ml-0.5 rounded-[5px] bg-accent-primary/15 text-accent-primary text-[10.5px] font-bold align-[2px] hover:bg-accent-primary/25'
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
    const cited = citedSources(turn)
    const shown = cited.length ? cited : turn.sources.slice(0, 3)
    if (!shown.length) return null
    return (
      <div className='flex flex-col gap-1.5'>
        <p className='text-[11.5px] font-semibold text-text-tertiary'>
          {t(cited.length ? 'localAi.askVault.fromYourNotes' : 'localAi.askVault.relatedNotes')}
        </p>
        {shown.map((source, index) => {
          const note = notesData?.[source.noteKey]
          const meta = [folderById.get(note?.folderKey)?.name, editedLabel(note?.updatedAt)]
            .filter(Boolean)
            .join(' · ')
          return (
            <button
              key={`${turn.id}-${source.n}`}
              onClick={() => openNote(source.noteKey)}
              className='group flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-overlay-subtle border border-overlay-soft text-left hover:bg-overlay-medium transition-colors'
            >
              <span className='w-5 h-5 shrink-0 rounded-md bg-accent-primary/15 text-accent-primary text-[11px] font-bold flex items-center justify-center'>
                {cited.length ? source.n : index + 1}
              </span>
              <span className='flex flex-col flex-1 min-w-0'>
                <span className='text-[13.5px] font-semibold text-text-primary truncate'>
                  {source.title || t('activity.untitledNote')}
                </span>
                {meta && <span className='text-xs text-text-tertiary truncate'>{meta}</span>}
                <span className='text-xs text-text-tertiary/80 truncate'>
                  {toMeaningSnippet(source.text)}
                </span>
              </span>
              <span className='shrink-0 text-[12.5px] font-semibold text-accent-primary group-hover:underline'>
                {t('localAi.askVault.open')}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  const renderActions = (turn) => {
    const copied = copiedId === turn.id
    const saved = savedId === turn.id
    const reminderDate = reminderFor(turn)
    return (
      <div className='flex flex-wrap gap-2'>
        {reminderDate &&
          (remindersOn ? (
            <span className={`${ACTION} border-transparent text-accent-success`}>
              <CheckCircle2 className='w-3.5 h-3.5' />
              {t('localAi.askVault.reminderOn', { date: reminderDate })}
            </span>
          ) : (
            <button
              onClick={toggleReminders}
              className={`${ACTION} bg-accent-primary border-accent-primary text-accent-on-primary hover:bg-accent-primary/90`}
            >
              <BellRing className='w-3.5 h-3.5' />
              {t('localAi.askVault.addReminder', { date: reminderDate })}
            </button>
          ))}
        <button onClick={focusFollowUp} className={SECONDARY_ACTION}>
          <CornerDownRight className='w-3.5 h-3.5' />
          {t('localAi.askVault.followUp')}
        </button>
        <button onClick={() => handleCopy(turn.id)} className={SECONDARY_ACTION}>
          {copied ? <Check className='w-3.5 h-3.5' /> : <Copy className='w-3.5 h-3.5' />}
          {t(copied ? 'localAi.actions.copied' : 'localAi.actions.copy')}
        </button>
        <button
          onClick={() => handleSave(turn.id)}
          disabled={saved}
          className={`${SECONDARY_ACTION} disabled:text-accent-success disabled:hover:bg-overlay-subtle`}
        >
          {saved ? <CheckCircle2 className='w-3.5 h-3.5' /> : <FilePlus2 className='w-3.5 h-3.5' />}
          {t(saved ? 'localAi.askVault.saved' : 'localAi.askVault.saveAsNote')}
        </button>
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
        <div className='flex flex-col gap-3'>
          <p className='text-[15px] leading-relaxed text-text-secondary'>
            {t('localAi.askVault.notFound')}
          </p>
          {indexNotice && (
            <p className='text-xs text-text-tertiary'>
              {t('localAi.askVault.indexNotice.notFoundHint')}
            </p>
          )}
          {renderSources(turn)}
        </div>
      )
    }
    return (
      <div className='flex flex-col gap-3.5'>
        <p className='text-[15px] leading-relaxed whitespace-pre-wrap select-text text-text-primary'>
          {renderAnswerText(turn)}
        </p>
        {!turn.result.verified && (
          <p className='text-xs text-text-tertiary'>{t('localAi.askVault.unverified')}</p>
        )}
        {renderSources(turn)}
        {renderActions(turn)}
      </div>
    )
  }

  const renderTurn = (turn) => (
    <div key={turn.id} className='flex flex-col gap-3'>
      <p className='flex items-start gap-2 text-sm font-semibold text-text-secondary whitespace-pre-wrap'>
        <Sparkles className='w-3.5 h-3.5 mt-0.5 shrink-0 text-accent-primary' aria-hidden='true' />
        {turn.question}
      </p>
      {renderResult(turn)}
    </div>
  )

  const tabClass = (active) =>
    `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12.5px] font-semibold transition-colors ${
      active ? 'bg-overlay-medium text-text-primary' : 'text-text-tertiary hover:text-text-primary'
    }`

  const isAsk = mode === 'ask'
  const showSuggestions = isAsk && ready && turns.length === 0 && suggestions.length > 0

  return (
    <div className='fixed inset-0 flex items-start justify-center z-[110] p-6 pt-[10vh]'>
      <div
        className='absolute inset-0 bg-backdrop-medium backdrop-blur-xl animate-in fade-in duration-300'
        onClick={handleClose}
      />
      <div
        role='dialog'
        aria-modal='true'
        aria-label={t('localAi.askVault.title')}
        className='relative bg-bg-panel/95 backdrop-blur-3xl border border-border-primary rounded-2xl w-full max-w-[680px] max-h-[80vh] shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-300 ease-out flex flex-col'
      >
        <div className='flex items-center gap-1.5 px-3.5 pt-3 shrink-0' role='tablist'>
          <button
            role='tab'
            aria-selected={!isAsk}
            onClick={() => setMode('search')}
            className={tabClass(!isAsk)}
          >
            {t('localAi.askVault.tabSearch')}
          </button>
          <button
            role='tab'
            aria-selected={isAsk}
            onClick={() => setMode('ask')}
            className={tabClass(isAsk)}
          >
            <Sparkles className='w-3.5 h-3.5 text-accent-primary' aria-hidden='true' />
            {t('localAi.askVault.tabAsk')}
          </button>
          <span className='flex-1' />
          {currentFolder ? (
            <label className='relative flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary'>
              <span className='sr-only'>{t('localAi.askVault.scopeLabel')}</span>
              <select
                value={scopeKey}
                onChange={(event) => setScope(event.target.value)}
                className='appearance-none bg-transparent pr-4 text-xs text-inherit outline-none cursor-pointer'
              >
                <option value={ALL_NOTES_KEY}>{t('localAi.askVault.scopeAll')}</option>
                <option value={currentFolder.id}>{currentFolder.name}</option>
              </select>
              <ChevronDown
                className='w-3 h-3 absolute right-0 pointer-events-none'
                aria-hidden='true'
              />
            </label>
          ) : (
            <span className='text-xs text-text-tertiary'>{t('localAi.askVault.scopeAll')}</span>
          )}
        </div>

        <div className='flex items-center gap-3 px-[18px] pt-3.5 pb-4 border-b border-overlay-soft shrink-0'>
          {isAsk ? (
            <Sparkles
              className='w-[18px] h-[18px] shrink-0 text-accent-primary'
              aria-hidden='true'
            />
          ) : (
            <Search className='w-[18px] h-[18px] shrink-0 text-text-tertiary' aria-hidden='true' />
          )}
          <input
            ref={inputRef}
            value={isAsk ? question : searchQuery}
            onChange={(event) =>
              isAsk ? setQuestion(event.target.value) : setSearchQuery(event.target.value)
            }
            onKeyDown={handleInputKeyDown}
            disabled={isAsk && (busy || !ready)}
            maxLength={isAsk ? ASK_QUESTION_MAX_CHARS : undefined}
            placeholder={t(
              isAsk
                ? turns.length > 0
                  ? 'localAi.askVault.followUpPlaceholder'
                  : 'localAi.askVault.placeholder'
                : 'localAi.askVault.searchPlaceholder'
            )}
            aria-label={t(isAsk ? 'localAi.askVault.inputLabel' : 'localAi.askVault.searchLabel')}
            className='flex-1 min-w-0 bg-transparent border-0 outline-none text-base text-text-primary placeholder:text-text-tertiary disabled:opacity-60'
          />
          {(isAsk ? canSend : !!searchQuery.trim()) && (
            <span className={KBD}>{t('localAi.askVault.returnKey')}</span>
          )}
        </div>

        {isAsk ? (
          <div className='flex flex-col gap-4 px-5 pt-[18px] pb-1.5 min-h-0'>
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

            {ready && indexNotice && (
              <p className='text-xs text-text-tertiary' role='status'>
                {indexNoticeText(t, indexNotice)}
              </p>
            )}

            {turns.length > 0 && (
              <div
                ref={threadRef}
                className='flex flex-col gap-6 overflow-y-auto custom-scrollbar min-h-0 max-h-[50vh] pr-1 pb-3'
                aria-live='polite'
              >
                {turns.map(renderTurn)}
              </div>
            )}
          </div>
        ) : (
          <AskVaultSearchResults
            query={searchQuery}
            folderKey={scopeKey}
            notesData={notesData}
            firstResultRef={firstResultRef}
            onOpen={openNote}
          />
        )}

        {showSuggestions && (
          <div className='flex flex-col gap-0.5 px-3 py-2.5 mt-1 border-t border-overlay-soft'>
            <p className='px-3 py-1 text-[11.5px] font-semibold text-text-tertiary'>
              {t('localAi.askVault.tryAsking')}
            </p>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSend(suggestion)}
                className='flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] text-text-secondary hover:bg-overlay-subtle hover:text-text-primary transition-colors'
              >
                <ArrowRight className='w-3.5 h-3.5 shrink-0 text-text-tertiary' />
                <span className='truncate'>{suggestion}</span>
              </button>
            ))}
          </div>
        )}

        <div className='flex items-center gap-2 px-[18px] py-2.5 mt-2 bg-overlay-faint border-t border-overlay-soft text-[11.5px] text-text-tertiary shrink-0'>
          <Lock className='w-3 h-3 shrink-0' aria-hidden='true' />
          <span className='truncate'>
            {isAsk
              ? t('localAi.askVault.footer', {
                  place: t(IS_MAC ? 'localAi.askVault.thisMac' : 'localAi.askVault.thisComputer'),
                  count: scopedNotes.length
                })
              : t('localAi.askVault.searchFooter', {
                  place: t(IS_MAC ? 'localAi.askVault.thisMac' : 'localAi.askVault.thisComputer')
                })}
          </span>
          <span className='flex-1' />
          <span className={KBD}>{SHORTCUT}</span>
        </div>
      </div>
    </div>
  )
}
