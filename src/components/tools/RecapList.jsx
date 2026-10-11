import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useStore } from 'react-redux'

import { buildRecap, isRecapEmpty } from '@pear-notes/core/store/services/recap.js'
import { loadUpcomingGroups } from '@pear-notes/core/store/services/upcomingTasks.js'
import { getNotesData, selectNote } from '@pear-notes/core/store/slices/notesSlice.js'

import ToolPanel, { TOOL_GROUP_HEADER_CLASS, ToolEmpty } from './ToolPanel'
import TaskRow from './UpcomingTaskRow'

function NoteRow({ note, last, onOpen, language, untitled }) {
  return (
    <button
      type='button'
      onClick={onOpen}
      className={`w-full text-left pl-6 pr-4 py-3 cursor-pointer bg-transparent hover:bg-overlay-faint group ${last ? '' : 'border-b border-overlay-subtle'}`}
    >
      <p className='text-base font-bold tracking-tight text-text-primary group-hover:text-accent-primary truncate'>
        {note.title || untitled}
      </p>
      <p className='mt-1 opacity-60 text-xs font-bold tracking-wider'>
        {new Date(note.updatedAt).toLocaleDateString(language, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })}
      </p>
    </button>
  )
}

export default function RecapList({ onToggleSidebar, isSidebarCollapsed }) {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const store = useStore()
  const [recap, setRecap] = useState(null)

  const refresh = useCallback(() => {
    const notes = Object.entries(getNotesData(store.getState()) ?? {}).map(([key, value]) => ({
      key,
      ...value
    }))
    loadUpcomingGroups()
      .catch(() => [])
      .then((groups) => setRecap(buildRecap({ groups, notes })))
  }, [store])

  useEffect(() => {
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh])

  const open = (key) => dispatch(selectNote(key))
  const untitled = t('noteCard.untitled')
  const section = (title, rows) =>
    rows.length > 0 && (
      <div className='mb-6'>
        <h3 className={TOOL_GROUP_HEADER_CLASS}>{title}</h3>
        {rows}
      </div>
    )

  return (
    <ToolPanel
      title={t('tools.recap')}
      hint={t('recap.hint')}
      onToggleSidebar={onToggleSidebar}
      isSidebarCollapsed={isSidebarCollapsed}
    >
      {recap && isRecapEmpty(recap) && (
        <ToolEmpty title={t('recap.emptyTitle')} body={t('recap.emptyBody')} />
      )}
      {recap &&
        section(
          t('recap.comingUp'),
          recap.comingUp.map((task, index) => (
            <TaskRow
              key={`${task.noteKey}-${index}-${task.text}`}
              task={task}
              last={index === recap.comingUp.length - 1}
              onOpen={() => open(task.noteKey)}
            />
          ))
        )}
      {recap &&
        section(
          t('recap.edited', { count: recap.editedCount }),
          recap.edited.map((note, index) => (
            <NoteRow
              key={note.key}
              note={note}
              last={index === recap.edited.length - 1}
              onOpen={() => open(note.key)}
              language={i18n.language}
              untitled={untitled}
            />
          ))
        )}
      {recap &&
        section(
          t('recap.yearAgo'),
          recap.yearAgo.map((note, index) => (
            <NoteRow
              key={note.key}
              note={note}
              last={index === recap.yearAgo.length - 1}
              onOpen={() => open(note.key)}
              language={i18n.language}
              untitled={untitled}
            />
          ))
        )}
    </ToolPanel>
  )
}
