// Starts everything Project ROSE needs with one command: `npm start`.
//
//   1. the Payment Tracker Flask server (unless it is already running)
//   2. the Reminders worker - rings reminders as popups + notifications (server/index.ts)
//   3. the Vite dev server for the React app
//
// Settings come from .env (Node loads it via --env-file-if-exists).
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const trackerUrl = process.env.PAYMENT_TRACKER_URL ?? 'http://127.0.0.1:5174'
const trackerDir = process.env.PAYMENT_TRACKER_DIR
const remindersPort = process.env.REMINDERS_PORT ?? '5176'
const children = []

const colors = { tracker: '\x1b[35m', reminders: '\x1b[33m', rose: '\x1b[36m', reset: '\x1b[0m' }
const log = (name, message) => console.log(`${colors[name]}[${name}]${colors.reset} ${message}`)

/** True when a server answers this URL within 1.5s. */
async function isUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) })
    return res.ok
  } catch {
    return false
  }
}

function findPython() {
  for (const [cmd, args] of [['py', ['-3']], ['python', []], ['python3', []]]) {
    const probe = spawnSync(cmd, [...args, '--version'], { stdio: 'ignore' })
    if (probe.status === 0) return [cmd, args]
  }
  return null
}

function run(name, cmd, args, options = {}) {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options })
  const forward = (chunk) =>
    chunk
      .toString()
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => log(name, line))
  child.stdout.on('data', forward)
  child.stderr.on('data', forward)
  child.on('exit', (code) => {
    log(name, `stopped (exit code ${code})`)
    if (name === 'rose') shutdown(code ?? 0)
  })
  children.push(child)
  return child
}

function shutdown(code = 0) {
  for (const child of children) if (!child.killed) child.kill()
  process.exit(code)
}
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

if (await isUp(`${trackerUrl}/api/now`)) {
  log('tracker', `already running at ${trackerUrl}`)
} else if (!trackerDir || !existsSync(path.join(trackerDir, 'app.py'))) {
  log('tracker', 'PAYMENT_TRACKER_DIR is not set or has no app.py - skipping the backend.')
  log('tracker', 'Set it in .env, or start the payment tracker yourself.')
} else {
  const python = findPython()
  if (!python) {
    log('tracker', 'Python 3 was not found on PATH - cannot start the payment tracker.')
  } else {
    const port = new URL(trackerUrl).port || '5174'
    log('tracker', `starting from ${trackerDir}`)
    run('tracker', python[0], [...python[1], 'app.py'], {
      cwd: trackerDir,
      env: { ...process.env, NO_BROWSER: '1', PORT: port, PYTHONUNBUFFERED: '1' },
    })
  }
}

if (await isUp(`http://127.0.0.1:${remindersPort}/api/reminders/status`)) {
  log('reminders', `already running on port ${remindersPort}`)
} else {
  // Node 22 runs TypeScript directly by stripping the types - no build step.
  run(
    'reminders',
    process.execPath,
    ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', path.join(root, 'server', 'index.ts')],
    { cwd: root, env: { ...process.env, REMINDERS_PORT: remindersPort } },
  )
}

const viteArgs = [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')]
if (process.env.ROSE_NO_OPEN !== '1') viteArgs.push('--open')
run('rose', process.execPath, viteArgs, { cwd: root })