import { useTranslation } from 'react-i18next'
import { History, X } from 'lucide-react'

export default function AskVaultRecent({ threads, onOpen, onDelete }) {
  const { t } = useTranslation()
  if (!threads.length) return null
  return (
    <div className='flex flex-col gap-0.5 px-3 py-2.5 border-t border-overlay-soft'>
      <p className='px-3 py-1 text-[11.5px] font-semibold text-text-tertiary'>
        {t('localAi.askVault.recent')}
      </p>
      {threads.map((thread) => (
        <div
          key={thread.id}
          className='group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-overlay-subtle transition-colors'
        >
          <History className='w-3.5 h-3.5 shrink-0 text-text-tertiary' aria-hidden='true' />
          <button
            onClick={() => onOpen(thread)}
            className='flex-1 min-w-0 truncate text-left text-[13px] text-text-secondary group-hover:text-text-primary'
          >
            {thread.title}
          </button>
          <button
            onClick={() => onDelete(thread.id)}
            aria-label={t('localAi.askVault.deleteThread')}
            title={t('localAi.askVault.deleteThread')}
            className='shrink-0 p-1 rounded-md text-text-tertiary opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-overlay-medium hover:text-text-primary'
          >
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      ))}
    </div>
  )
}
