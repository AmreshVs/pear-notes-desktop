let pendingFeature = null

export function requestAiSettingsFocus(feature) {
  pendingFeature = feature
}

export function peekAiSettingsFocus() {
  return pendingFeature
}

export function takeAiSettingsFocus() {
  const feature = pendingFeature
  pendingFeature = null
  return feature
}
