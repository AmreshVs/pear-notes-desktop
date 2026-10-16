import { getDeviceDisplayName } from '@pear-notes/core/utils.js'

export function syncLeaderLine(plan, t) {
  if (plan.offlineLeaders.length > 0 || plan.needsBothOnline) return null
  if (plan.leaderCount >= 3) {
    return t('sync.devices.leadersMajority', {
      needed: Math.floor(plan.leaderCount / 2) + 1,
      count: plan.leaderCount
    })
  }
  const leader = plan.leaderCount === 1 ? plan.leaders[0] : null
  if (!leader) return null
  const paused = leader.platform === 'ios'
  if (leader.isLocal) {
    return t(paused ? 'sync.devices.leaderLinePausedLocal' : 'sync.devices.leaderLineLocal')
  }
  return t(paused ? 'sync.devices.leaderLinePaused' : 'sync.devices.leaderLine', {
    name: getDeviceDisplayName(leader)
  })
}
