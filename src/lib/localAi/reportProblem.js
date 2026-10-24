const REPORT_URL = 'https://amreshvs.github.io/pear-notes/contact/?topic=ai-result'

export function openReportProblem() {
  window.electronBridge.openExternal(REPORT_URL)
}
