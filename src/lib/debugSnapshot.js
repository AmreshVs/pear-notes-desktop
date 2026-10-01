import { backendApi } from '@pear-notes/core/backend/api.js'

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

const MOBILE_ONLY_SYNC_KEYS = ['lastWakeAt', 'lastWakeResult', 'backgroundServiceFailedAt']

function withoutMobileOnlySync(sync) {
  if (!sync) return sync
  return Object.fromEntries(
    Object.entries(sync).filter(([key]) => !MOBILE_ONLY_SYNC_KEYS.includes(key))
  )
}

function appSection() {
  return {
    version: getAppVersionLabel(appVersion),
    buildNumber: getBuildNumber() || null,
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
    sync: withoutMobileOnlySync(backend?.sync),
    capturedAt: backend?.capturedAt || Date.now(),
    app: appSection()
  }
}
