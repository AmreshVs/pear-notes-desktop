import { useEffect, useState } from 'react'
import { getUpdateStatus } from '@pear-notes/core/utils.js'
import { version as appVersion } from '../../package.json'

export async function checkAppUpdate() {
  const manifest = await window.electronBridge.checkAppUpdate()
  const desktop = manifest?.desktop
  if (!desktop) return null

  const { mandatory, updateAvailable } = getUpdateStatus({
    currentVersion: appVersion,
    latestVersion: desktop.latestVersion,
    minimumVersion: desktop.minimumVersion
  })

  return {
    mandatory,
    updateAvailable,
    latestVersion: desktop.latestVersion,
    downloadUrl: desktop.downloadUrl
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
