import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { CheckSquare } from 'lucide-react'

import { loadUpcomingGroups } from '@pear-notes/core/store/services/upcomingTasks.js'
import { selectNote } from '@pear-notes/core/store/slices/notesSlice.js'

import ToolPanel, { TOOL_GROUP_HEADER_CLASS, ToolEmpty } from './ToolPanel'

const REFRESH_MS = 30 * 1000

function formatDue(task, language) {
  const [year, month, day] = task.date.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const label = date.toLocaleDateString(language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
  if (!task.time) return label
  const [hour, minute] = task.time.split(':').map(Number)
  date.setHours(hour, minute)
  return `${label} · ${date.toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' })}`
}

export function TaskRow({ task, last, onOpen }) {
  const { t, i18n } = useTranslation()
  return (
    <button
      type='button'
      onClick={onOpen}
      className={`w-full text-left pl-6 pr-4 py-3 cursor-pointer bg-transparent hover:bg-overlay-faint group ${last ? '' : 'border-b border-overlay-subtle'}`}
    >
      <div className='flex items-start gap-3'>
        <CheckSquare
          className={`w-4 h-4 mt-1 flex-shrink-0 ${task.checklist ? 'text-accent-primary' : 'text-text-tertiary'}`}
        />
        <div className='min-w-0 flex-1'>
          <p className='text-base font-bold tracking-tight text-text-primary group-hover:text-accent-primary line-clamp-2'>
            {task.text}
          </p>
          <div className='flex items-center gap-1.5 mt-1 opacity-60 text-xs font-bold tracking-wider min-w-0'>
            <span className='flex-shrink-0 whitespace-nowrap'>
              {formatDue(task, i18n.language)}
            </span>
            <span className='flex-shrink-0'>•</span>
            <span className='truncate'>{task.title || t('noteCard.untitled')}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

export default function UpcomingList({ onToggleSidebar, isSidebarCollapsed }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const [groups, setGroups] = useState(null)

  const refresh = useCallback(() => {
    loadUpcomingGroups()
      .then(setGroups)
      .catch(() => setGroups([]))
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, REFRESH_MS)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  const count = groups ? groups.reduce((sum, group) => sum + group.items.length, 0) : 0

  return (
    <ToolPanel
      title={t('upcoming.title')}
      status={t('upcoming.count', { count })}
      hint={t('upcoming.hint')}
      onToggleSidebar={onToggleSidebar}
      isSidebarCollapsed={isSidebarCollapsed}
    >
      {groups && count === 0 && (
        <ToolEmpty title={t('upcoming.emptyTitle')} body={t('upcoming.emptyBody')} />
      )}
      {groups?.map(({ group, items }) => (
        <div key={group} className='mb-6'>
          <h3 className={TOOL_GROUP_HEADER_CLASS}>{t(`upcoming.groups.${group}`)}</h3>
          {items.map((task, index) => (
            <TaskRow
              key={`${task.noteKey}-${index}-${task.text}`}
              task={task}
              last={index === items.length - 1}
              onOpen={() => dispatch(selectNote(task.noteKey))}
            />
          ))}
        </div>
      ))}
    </ToolPanel>
  )
}
