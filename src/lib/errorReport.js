import { backendApi } from '@pear-notes/core/backend/api.js'
import { formatDebugReport, formatErrorLog } from '@pear-notes/core/utils.js'

import { captureDebugSnapshot } from './debugSnapshot'

const REPORT_FILTERS = [{ name: 'Text', extensions: ['txt'] }]

export async function buildErrorReport() {
  const [snapshot, log] = await Promise.all([
    captureDebugSnapshot({ heavy: true }),
    backendApi.getErrorLog()
  ])
  return { report: `${formatDebugReport(snapshot)}\n${formatErrorLog(log)}`, log }
}

export async function saveErrorReport() {
  const bridge = typeof window !== 'undefined' ? window.electronBridge : null
  if (!bridge?.saveTextFile) throw new Error('saving files is not available')
  const { report, log } = await buildErrorReport()
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const result = await bridge.saveTextFile({
    defaultPath: `pear-notes-logs-${stamp}.txt`,
    filters: REPORT_FILTERS,
    text: report
  })
  return { saved: !result?.canceled, log }
}
