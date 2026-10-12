// Starts everything Project ROSE needs with one command: `npm start`.
//
//   1. the ROSE API - the .NET backend from the project-rose-api repo
//      (payment tracker + reminders + Swagger), unless it is already running
//   2. the Vite dev server for this React app
//
// Settings come from .env (Node loads it via --env-file-if-exists).
import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const apiUrl = process.env.ROSE_API_URL ?? 'http://127.0.0.1:5175'
const apiDir = path.resolve(root, process.env.ROSE_API_DIR ?? '../project-rose-api')
const apiProject = path.join(apiDir, 'src', 'Rose.Api')
const children = []

const colors = { api: '\x1b[35m', rose: '\x1b[36m', reset: '\x1b[0m' }
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
  for (const child of children) if (child.exitCode === null) child.kill()
  process.exit(code)
}
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

/**
 * One-time move from the old setup (Flask + Node worker) to the API's data
 * folder. Only copies files the API does not have yet, so it never overwrites.
 */
function migrateOldData(dataDir) {
  const candidates = [
    process.env.PAYMENT_TRACKER_DIR && path.join(process.env.PAYMENT_TRACKER_DIR, 'payments.xlsx'),
    path.join(root, 'server', 'data', 'reminders.json'),
    path.join(root, 'server', 'data', 'push-devices.json'),
    path.join(root, 'server', 'data', 'vapid.json'),
  ].filter(Boolean)

  mkdirSync(dataDir, { recursive: true })
  for (const source of candidates) {
    const target = path.join(dataDir, path.basename(source))
    if (existsSync(source) && !existsSync(target)) {
      copyFileSync(source, target)
      log('api', `copied ${source} -> ${target}`)
    }
  }
}

async function waitForApi(child, seconds) {
  for (let i = 0; i < seconds; i++) {
    if (child.exitCode !== null) return false
    if (await isUp(`${apiUrl}/health`)) return true
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return false
}

async function startApi() {
  if (await isUp(`${apiUrl}/health`)) {
    log('api', `already running at ${apiUrl}`)
    return
  }
  if (!existsSync(path.join(apiProject, 'Rose.Api.csproj'))) {
    log('api', `Cannot find the ROSE API at ${apiDir}.`)
    log('api', 'Clone https://github.com/chupipings1424/project-rose-api next to this folder, or set ROSE_API_DIR in .env.')
    return
  }
  if (spawnSync('dotnet', ['--version'], { stdio: 'ignore', shell: true }).status !== 0) {
    log('api', 'The .NET SDK was not found. Install .NET 9 from https://dotnet.microsoft.com/download.')
    return
  }
  if (!existsSync(path.join(apiProject, 'appsettings.Local.json')) && !process.env.Auth__AccessToken) {
    log('api', `No access token configured. Copy appsettings.Local.example.json to appsettings.Local.json in`)
    log('api', `${apiProject} and put your token in it.`)
    return
  }

  migrateOldData(path.join(apiDir, 'data'))

  log('api', 'building (the first time takes a minute)...')
  const build = spawnSync('dotnet', ['build', apiProject, '-c', 'Debug', '-nologo', '-v', 'q'], {
    stdio: 'inherit',
    shell: true,
  })
  if (build.status !== 0) {
    log('api', 'Build failed - see the errors above.')
    return
  }

  // Run the built DLL directly (not `dotnet run`), so stopping ROSE also stops the API.
  // The working folder is the project, so appsettings*.json and ../../data are found.
  const child = run('api', 'dotnet', [path.join('bin', 'Debug', 'net9.0', 'Rose.Api.dll')], {
    cwd: apiProject,
    env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development', URLS: apiUrl },
  })
  if (await waitForApi(child, 60)) log('api', `ready - Swagger UI at ${apiUrl}/swagger`)
  else log('api', 'did not start - see the messages above.')
}

await startApi()

const viteArgs = [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')]
if (process.env.ROSE_NO_OPEN !== '1') viteArgs.push('--open')
run('rose', process.execPath, viteArgs, { cwd: root })