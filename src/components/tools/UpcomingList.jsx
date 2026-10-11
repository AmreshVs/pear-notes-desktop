import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { Bell, ChevronRight } from 'lucide-react'

import {
  countOpenUpcoming,
  isFoldedGroup,
  UPCOMING_GROUP} from '@pear-notes/core/store/services/noteTasks.js'
import { selectNote } from '@pear-notes/core/store/slices/notesSlice.js'

import { useLocalToggle } from '../../hooks/useLocalToggle'
import { REMINDERS_TOGGLE_KEY } from '../../hooks/useReminders'
import { useUpcoming } from '../../hooks/useUpcoming'
import { formatWhenFromNow, yearlyLabel } from '../../utils/upcomingFormat'

import ReminderSettingsModal from './ReminderSettingsModal'
import ToolPanel, { TOOL_GROUP_HEADER_CLASS, ToolEmpty } from './ToolPanel'
import UpcomingTaskRow from './UpcomingTaskRow'

const NEXT_GROUPS = [
  UPCOMING_GROUP.TODAY,
  UPCOMING_GROUP.TOMORROW,
  UPCOMING_GROUP.THIS_WEEK,
  UPCOMING_GROUP.LATER
]

function NextCard({ task, onOpen }) {
  const { t, i18n } = useTranslation()
  return (
    <button
      type='button'
      onClick={onOpen}
      className='mx-6 mt-4 mb-2 text-left rounded-2xl bg-accent-primary/10 hover:bg-accent-primary/15 border border-accent-primary/20 px-4 py-3 flex flex-col gap-1 transition-colors'
    >
      <span className='text-[11px] font-bold tracking-[0.1em] text-text-tertiary'>
        {t('upcoming.next', { when: formatWhenFromNow(task, i18n.language) })}
      </span>
      <span className='text-base font-bold text-text-primary line-clamp-2'>{task.text}</span>
      <span className='text-xs text-text-tertiary truncate'>
        {task.yearly ? `${yearlyLabel(task, t)} · ` : ''}
        {task.title || t('noteCard.untitled')}
      </span>
    </button>
  )
}

export default function UpcomingList({ onToggleSidebar, isSidebarCollapsed }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { groups, toggleDone, isPending } = useUpcoming()
  const [remindersOn] = useLocalToggle(REMINDERS_TOGGLE_KEY, false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [openFolds, setOpenFolds] = useState(() => new Set())
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  const count = groups ? countOpenUpcoming(groups) : 0
  const overdue = groups?.find(({ group }) => group === UPCOMING_GROUP.OVERDUE)?.items.length ?? 0
  const next = groups?.find(({ group }) => NEXT_GROUPS.includes(group))?.items[0]
  const open = (task) => dispatch(selectNote(task.noteKey))
  const toggleFold = (group) =>
    setOpenFolds((current) => {
      const nextFolds = new Set(current)
      if (!nextFolds.delete(group)) nextFolds.add(group)
      return nextFolds
    })

  const renderRows = (group, items) =>
    items.map((task, index) => (
      <UpcomingTaskRow
        key={`${task.noteKey}-${task.date}-${index}-${task.text}`}
        task={task}
        last={index === items.length - 1}
        onOpen={() => open(task)}
        onToggleDone={() => toggleDone(task)}
        pending={isPending(task)}
        remind={remindersOn && !isFoldedGroup(group) && group !== UPCOMING_GROUP.OVERDUE}
      />
    ))

  const renderGroup = ({ group, items }) => {
    if (!isFoldedGroup(group)) {
      return (
        <div key={group} className='mb-6'>
          <h3
            className={`${TOOL_GROUP_HEADER_CLASS} ${group === UPCOMING_GROUP.OVERDUE ? 'text-accent-danger' : ''}`}
          >
            {t(`upcoming.groups.${group}`)}
          </h3>
          {renderRows(group, items)}
        </div>
      )
    }
    const expanded = openFolds.has(group)
    return (
      <div key={group} className='mb-2'>
        <button
          type='button'
          onClick={() => toggleFold(group)}
          aria-expanded={expanded}
          className='w-full px-6 py-2.5 flex items-center justify-between text-sm font-bold text-text-tertiary hover:text-text-primary border-t border-dashed border-overlay-soft'
        >
          <span>{t(`upcoming.folds.${group}`, { count: items.length })}</span>
          <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
        {expanded && renderRows(group, items)}
      </div>
    )
  }

  return (
    <ToolPanel
      title={t('upcoming.title')}
      status={
        overdue
          ? t('upcoming.countWithOverdue', { count, overdue })
          : t('upcoming.count', { count })
      }
      hint={t('upcoming.hint')}
      onToggleSidebar={onToggleSidebar}
      isSidebarCollapsed={isSidebarCollapsed}
      actions={
        <button
          type='button'
          onClick={() => setSettingsOpen(true)}
          title={t('upcoming.reminders.title')}
          aria-label={t('upcoming.reminders.title')}
          className={`p-2 rounded-xl border border-border-secondary active:scale-95 transition-all ${remindersOn ? 'bg-accent-primary/10 text-accent-primary' : 'bg-bg-tertiary/50 text-text-secondary hover:bg-bg-tertiary'}`}
        >
          <Bell className='w-5 h-5' />
        </button>
      }
    >
      {groups && groups.length === 0 && (
        <ToolEmpty title={t('upcoming.emptyTitle')} body={t('upcoming.emptyBody')} />
      )}
      {next && <NextCard task={next} onOpen={() => open(next)} />}
      {groups?.map(renderGroup)}
      <ReminderSettingsModal open={settingsOpen} onClose={closeSettings} />
    </ToolPanel>
  )
}
