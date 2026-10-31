import test from 'brittle'
import { createRequire } from 'module'

import { crashDetails, formatCrashReport, reportCrash, getCrash } from '../src/lib/crashReport.js'

const require = createRequire(import.meta.url)
const { appendStderr, backendCrashLog } = require('../electron/crashLog.cjs')

const BARE_ABORT = [
  '[pairing] listening for a joining device',
  "\x1b[31mUncaught (in promise) TypeError: Cannot read properties of null (reading 'dht')",
  '    at Member._poll (file:///app/node_modules/blind-pairing/index.js:398:20)',
  '    at Scheduler._ontimeout (bare:/bare.js:5681:17)\x1b[39m'
].join('\n')

test('a backend crash keeps the uncaught error and its stack', (t) => {
  const { error, log } = backendCrashLog(BARE_ABORT)
  t.is(error, "Uncaught (in promise) TypeError: Cannot read properties of null (reading 'dht')")
  t.ok(log.includes('at Member._poll'), 'keeps the stack')
  t.absent(log.includes('[pairing]'), 'drops the log lines before the error')
  t.absent(log.includes('\x1b['), 'strips terminal colours')
})

test('a backend crash without an uncaught error keeps the last lines', (t) => {
  const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`).join('\n')
  const { error, log } = backendCrashLog(lines)
  t.is(error, '')
  t.is(log.split('\n').length, 40)
  t.ok(log.endsWith('line 99'))
  t.alike(backendCrashLog(''), { error: '', log: '' })
})

test('the stderr tail is bounded', (t) => {
  let tail = ''
  for (let i = 0; i < 100; i++) tail = appendStderr(tail, 'x'.repeat(1024))
  t.is(tail.length, 64 * 1024)
})

test('crash details show the error once, how the process ended, and the stack', (t) => {
  const details = crashDetails({
    ...backendCrashLog(BARE_ABORT),
    exitCode: null,
    signal: 'SIGABRT'
  })
  const lines = details.split('\n')
  t.ok(lines[0].startsWith('Uncaught (in promise) TypeError'))
  t.is(lines[1], '(exit code null, signal SIGABRT)')
  t.is(details.match(/Uncaught/g).length, 1, 'the error line is not repeated')
  t.ok(details.includes('at Member._poll'))
})

test('the copied report carries the context needed to act on it', (t) => {
  const report = formatCrashReport(
    {
      source: 'backend',
      at: Date.UTC(2026, 9, 29),
      error: 'Uncaught Error: boom',
      log: 'Uncaught Error: boom\n    at x (y.js:1:1)',
      exitCode: null,
      signal: 'SIGABRT',
      env: {
        appVersion: '1.1.0',
        platform: 'darwin',
        arch: 'arm64',
        osRelease: '25.0.0',
        electron: '45.0.0'
      }
    },
    { title: 'Pear Notes stopped working', message: 'It stopped.' }
  )
  t.ok(report.startsWith('Pear Notes stopped working\nIt stopped.'))
  t.ok(report.includes('Version: v1.1.0'))
  t.ok(report.includes('System: darwin arm64 25.0.0'))
  t.ok(report.includes('Source: backend'))
  t.ok(report.includes('Time: 2026-10-29T00:00:00.000Z'))
  t.ok(report.includes('at x (y.js:1:1)'))
})

test('only the first crash is kept', (t) => {
  reportCrash({ source: 'backend', error: 'first' })
  reportCrash({ source: 'renderer', error: 'second' })
  t.is(getCrash().error, 'first')
})
