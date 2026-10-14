import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useStore } from 'react-redux'

import { buildRecap, isRecapEmpty } from '@pear-notes/core/store/services/recap.js'
import { getNotesData, selectNote } from '@pear-notes/core/store/slices/notesSlice.js'

import ToolPanel, { ToolEmpty } from './ToolPanel'

const DAY_MS = 24 * 60 * 60 * 1000
const RANGE_FORMAT = { month: 'short', day: 'numeric' }
const EMPTY_BAR_HEIGHT = 6
const MIN_BAR_HEIGHT = 12
const MAX_BAR_HEIGHT = 64

// "Oct 8 – 14", or "Sep 29 – Oct 5" across a month.
function formatRange(recap, language) {
  const first = new Date(recap.from)
  const last = new Date(recap.days.at(-1).start)
  const end =
    first.getMonth() === last.getMonth()
      ? last.toLocaleDateString(language, { day: 'numeric' })
      : last.toLocaleDateString(language, RANGE_FORMAT)
  return `${first.toLocaleDateString(language, RANGE_FORMAT)} – ${end}`
}

function formatDay(start, recap, t, language) {
  const today = recap.days.at(-1).start
  if (start === today) return t('recap.today')
  // Day starts can be 23 or 25 hours apart across DST, so round.
  if (Math.round((today - start) / DAY_MS) === 1) return t('recap.yesterday')
  return new Date(start).toLocaleDateString(language, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })
}

function WeekCard({ recap }) {
  const { t, i18n } = useTranslation()
  const busiest = Math.max(1, ...recap.days.map((day) => day.notes.length))

  return (
    <div className='mx-4 mb-6 p-5 rounded-2xl bg-overlay-faint flex flex-col gap-4'>
      <div className='flex items-baseline gap-2'>
        <span className='text-3xl font-extrabold tracking-tight text-text-primary tabular-nums'>
          {recap.editedCount}
        </span>
        <span className='text-sm font-semibold text-text-secondary'>
          {t('recap.notesEdited', { count: recap.editedCount })}
        </span>
      </div>
      <ul className='grid grid-cols-7 gap-2 items-end list-none m-0 p-0'>
        {recap.days.map((day, index) => {
          const count = day.notes.length
          const isToday = index === recap.days.length - 1
          const date = new Date(day.start)
          const height =
            count === 0
              ? EMPTY_BAR_HEIGHT
              : MIN_BAR_HEIGHT + ((MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) * count) / busiest
          const fill =
            count === 0
              ? 'bg-overlay-light'
              : isToday
                ? 'bg-accent-primary'
                : 'bg-accent-primary/40'
          return (
            <li
              key={day.start}
              className='flex flex-col items-center gap-2'
              aria-label={t('recap.dayBar', {
                day: date.toLocaleDateString(i18n.language, { weekday: 'long' }),
                count
              })}
            >
              <div className={`w-full rounded-lg ${fill}`} style={{ height }} />
              <span
                aria-hidden='true'
                className={`text-xs ${isToday ? 'font-extrabold text-accent-primary' : 'font-semibold text-text-tertiary'}`}
              >
                {date.toLocaleDateString(i18n.language, { weekday: 'narrow' })}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function NoteRow({ note, first, onOpen, untitled }) {
  return (
    <button
      type='button'
      onClick={onOpen}
      className='w-full flex items-center gap-3 px-4 min-h-[52px] text-left cursor-pointer bg-transparent hover:bg-overlay-faint group'
    >
      <span className='w-8 h-8 shrink-0 rounded-full bg-overlay-subtle text-text-secondary flex items-center justify-center'>
        <svg
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          className='w-4 h-4'
          aria-hidden='true'
        >
          <path d='M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z' />
          <path d='M14 3v5h5' />
        </svg>
      </span>
      <span
        className={`flex-1 min-w-0 self-stretch flex items-center ${first ? '' : 'border-t border-overlay-subtle'}`}
      >
        <span className='truncate text-base font-semibold text-text-primary group-hover:text-accent-primary'>
          {note.title || untitled}
        </span>
      </span>
    </button>
  )
}

function recapFrom(store) {
  const notes = Object.entries(getNotesData(store.getState()) ?? {}).map(([key, value]) => ({
    key,
    ...value
  }))
  return buildRecap({ notes })
}

export default function RecapList({ onToggleSidebar, isSidebarCollapsed }) {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const store = useStore()
  const [recap, setRecap] = useState(() => recapFrom(store))

  const refresh = useCallback(() => setRecap(recapFrom(store)), [store])

  useEffect(() => {
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh])

  const untitled = t('noteCard.untitled')
  const empty = isRecapEmpty(recap)
  const days = recap.days.filter((day) => day.notes.length > 0).reverse()

  return (
    <ToolPanel
      title={t('tools.recap')}
      status={t('recap.thisWeek', { range: formatRange(recap, i18n.language) })}
      hint={t('recap.privacy')}
      onToggleSidebar={onToggleSidebar}
      isSidebarCollapsed={isSidebarCollapsed}
    >
      {empty && <ToolEmpty title={t('recap.emptyTitle')} body={t('recap.emptyBody')} />}
      {!empty && (
        <div className='pt-5'>
          <WeekCard recap={recap} />
          <div className='mx-4 flex items-baseline justify-between'>
            <h3 className='text-lg font-bold text-text-primary'>{t('recap.editedTitle')}</h3>
            <span className='text-sm font-semibold text-text-tertiary'>
              {t('recap.noteCount', { count: recap.editedCount })}
            </span>
          </div>
          {days.map((day) => (
            <section key={day.start} className='mx-4 mt-5'>
              <h4 className='mx-1 mb-2 text-xs font-bold text-text-tertiary'>
                {formatDay(day.start, recap, t, i18n.language)}
              </h4>
              <div className='rounded-2xl bg-overlay-faint overflow-hidden'>
                {day.notes.map((note, index) => (
                  <NoteRow
                    key={note.key}
                    note={note}
                    first={index === 0}
                    onOpen={() => dispatch(selectNote(note.key))}
                    untitled={untitled}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </ToolPanel>
  )
}
