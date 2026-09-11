import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy } from 'lucide-react'

import { diffActivityText } from '@pear-notes/core/activity.js'

import { copyToClipboard } from '../../lib/clipboard'

const ROW_STYLES = {
  add: 'bg-accent-success/10 text-accent-success',
  del: 'bg-accent-danger/10 text-accent-danger',
  ctx: 'text-text-secondary'
}

const MARKERS = { add: '+', del: '-', ctx: ' ' }

const COPIED_RESET_MS = 2000

export default function DiffView({ before, after, compact = false }) {
  const { t } = useTranslation()
  const diff = useMemo(() => diffActivityText(before || '', after || ''), [before, after])
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef(null)

  const removedText = useMemo(
    () =>
      diff.rows
        .filter((row) => row.type === 'del')
        .map((row) => row.text)
        .join('\n'),
    [diff.rows]
  )

  useEffect(() => () => clearTimeout(copiedTimerRef.current), [])

  const handleCopyRemoved = useCallback(async () => {
    if (!removedText) return
    const ok = await copyToClipboard(removedText)
    if (!ok) return
    setCopied(true)
    clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS)
  }, [removedText])

  if (diff.unchanged) {
    return (
      <div className='mt-3 px-4 py-3 bg-bg-tertiary/40 border border-border-secondary rounded-2xl text-xs text-text-tertiary font-medium'>
        {t('activity.diff.formattingOnly')}
      </div>
    )
  }

  return (
    <div className='mt-3 border border-border-secondary rounded-2xl overflow-hidden bg-bg-primary/60'>
      <div className='flex items-center gap-3 px-4 py-2 border-b border-border-secondary bg-bg-tertiary/30'>
        <span className='text-xs font-bold text-accent-success tabular-nums'>+{diff.added}</span>
        <span className='text-xs font-bold text-accent-danger tabular-nums'>
          &minus;{diff.removed}
        </span>
        <span className='text-[0.65rem] tracking-[0.14em] text-text-tertiary font-bold ml-auto'>
          {t('activity.diff.plainText')}
        </span>
        {removedText ? (
          <button
            type='button'
            onClick={handleCopyRemoved}
            title={t('activity.diff.copyRemoved')}
            aria-label={t('activity.diff.copyRemoved')}
            className='flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors'
          >
            {copied ? (
              <Check className='w-3.5 h-3.5 text-accent-success' />
            ) : (
              <Copy className='w-3.5 h-3.5' />
            )}
          </button>
        ) : null}
      </div>

      <div className={`overflow-x-auto ${compact ? 'max-h-64' : 'max-h-96'} overflow-y-auto`}>
        <div className='min-w-full font-mono text-[0.7rem] leading-relaxed py-1'>
          {diff.rows.map((row, index) =>
            row.type === 'gap' ? (
              <div
                key={`gap-${index}`}
                className='px-4 py-1 text-text-muted bg-bg-tertiary/20 text-[0.65rem]'
              >
                {t('activity.diff.unchangedLines', { count: row.count })}
              </div>
            ) : (
              <div key={`${row.type}-${index}`} className={`flex ${ROW_STYLES[row.type]}`}>
                <span className='w-10 shrink-0 text-right pr-2 text-text-muted tabular-nums select-none'>
                  {row.before ?? ''}
                </span>
                <span className='w-10 shrink-0 text-right pr-2 text-text-muted tabular-nums select-none'>
                  {row.after ?? ''}
                </span>
                <span className='w-4 shrink-0 text-center select-none'>{MARKERS[row.type]}</span>
                <span className='pr-4 whitespace-pre-wrap break-words'>{row.text || ' '}</span>
              </div>
            )
          )}
        </div>
      </div>

      {diff.truncated && (
        <div className='px-4 py-2 border-t border-border-secondary text-[0.65rem] text-text-tertiary'>
          {t('activity.diff.truncated')}
        </div>
      )}
    </div>
  )
}
