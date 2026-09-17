import { backendApi } from '@pear-notes/core/backend/api.js'
import { appBoot } from '@pear-notes/core/bootTimeline.js'

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
