import { spawn } from 'node:child_process'

const HEARTBEAT_MS = 60_000

export function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

export function startHeartbeat(label, since = Date.now(), intervalMs = HEARTBEAT_MS) {
  const timer = setInterval(() => {
    process.stdout.write(
      `\x1b[2m    ${label} — ${formatDuration(Date.now() - since)} elapsed\x1b[0m\n`
    )
  }, intervalMs)
  timer.unref()
  return () => clearInterval(timer)
}

export function streamCommand(command, args, options = {}) {
  const { heartbeat, ...spawnOptions } = options
  const started = Date.now()
  const stop = heartbeat ? startHeartbeat(heartbeat, started) : null

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...spawnOptions, stdio: ['inherit', 'pipe', 'pipe'] })
    let output = ''

    const tee = (stream, sink) => {
      stream.setEncoding('utf8')
      stream.on('data', (chunk) => {
        output += chunk
        sink.write(chunk)
      })
    }

    tee(child.stdout, process.stdout)
    tee(child.stderr, process.stderr)

    child.on('error', (error) => {
      if (stop) stop()
      reject(error)
    })

    child.on('close', (status) => {
      if (stop) stop()
      resolve({ status, output, durationMs: Date.now() - started })
    })
  })
}
