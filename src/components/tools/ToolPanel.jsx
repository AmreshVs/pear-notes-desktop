import { useTranslation } from 'react-i18next'

export const TOOL_GROUP_HEADER_CLASS =
  'px-6 py-2 text-sm font-bold text-text-primary tracking-[0.1em] sticky top-0 bg-bg-secondary/95 backdrop-blur-md z-10 border-b border-overlay-subtle transform-cpu hardware-accelerated'

export default function ToolPanel({
  title,
  status,
  hint,
  onToggleSidebar,
  isSidebarCollapsed,
  actions,
  children
}) {
  const { t } = useTranslation()

  return (
    <div className='flex flex-col h-full w-full bg-bg-secondary/95 backdrop-blur-xl border-r border-border-primary/50 relative overflow-hidden hardware-accelerated'>
      <div className='px-6 pt-10 pb-4 border-b border-border-primary/30 min-h-[140px] flex flex-col gap-4'>
        <div className='flex items-center gap-4 h-[40px]'>
          <button
            onClick={onToggleSidebar}
            className='p-2 rounded-xl bg-bg-tertiary/50 hover:bg-bg-tertiary border border-border-secondary text-text-primary active:scale-95 transition-all duration-200'
            title={t('notesList.toggleSidebar')}
            aria-label={t('notesList.toggleSidebar')}
          >
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='w-5 h-5'
            >
              <rect width='18' height='18' x='3' y='3' rx='2' />
              <path d='M9 3v18' />
              {!isSidebarCollapsed && (
                <path d='M5 3h4v18H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2z' fill='currentColor' />
              )}
            </svg>
          </button>
          <div className='flex flex-col min-w-0 flex-1'>
            <h2 className='font-bold text-title text-text-primary tracking-tight truncate leading-tight'>
              {title}
            </h2>
            {status && (
              <span
                role='status'
                aria-live='polite'
                className='text-xs font-bold text-text-secondary tracking-wider'
              >
                {status}
              </span>
            )}
          </div>
          {actions}
        </div>
        {hint && <p className='text-xs text-text-tertiary leading-relaxed'>{hint}</p>}
      </div>

      <div className='flex-1 overflow-y-auto scrollbar-hide pb-4'>{children}</div>
    </div>
  )
}

export function ToolEmpty({ title, body }) {
  return (
    <div className='px-6 py-10 text-center'>
      <p className='text-base font-bold text-text-primary'>{title}</p>
      {body && <p className='mt-2 text-sm text-text-tertiary leading-relaxed'>{body}</p>}
    </div>
  )
}
