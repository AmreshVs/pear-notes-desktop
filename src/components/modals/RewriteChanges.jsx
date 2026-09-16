import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronsUpDown, Info } from 'lucide-react'

import {
  groupRewriteParagraphs,
  REWRITE_SEGMENT
} from '@pear-notes/core/store/services/localAiRewriteDiff.js'

const REWRITE_VIEWS = ['changes', 'result']

const SEGMENT_CLASSES = {
  [REWRITE_SEGMENT.EQUAL]: '',
  [REWRITE_SEGMENT.REMOVED]:
    'rounded-[3px] px-px bg-accent-danger/10 text-accent-danger line-through decoration-1',
  [REWRITE_SEGMENT.ADDED]:
    'rounded-[3px] px-px bg-accent-success/10 text-accent-success underline decoration-1 underline-offset-[3px]'
}

const SEGMENT_TAGS = {
  [REWRITE_SEGMENT.EQUAL]: 'span',
  [REWRITE_SEGMENT.REMOVED]: 'del',
  [REWRITE_SEGMENT.ADDED]: 'ins'
}

export default function RewriteChanges({ diff, resultText, showFixCount }) {
  const { t } = useTranslation()
  const [view, setView] = useState(diff.mostlyChanged ? 'result' : 'changes')
  const [showUnchanged, setShowUnchanged] = useState(false)

  const items = useMemo(
    () =>
      showUnchanged
        ? diff.paragraphs.map((paragraph) => ({ type: 'paragraph', paragraph }))
        : groupRewriteParagraphs(diff.paragraphs),
    [diff.paragraphs, showUnchanged]
  )

  if (diff.unchanged) {
    return (
      <div className='flex flex-col items-center gap-3 rounded-xl bg-bg-tertiary/40 border border-overlay-soft px-4 py-7 text-center'>
        <div className='w-10 h-10 rounded-full bg-accent-success/10 text-accent-success flex items-center justify-center'>
          <Check className='w-5 h-5' />
        </div>
        <p className='text-sm font-bold text-text-primary'>
          {t(
            showFixCount
              ? 'localAi.rewriteChanges.noGrammarIssues'
              : 'localAi.rewriteChanges.matchesText'
          )}
        </p>
      </div>
    )
  }

  const renderSegment = (segment, index) => {
    const Tag = SEGMENT_TAGS[segment.type]
    const label =
      segment.type === REWRITE_SEGMENT.EQUAL
        ? undefined
        : t(`localAi.rewriteChanges.${segment.type}`, { text: segment.text })
    return (
      <span key={index}>
        {index > 0 ? ' ' : ''}
        {label && <span className='sr-only'>{label}</span>}
        <Tag className={SEGMENT_CLASSES[segment.type]} aria-hidden={label ? 'true' : undefined}>
          {segment.text}
        </Tag>
      </span>
    )
  }

  const renderItem = (item, index) =>
    item.type === 'paragraph' ? (
      <p
        key={`paragraph-${index}`}
        className='text-sm leading-relaxed text-text-primary select-text'
      >
        {item.paragraph.segments.map(renderSegment)}
      </p>
    ) : (
      <button
        key={`unchanged-${index}`}
        onClick={() => setShowUnchanged(true)}
        title={t('localAi.rewriteChanges.showUnchangedHint')}
        className='w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-overlay-subtle hover:bg-overlay-medium text-xs font-bold text-text-tertiary hover:text-text-secondary transition-colors'
      >
        <ChevronsUpDown className='w-3.5 h-3.5' />
        {t('localAi.rewriteChanges.unchangedParagraphs', { count: item.paragraphs.length })}
      </button>
    )

  const renderViewOption = (item) => (
    <button
      key={item}
      role='tab'
      aria-selected={item === view}
      onClick={() => setView(item)}
      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
        item === view
          ? 'bg-bg-panel text-text-primary shadow-sm'
          : 'text-text-tertiary hover:text-text-secondary'
      }`}
    >
      {t(`localAi.rewriteChanges.${item}`)}
    </button>
  )

  return (
    <div className='flex flex-col gap-2.5'>
      <div className='flex items-center justify-between gap-3'>
        <div
          role='tablist'
          aria-label={t('localAi.rewriteChanges.viewLabel')}
          className='inline-flex p-0.5 rounded-[10px] bg-bg-tertiary/40 border border-overlay-soft'
        >
          {REWRITE_VIEWS.map(renderViewOption)}
        </div>
        {showFixCount ? (
          <span className='text-xs font-semibold text-text-tertiary tabular-nums'>
            {t('localAi.rewriteChanges.fixes', { count: diff.fixes })}
          </span>
        ) : (
          <span
            className='flex items-center gap-2 text-xs font-semibold tabular-nums'
            aria-label={t('localAi.rewriteChanges.wordCountLabel', {
              added: diff.added,
              removed: diff.removed
            })}
          >
            <span className='text-accent-success'>+{diff.added}</span>
            <span className='text-accent-danger'>&minus;{diff.removed}</span>
            <span className='text-text-tertiary'>{t('localAi.rewriteChanges.words')}</span>
          </span>
        )}
      </div>

      {diff.mostlyChanged && view === 'result' && (
        <div className='flex items-center gap-2 rounded-xl bg-overlay-subtle px-3 py-2 text-xs text-text-secondary'>
          <Info className='w-3.5 h-3.5 shrink-0' />
          {t('localAi.rewriteChanges.mostlyChanged')}
        </div>
      )}

      <div
        role='tabpanel'
        className='max-h-72 overflow-y-auto custom-scrollbar rounded-xl bg-bg-tertiary/40 border border-overlay-soft px-4 py-3 space-y-2'
      >
        {view === 'result' ? (
          <p className='text-sm leading-relaxed text-text-primary whitespace-pre-wrap select-text'>
            {resultText}
          </p>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </div>
  )
}
