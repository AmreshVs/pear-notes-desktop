import test from 'brittle'

import { syncLeaderLine } from '../src/lib/syncLeaderLine.js'

const key = (k) => k
const plan = (leader, extra) => ({
  offlineLeaders: [],
  needsBothOnline: false,
  leaderCount: 1,
  leaders: [leader],
  ...extra
})

test('no line while a leader is offline or none is chosen', (t) => {
  const leader = { platform: 'macos', isLocal: true }
  t.is(syncLeaderLine(plan(leader, { offlineLeaders: [leader] }), key), null)
  t.is(syncLeaderLine(plan(leader, { needsBothOnline: true }), key), null)
  t.is(syncLeaderLine(plan(leader, { leaderCount: 0, leaders: [] }), key), null)
})

test('an iPhone leader is described as paused', (t) => {
  t.is(
    syncLeaderLine(plan({ platform: 'macos', isLocal: true }), key),
    'sync.devices.leaderLineLocal'
  )
  t.is(
    syncLeaderLine(plan({ platform: 'ios', isLocal: true }), key),
    'sync.devices.leaderLinePausedLocal'
  )
})
