import test from 'brittle'

import {
  formatWhenFromNow,
  formatWhenShort,
  yearlyLabel,
  birthdayMeta,
  birthdaysByMonth,
  upcomingText
} from '../src/utils/upcomingFormat.js'

const t = (key, options) => (options ? `${key}:${options.count ?? options.age}` : key)
const NOW = new Date(2026, 5, 10, 12, 0).getTime()
const date = (offsetDays) => {
  const d = new Date(2026, 5, 10 + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test('a task today with a time says in minutes or hours', (t2) => {
  t2.is(
    formatWhenFromNow({ date: date(0), time: '12:25' }, t, 'en', NOW),
    'upcoming.when.inMinutes:25'
  )
  t2.is(
    formatWhenFromNow({ date: date(0), time: '12:00' }, t, 'en', NOW),
    'upcoming.when.inMinutes:1'
  )
  t2.is(
    formatWhenFromNow({ date: date(0), time: '15:00' }, t, 'en', NOW),
    'upcoming.when.inHours:3'
  )
})

test('tasks without a time say today, tomorrow, or give the date', (t2) => {
  t2.is(formatWhenFromNow({ date: date(0) }, t, 'en', NOW), 'upcoming.when.today')
  t2.is(formatWhenFromNow({ date: date(-2) }, t, 'en', NOW), 'upcoming.when.today', 'overdue')
  t2.is(formatWhenFromNow({ date: date(1) }, t, 'en', NOW), 'upcoming.when.tomorrow')
  t2.ok(formatWhenFromNow({ date: date(9) }, t, 'en', NOW).includes('Jun'))
})

test('short label is the time today and the weekday this week', (t2) => {
  t2.is(formatWhenShort({ date: date(0) }, 'en', NOW), '')
  t2.ok(formatWhenShort({ date: date(0), time: '15:30' }, 'en', NOW).includes('3:30'))
  t2.is(formatWhenShort({ date: date(2) }, 'en', NOW), 'Fri')
  t2.is(formatWhenShort({ date: date(20) }, 'en', NOW), 'Jun 30')
})

test('birthday shows the age, or "every year" when the start year is unknown', (t2) => {
  t2.is(yearlyLabel({ date: '2026-06-14', sinceYear: 1962 }, t), 'upcoming.turns:64')
  t2.is(yearlyLabel({ date: '2026-06-14' }, t), 'upcoming.everyYear')
  t2.is(
    birthdayMeta({ date: date(4), sinceYear: 1962 }, t, NOW),
    'upcoming.turns:64 · upcoming.when.inDays:4'
  )
  t2.is(birthdayMeta({ date: date(1) }, t, NOW), 'upcoming.everyYear · upcoming.when.tomorrow')
})

test('birthdays group by month in order', (t2) => {
  const months = birthdaysByMonth(
    [{ date: '2026-06-02' }, { date: '2026-06-20' }, { date: '2026-07-01' }],
    'en'
  )
  t2.alike(
    months.map((m) => m.items.length),
    [2, 1]
  )
  t2.is(months[0].title, 'June')
})

test('row text falls back from name to text', (t2) => {
  t2.is(upcomingText({ name: 'Mum', text: 'x' }), 'Mum')
  t2.is(upcomingText({ text: 'Call bank' }), 'Call bank')
})
