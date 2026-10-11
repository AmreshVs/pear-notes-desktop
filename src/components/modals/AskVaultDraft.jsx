import { useTranslation } from 'react-i18next'
import { Check, CheckCircle2, Copy, CornerDownRight, FileInput, FilePlus2 } from 'lucide-react'

import { ACTION, PRIMARY_ACTION, SECONDARY_ACTION } from './askVaultStyles'

export function AskVaultDraftCard({ turn, draft, renderChip }) {
  const byNumber = new Map(turn.sources.map((source) => [source.n, source]))
  return (
    <div className='flex flex-col gap-2 rounded-xl border border-overlay-soft bg-overlay-subtle px-4 py-3'>
      <p className='text-[14px] font-semibold text-text-primary'>{draft.title}</p>
      <ul className='flex flex-col gap-1.5 select-text'>
        {draft.items.map((item, index) => (
          <li
            key={`${turn.id}-item-${index}`}
            className='flex items-start gap-2 text-[14px] leading-relaxed text-text-primary'
          >
            {draft.checklist ? (
              <span
                className='mt-[5px] w-3.5 h-3.5 shrink-0 rounded-[4px] border border-overlay-strong'
                aria-hidden='true'
              />
            ) : (
              <span
                className='mt-[9px] w-1.5 h-1.5 shrink-0 rounded-full bg-text-tertiary'
                aria-hidden='true'
              />
            )}
            <span>
              {item.text}
              {item.citations.map(
                (citation) =>
                  byNumber.has(citation.n) &&
                  renderChip(byNumber.get(citation.n), `${turn.id}-${index}-${citation.n}`)
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AskVaultDraftActions({
  turn,
  done,
  target,
  copied,
  noteTitle,
  onSave,
  onAdd,
  onFollowUp,
  onCopy
}) {
  const { t } = useTranslation()
  return (
    <div className='flex flex-wrap gap-2'>
      {done ? (
        <span className={`${ACTION} border-transparent text-accent-success`}>
          <CheckCircle2 className='w-3.5 h-3.5' />
          {done.addedTo
            ? t('localAi.askVault.draft.added', { title: noteTitle(done.addedTo) })
            : t('localAi.askVault.draft.saved')}
        </span>
      ) : (
        <>
          <button onClick={() => onSave(turn.id)} className={PRIMARY_ACTION}>
            <FilePlus2 className='w-3.5 h-3.5' />
            {t('localAi.askVault.draft.saveNew')}
          </button>
          {target && (
            <button onClick={() => onAdd(turn.id)} className={`${SECONDARY_ACTION} max-w-[260px]`}>
              <FileInput className='w-3.5 h-3.5 shrink-0' />
              <span className='truncate'>
                {t('localAi.askVault.draft.addTo', { title: noteTitle(target) })}
              </span>
            </button>
          )}
        </>
      )}
      <button onClick={onFollowUp} className={SECONDARY_ACTION}>
        <CornerDownRight className='w-3.5 h-3.5' />
        {t('localAi.askVault.followUp')}
      </button>
      <button onClick={() => onCopy(turn.id)} className={SECONDARY_ACTION}>
        {copied ? <Check className='w-3.5 h-3.5' /> : <Copy className='w-3.5 h-3.5' />}
        {t(copied ? 'localAi.actions.copied' : 'localAi.actions.copy')}
      </button>
    </div>
  )
}
