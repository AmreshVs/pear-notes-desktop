import { useEffect, useState } from 'react'

import { getUpdateStatus } from '@pear-notes/core/utils.js'

import { version as appVersion } from '../../package.json'

const DOWNLOAD_HOST = 'amreshvs.github.io'

function trustedDownloadUrl(url) {
  if (typeof url !== 'string') return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname === DOWNLOAD_HOST ? url : null
  } catch {
    return null
  }
}

export async function checkAppUpdate() {
  const manifest = await window.electronBridge.checkAppUpdate()
  const desktop = manifest?.desktop
  if (!desktop) return null
  const downloadUrl = trustedDownloadUrl(desktop.downloadUrl)
  if (!downloadUrl) return null

  const { mandatory, updateAvailable } = getUpdateStatus({
    currentVersion: appVersion,
    latestVersion: desktop.latestVersion,
    minimumVersion: desktop.minimumVersion
  })

  return {
    mandatory,
    updateAvailable,
    latestVersion: desktop.latestVersion,
    downloadUrl
  }
}

export function useAppUpdateStatus() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    let cancelled = false

    checkAppUpdate()
      .then((result) => {
        if (!cancelled) setStatus(result)
      })
      .catch(() => {
        if (!cancelled) setStatus(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return status
}

export const DISMISSED_VERSION_KEY = 'pear-notes:update-banner-dismissed-version'

export const isUpdateBannerDismissed = (version) => {
  try {
    return localStorage.getItem(DISMISSED_VERSION_KEY) === version
  } catch {
    return false
  }
}
