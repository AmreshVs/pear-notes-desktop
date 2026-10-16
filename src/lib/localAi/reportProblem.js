const REPORT_EMAIL = 'vsamreshpro@gmail.com'

export function openReportProblem(subject) {
  window.electronBridge.openExternal(
    `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
  )
}
