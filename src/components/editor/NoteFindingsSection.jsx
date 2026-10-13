import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getNoteFindings } from '@pear-notes/core/store/services/noteTasks.js'
import { loadDoneIds } from '@pear-notes/core/store/services/upcomingTasks.js'

import { useLocalToggle } from '../../hooks/useLocalToggle'
import { REMINDERS_TOGGLE_KEY } from '../../hooks/useReminders'

const MINI_BUTTON =
  'text-xs font-bold rounded-lg px-2.5 py-1.5 border transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'

function dayLabel(task, language) {
  const [year, month, day] = task.date.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const label = date.toLocaleDateString(language, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(year !== new Date().getFullYear() ? { year: 'numeric' } : {})
  })
  return task.time ? `${label} ${task.time}` : label
}

export default function NoteFindingsSection({
  noteKey,
  html,
  title,
  anchor,
  showEmpty,
  insertBlocked,
  onMakeTasks
}) {
  const { t, i18n } = useTranslation()
  const [doneIds, setDoneIds] = useState(null)
  const [remindersOn, toggleReminders] = useLocalToggle(REMINDERS_TOGGLE_KEY, false)

  useEffect(() => {
    let live = true
    loadDoneIds()
      .then((ids) => live && setDoneIds(ids))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [noteKey])

  const deferredHtml = useDeferredValue(html)
  const findings = useMemo(
    () => getNoteFindings(deferredHtml, { noteKey, title, doneIds, ...(anchor ? { anchor } : {}) }),
    [anchor, deferredHtml, doneIds, noteKey, title]
  )
  const notTasks = findings.filter((task) => !task.checklist)
  if (findings.length === 0) {
    return showEmpty ? (
      <p className='text-xs text-text-tertiary leading-relaxed'>{t('inThisNote.nothingFound')}</p>
    ) : null
  }

  return (
    <section className='flex flex-col gap-2'>
      <h3 className='text-xs font-semibold text-text-tertiary'>{t('inThisNote.datesAndTasks')}</h3>
      <div className='rounded-xl border border-border-primary bg-bg-secondary p-3 flex flex-col gap-2.5'>
        {findings.map((task) => (
          <div key={`${task.date}|${task.text}`} className='flex items-start gap-2.5'>
            <span className='shrink-0 whitespace-nowrap rounded-md bg-accent-primary/15 px-1.5 py-0.5 text-[11px] font-bold text-accent-primary'>
              {dayLabel(task, i18n.language)}
            </span>
            <div className='flex flex-col gap-0.5 min-w-0'>
              <span className='text-[13px] font-semibold text-text-primary break-words'>
                {task.text}
              </span>
              {!task.checklist && (
                <span className='text-xs text-text-tertiary'>{t('inThisNote.notTaskYet')}</span>
              )}
            </div>
          </div>
        ))}
        <div className='flex flex-wrap items-center gap-1.5 pt-0.5'>
          {notTasks.length > 0 && (
            <button
              type='button'
              disabled={insertBlocked}
              onClick={() => onMakeTasks(notTasks.map((task) => task.text))}
              className={`${MINI_BUTTON} border-accent-primary bg-accent-primary text-accent-on-primary hover:bg-accent-primary/90`}
            >
              {t('inThisNote.addToUpcoming')}
            </button>
          )}
          {remindersOn ? (
            <span className='text-xs text-text-tertiary px-1'>{t('inThisNote.remindersOn')}</span>
          ) : (
            <button
              type='button'
              onClick={toggleReminders}
              className={`${MINI_BUTTON} border-border-primary bg-bg-tertiary text-text-primary hover:bg-overlay-subtle`}
            >
              {t('inThisNote.setReminders')}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
