import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

import NoteFindingsSection from './NoteFindingsSection'
import RelatedNotesSection from './RelatedNotesSection'

const IS_MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

export default function InThisNotePanel({
  noteKey,
  html,
  title,
  anchor,
  showFindings,
  showRelated,
  insertBlocked,
  onMakeTasks,
  onClose
}) {
  const { t } = useTranslation()

  return (
    <aside
      aria-label={t('inThisNote.title')}
      className='w-80 shrink-0 border-l border-border-primary bg-bg-panel/80 backdrop-blur-2xl flex flex-col animate-in slide-in-from-right-4 fade-in duration-300'
    >
      <div className='px-5 pt-5 pb-3 flex items-center justify-between gap-3'>
        <h2 className='text-text-primary font-bold text-sm'>{t('inThisNote.title')}</h2>
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          title={t('common.close')}
          className='p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-overlay-subtle transition-colors active:scale-90'
        >
          <X className='w-4 h-4' />
        </button>
      </div>

      <div className='flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-5'>
        {showFindings && (
          <NoteFindingsSection
            noteKey={noteKey}
            html={html}
            title={title}
            anchor={anchor}
            showEmpty={!showRelated}
            insertBlocked={insertBlocked}
            onMakeTasks={onMakeTasks}
          />
        )}
        {showRelated && <RelatedNotesSection noteKey={noteKey} />}
      </div>

      <p className='px-5 py-4 text-[11px] leading-relaxed text-text-tertiary'>
        {t(IS_MAC ? 'inThisNote.footerMac' : 'inThisNote.footerComputer')}
      </p>
    </aside>
  )
}
