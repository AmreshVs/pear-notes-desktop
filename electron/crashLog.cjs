// Bare prints an uncaught error and its stack to stderr right before it aborts,
// so the tail of stderr is the only place a backend crash explains itself.
const STDERR_TAIL_CHARS = 64 * 1024
const CRASH_LOG_LINES = 40

function appendStderr(tail, chunk) {
  return (tail + chunk).slice(-STDERR_TAIL_CHARS)
}

function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
}

// The uncaught error block when Bare printed one, else the last lines it wrote.
function backendCrashLog(stderr) {
  const text = stripAnsi(stderr || '').trimEnd()
  if (!text) return { error: '', log: '' }
  const uncaught = text.lastIndexOf('Uncaught')
  if (uncaught === -1)
    return { error: '', log: text.split('\n').slice(-CRASH_LOG_LINES).join('\n') }
  const log = text.slice(uncaught)
  return { error: log.split('\n')[0], log }
}

module.exports = { appendStderr, backendCrashLog }
