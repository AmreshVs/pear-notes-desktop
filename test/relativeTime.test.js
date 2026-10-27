import test from 'brittle'

import { getRelativeTime } from '../src/utils/relativeTime.js'

test('last-synced time steps from just now to minutes, hours and days', (t) => {
  const now = 10 * 86_400_000
  t.alike(getRelativeTime(now - 5_000, now), { key: 'sync.confirm.justNow', count: 0 })
  t.alike(getRelativeTime(now - 3 * 60_000, now), { key: 'sync.confirm.minutesAgo', count: 3 })
  t.alike(getRelativeTime(now - 5 * 3_600_000, now), { key: 'sync.confirm.hoursAgo', count: 5 })
  t.alike(getRelativeTime(now - 2 * 86_400_000, now), { key: 'sync.confirm.daysAgo', count: 2 })
  t.is(getRelativeTime(0, now), null)
})
