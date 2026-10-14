import { useTranslation } from 'react-i18next'

import { birthdayMeta, upcomingText } from '../../utils/upcomingFormat'

export default function UpcomingBirthdayRow({ task, last, onOpen }) {
  const { t, i18n } = useTranslation()
  const [year, month, day] = task.date.split('-').map(Number)
  const monthLabel = new Date(year, month - 1, day).toLocaleDateString(i18n.language, {
    month: 'short'
  })
  return (
    <div
      role='button'
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => event.key === 'Enter' && onOpen()}
      className={`w-full text-left pl-6 pr-4 py-2 cursor-pointer hover:bg-overlay-faint group flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-accent-primary ${last ? '' : 'border-b border-overlay-subtle'}`}
    >
      <div className='w-10 flex-shrink-0 rounded-xl bg-accent-primary/10 py-1 flex flex-col items-center leading-none'>
        <span className='text-[10px] font-extrabold uppercase text-accent-primary'>
          {monthLabel}
        </span>
        <span className='mt-0.5 text-base font-bold text-text-primary tabular-nums'>{day}</span>
      </div>
      <div className='min-w-0 flex-1'>
        <p className='text-sm font-semibold text-text-primary truncate group-hover:text-accent-primary'>
          {upcomingText(task)}
        </p>
        <p className='text-xs text-text-tertiary truncate'>{birthdayMeta(task, t)}</p>
      </div>
    </div>
  )
}
