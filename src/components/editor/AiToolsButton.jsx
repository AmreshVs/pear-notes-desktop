import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlignLeft,
  Briefcase,
  Languages,
  List,
  Minimize2,
  Smile,
  Sparkles,
  SpellCheck,
  Type,
  Wand2,
  X
} from 'lucide-react'

import { htmlToParagraphs } from '@pear-notes/core/store/services/localAiPrompts.js'

import { AI_TOOL_GROUPS, buildAiTools } from '../../lib/localAi/aiTools'
import { requestLocalAiSheet } from '../../lib/localAi/localAiRequests'

const EXCERPT_MAX_CHARS = 120

const TOOL_ICONS = {
  fixGrammar: SpellCheck,
  rewrite: Wand2,
  makeShorter: Minimize2,
  makeProfessional: Briefcase,
  makeFriendly: Smile,
  summarizeNote: AlignLeft,
  keyPoints: List,
  suggestTitle: Type,
  translate: Languages
}

const toLines = (text) =>
  String(text ?? '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

function readSelection(editor) {
  if (!editor || editor.isDestroyed || editor.state.selection.empty) return null
  const { from, to } = editor.state.selection
  const text = editor.state.doc.textBetween(from, to, '\n', ' ')
  return text.trim() ? { from, to, text } : null
}

function toExcerpt(text) {
  const flat = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  return flat.length > EXCERPT_MAX_CHARS ? `${flat.slice(0, EXCERPT_MAX_CHARS).trimEnd()}…` : flat
}

export default function AiToolsButton({ editor, content, summarizeReady, translateReady }) {
  const { t } = useTranslation()
  const [panel, setPanel] = useState(null)

  useEffect(() => {
    if (!panel) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setPanel(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [panel])

  const tools = panel
    ? buildAiTools({ summarizeReady, translateReady, hasSelection: !!panel.selection })
    : []

  const handleToggle = () => {
    setPanel((current) => (current ? null : { selection: readSelection(editor) }))
  }

  const handleChoose = (tool) => {
    const selection = panel?.selection ?? null
    setPanel(null)
    if (tool.scope === 'selection' && selection) {
      requestLocalAiSheet({
        mode: tool.mode,
        paragraphs: toLines(selection.text),
        scope: 'selection',
        selection
      })
      return
    }
    requestLocalAiSheet({ mode: tool.mode, paragraphs: htmlToParagraphs(content) })
  }

  const excerpt = panel?.selection ? toExcerpt(panel.selection.text) : ''

  return (
    <div className='relative'>
      {panel && <div className='fixed inset-0 z-40' onMouseDown={() => setPanel(null)} />}

      {panel && (
        <div
          role='dialog'
          aria-label={t('localAi.writingTools.title')}
          className='absolute bottom-14 right-0 z-50 w-80 max-h-[70vh] overflow-y-auto custom-scrollbar rounded-2xl bg-bg-panel/95 backdrop-blur-3xl border border-border-primary shadow-[0_20px_60px_rgba(0,0,0,0.35)] p-3 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150 origin-bottom-right'
        >
          <div className='flex items-start gap-3 px-2 pt-1 pb-2'>
            <div className='w-8 h-8 shrink-0 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center'>
              <Sparkles className='w-4 h-4' />
            </div>
            <div className='min-w-0 flex-1'>
              <p className='text-sm font-black text-text-primary tracking-tight'>
                {t('localAi.writingTools.title')}
              </p>
              <p className='text-xs text-text-tertiary line-clamp-2'>
                {excerpt ? `“${excerpt}”` : t('localAi.writingTools.noSelectionHint')}
              </p>
            </div>
            <button
              onClick={() => setPanel(null)}
              className='w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-text-tertiary hover:text-text-primary hover:bg-overlay-subtle transition-colors'
              aria-label={t('common.close')}
              title={t('common.close')}
            >
              <X className='w-3.5 h-3.5' />
            </button>
          </div>

          {AI_TOOL_GROUPS.map((group) => {
            const groupTools = tools.filter((entry) => entry.group === group.id)
            if (groupTools.length === 0) return null
            return (
              <div key={group.id} className='pt-2'>
                <p className='px-2 pb-1 text-xs font-bold text-text-tertiary'>{t(group.labelKey)}</p>
                {groupTools.map((entry) => {
                  const Icon = TOOL_ICONS[entry.mode] ?? Sparkles
                  return (
                    <button
                      key={entry.id}
                      onClick={() => handleChoose(entry)}
                      className='w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left hover:bg-overlay-subtle focus-visible:bg-overlay-subtle focus:outline-none transition-colors'
                    >
                      <span className='w-7 h-7 shrink-0 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center'>
                        <Icon className='w-3.5 h-3.5' />
                      </span>
                      <span className='text-sm font-medium text-text-primary'>
                        {t(entry.labelKey)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleToggle}
        aria-expanded={!!panel}
        aria-haspopup='dialog'
        aria-label={t('localAi.writingTools.toolbarLabel')}
        title={t('localAi.writingTools.toolbarLabel')}
        className='relative z-50 w-11 h-11 rounded-full bg-accent-primary text-accent-on-primary shadow-lg shadow-accent-primary/25 flex items-center justify-center hover:bg-accent-primary/90 transition-all active:scale-95'
      >
        <Sparkles className='w-5 h-5' />
      </button>
    </div>
  )
}
