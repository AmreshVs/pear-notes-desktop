import { useTranslation } from 'react-i18next'
import { Bell, Cake, CalendarDays, Check, CheckSquare } from 'lucide-react'

import { isAppointment } from '@pear-notes/core/store/services/noteTasks.js'

import { formatWhenShort, upcomingText, yearlyLabel } from '../../utils/upcomingFormat'

function DoneButton({ task, pending, onToggle }) {
  const { t } = useTranslation()
  const label = t(task.done ? 'upcoming.markNotDone' : 'upcoming.markDone')
  const shape = task.checklist ? 'rounded-[5px]' : 'rounded-full'
  const fill = task.done
    ? 'bg-accent-primary border-accent-primary text-accent-on-primary'
    : 'border-text-tertiary hover:border-accent-primary text-transparent hover:text-accent-primary/60'
  return (
    <button
      type='button'
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      onKeyDown={(event) => event.stopPropagation()}
      disabled={pending}
      title={label}
      aria-label={label}
      aria-pressed={!!task.done}
      className={`w-[18px] h-[18px] mt-[3px] flex-shrink-0 border-[1.5px] flex items-center justify-center transition-colors disabled:opacity-40 ${shape} ${fill}`}
    >
      <Check className='w-3 h-3' strokeWidth={3} />
    </button>
  )
}

export default function UpcomingTaskRow({ task, last, onOpen, onToggleDone, pending, remind }) {
  const { t, i18n } = useTranslation()
  const yearly = task.yearly ? yearlyLabel(task, t) : ''
  const when = formatWhenShort(task, i18n.language)
  return (
    <div
      role='button'
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => event.key === 'Enter' && onOpen()}
      className={`w-full text-left pl-6 pr-4 py-3 cursor-pointer hover:bg-overlay-faint group focus-visible:outline-2 focus-visible:outline-accent-primary ${last ? '' : 'border-b border-overlay-subtle'}`}
    >
      <div className='flex items-start gap-3'>
        {isAppointment(task) ? (
          <CalendarDays className='w-[18px] h-[18px] mt-[3px] flex-shrink-0 text-accent-primary' />
        ) : onToggleDone ? (
          <DoneButton task={task} pending={pending} onToggle={onToggleDone} />
        ) : (
          <CheckSquare
            className={`w-4 h-4 mt-1 flex-shrink-0 ${task.checklist ? 'text-accent-primary' : 'text-text-tertiary'}`}
          />
        )}
        <div className='min-w-0 flex-1'>
          <p
            className={`text-base font-bold tracking-tight line-clamp-2 group-hover:text-accent-primary ${task.done ? 'line-through text-text-tertiary' : 'text-text-primary'}`}
          >
            {upcomingText(task)}
          </p>
          <p className='mt-1 text-xs text-text-tertiary truncate'>
            {yearly ? `${yearly} · ` : ''}
            {task.title || t('noteCard.untitled')}
          </p>
        </div>
        <div className='flex items-center gap-1.5 mt-1 flex-shrink-0'>
          {remind && <Bell className='w-3 h-3 text-accent-primary' />}
          {task.yearly && <Cake className='w-4 h-4 text-accent-primary' />}
          <span className='text-xs font-bold text-accent-primary whitespace-nowrap tabular-nums'>
            {when}
          </span>
        </div>
      </div>
    </div>
  )
}
