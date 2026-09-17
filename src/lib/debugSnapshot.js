import { backendApi } from '@pear-notes/core/backend/api.js'
import { appBoot } from '@pear-notes/core/bootTimeline.js'
import { summarizeStalledMediaReset } from '@pear-notes/core/utils.js'

import { version as appVersion } from '../../package.json'

import { getAppVersionLabel, getBuildNumber, isMasBuild } from './appFlags'

function hostVersions() {
  const versions = globalThis.process?.versions || {}
  return {
    electron: versions.electron || null,
    chrome: versions.chrome || null,
    node: versions.node || null
  }
}

function appSection() {
  return {
    version: getAppVersionLabel(appVersion),
    buildNumber: getBuildNumber() || null,
    surface: 'desktop',
    platform: globalThis.process?.platform || null,
    arch: globalThis.process?.arch || null,
    masBuild: isMasBuild(),
    ...hostVersions()
  }
}

export async function captureDebugSnapshot({ heavy = false } = {}) {
  const backend = await backendApi.getDebugInfo({ heavy })
  return {
    ...backend,
    capturedAt: backend?.capturedAt || Date.now(),
    app: appSection(),
    appBoot: appBoot.snapshot()
  }
}

export async function resetStalledMedia() {
  return summarizeStalledMediaReset(await backendApi.resetStalledMedia())
}

export function describeStalledMediaReset(summary, t) {
  if (summary.error) return summary.error
  if (summary.reset === 0 && summary.skipped === 0) return t('debug.unblockMediaNothing')
  const reset = t('debug.unblockMediaReset', { count: summary.reset })
  if (summary.skipped === 0) return reset
  const skipped = t('debug.unblockMediaSkipped', {
    count: summary.skipped,
    reasons: summary.reasons.join(', ')
  })
  return `${reset} ${skipped}`
}
