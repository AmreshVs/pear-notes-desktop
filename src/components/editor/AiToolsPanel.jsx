import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  AlignLeft,
  Briefcase,
  Languages,
  List,
  MessageCircleQuestion,
  Minimize2,
  Smile,
  Sparkles,
  SpellCheck,
  Type,
  Wand2,
  X
} from 'lucide-react'

import { AI_TOOL_GROUPS } from '../../lib/localAi/aiTools'

const EXCERPT_MAX_CHARS = 120

const PANEL_WIDTH = 320
const PANEL_GAP = 8
const VIEWPORT_MARGIN = 12
const MIN_PANEL_HEIGHT = 220

const TOOL_ICONS = {
  ask: MessageCircleQuestion,
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

function toExcerpt(text) {
  const flat = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  return flat.length > EXCERPT_MAX_CHARS ? `${flat.slice(0, EXCERPT_MAX_CHARS).trimEnd()}…` : flat
}

// The panel is anchored to a button that lives inside the editor, where every
// ancestor clips (`.ProseMirror-wrapper` and the editor column both hide their
// overflow) and the notes list paints over anything that escapes. So it is
// placed against the viewport from the trigger's rect instead, and portalled
// out of the editor. `bottom` carries the upward placement so the panel's own
// height never has to be measured.
function panelPosition(rect, placement) {
  const spaceAbove = rect.top - PANEL_GAP - VIEWPORT_MARGIN
  const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP - VIEWPORT_MARGIN
  const wantsAbove = placement === 'top'
  const preferred = wantsAbove ? spaceAbove : spaceBelow
  const other = wantsAbove ? spaceBelow : spaceAbove
  const above = preferred < MIN_PANEL_HEIGHT && other > preferred ? !wantsAbove : wantsAbove

  const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - VIEWPORT_MARGIN - PANEL_WIDTH)
  return {
    left: Math.min(Math.max(rect.right - PANEL_WIDTH, VIEWPORT_MARGIN), maxLeft),
    top: above ? undefined : rect.bottom + PANEL_GAP,
    bottom: above ? window.innerHeight - rect.top + PANEL_GAP : undefined,
    maxHeight: Math.max(
      MIN_PANEL_HEIGHT,
      Math.min(window.innerHeight * 0.6, above ? spaceAbove : spaceBelow)
    )
  }
}

export default function AiToolsPanel({
  tools,
  selectionText,
  onChoose,
  onClose,
  anchorRef,
  placement = 'bottom',
  panelRef,
  className = ''
}) {
  const { t } = useTranslation()
  const excerpt = toExcerpt(selectionText)
  const reposition = useCallback(() => {
    const rect = anchorRef?.current?.getBoundingClientRect()
    return rect ? panelPosition(rect, placement) : null
  }, [anchorRef, placement])

  // Nothing is drawn until the trigger has been measured, so the panel never
  // paints in the wrong place for a frame.
  const [position, setPosition] = useState(null)

  // Measured on the frame after opening, then kept in step with a trigger that
  // moves under it: Floating UI repositions the selection toolbar on scroll,
  // and the floating button follows the window.
  useEffect(() => {
    const update = () => setPosition(reposition)
    const frame = requestAnimationFrame(update)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [reposition])

  if (!position) return null

  return createPortal(
    <div
      ref={panelRef}
      role='dialog'
      aria-label={t('localAi.writingTools.title')}
      onMouseDown={(event) => event.preventDefault()}
      style={{
        left: position.left,
        top: position.top,
        bottom: position.bottom,
        width: PANEL_WIDTH,
        maxHeight: position.maxHeight
      }}
      className={`fixed z-[100] overflow-y-auto custom-scrollbar rounded-2xl bg-bg-panel/95 backdrop-blur-3xl border border-border-primary shadow-[0_20px_60px_rgba(0,0,0,0.35)] p-3 animate-in fade-in zoom-in-95 duration-150 ${className}`}
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
          onClick={onClose}
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
                  onClick={() => onChoose(entry)}
                  className='w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left hover:bg-overlay-subtle focus-visible:bg-overlay-subtle focus:outline-none transition-colors'
                >
                  <span className='w-7 h-7 shrink-0 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center'>
                    <Icon className='w-3.5 h-3.5' />
                  </span>
                  <span className='text-sm font-medium text-text-primary'>{t(entry.labelKey)}</span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>,
    document.body
  )
}
