import { getAppVersionLabel } from './appFlags'

const listeners = new Set()
let current = null

export function getCrash() {
  return current
}

// The first crash is the cause; later ones are its fallout and would bury it.
export function reportCrash(crash) {
  if (current || !crash) return
  current = { at: Date.now(), ...crash }
  for (const listener of listeners) listener(current)
}

export function subscribeCrash(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Crashes the main process saw: pushed while the window is up, pulled once in
// case one landed before it loaded or is why it was reloaded.
export function listenForCrashes(bridge = window.electronBridge) {
  bridge.onCrash(reportCrash)
  bridge
    .takeCrash()
    .then(reportCrash)
    .catch(() => {})
}

function formatExit({ exitCode, signal }) {
  const parts = []
  if (exitCode !== undefined) parts.push(`exit code ${exitCode}`)
  if (signal) parts.push(`signal ${signal}`)
  return parts.join(', ')
}

// What the screen shows under the message: the error, how the process ended, and the stack.
export function crashDetails(crash) {
  const lines = []
  if (crash.error) lines.push(crash.error)
  const exit = formatExit(crash)
  if (exit) lines.push(`(${exit})`)
  // A backend log opens with the same "Uncaught ..." line already shown above.
  let log = crash.log || ''
  if (crash.error && log.startsWith(crash.error)) log = log.slice(crash.error.length)
  log = log.replace(/^\n+/, '')
  if (log) lines.push('', log)
  return lines.join('\n').trim()
}

// What Copy puts on the clipboard: the details plus enough context to act on them.
export function formatCrashReport(crash, { title, message }) {
  const env = crash.env || {}
  const system = [env.platform, env.arch, env.osRelease].filter(Boolean).join(' ')
  const context = [
    env.appVersion && `Version: ${getAppVersionLabel(env.appVersion)}`,
    system && `System: ${system}`,
    env.electron && `Electron: ${env.electron}`,
    `Source: ${crash.source || 'unknown'}`,
    `Time: ${new Date(crash.at || Date.now()).toISOString()}`
  ].filter(Boolean)
  return [
    title,
    message,
    '',
    ...context,
    '',
    crashDetails(crash) || 'No error details were captured.'
  ].join('\n')
}
