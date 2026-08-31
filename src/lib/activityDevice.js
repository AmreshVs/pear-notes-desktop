import { getActivityDeviceLabel } from '@pear-notes/core/activity.js'

const PLATFORM_LABEL_KEYS = {
  darwin: 'macOS',
  win32: 'Windows',
  linux: 'Linux',
  android: 'Android',
  ios: 'iOS'
}

export function buildDeviceLabelOptions(t) {
  const platformNames = {}
  for (const [platform, key] of Object.entries(PLATFORM_LABEL_KEYS)) {
    platformNames[platform] = t(`sync.platforms.${key}`)
  }
  return { platformNames, unknownLabel: t('sync.platforms.unknown') }
}

export function resolveActivityDeviceName(localKey, devices, t) {
  return getActivityDeviceLabel(localKey, devices, buildDeviceLabelOptions(t))
}
