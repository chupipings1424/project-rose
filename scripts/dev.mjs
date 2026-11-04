// Starts everything Project ROSE needs for local development with one command: `npm start`.
//
//   1. a local PostgreSQL database (Docker, from project-rose-api/docker-compose.yml),
//      unless something already listens on port 5433
//   2. the ROSE API - the .NET backend from the project-rose-api repo - unless it is
//      already running (it creates/updates the database tables on start)
//   3. the Vite dev server for this React app, which forwards /api/* to the API
//
// Login still goes through your Supabase project, configured in the API's
// appsettings.Local.json. Settings for this script come from .env.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const apiUrl = process.env.ROSE_API_URL ?? 'http://127.0.0.1:5175'
const apiDir = path.resolve(root, process.env.ROSE_API_DIR ?? '../project-rose-api')
const apiProject = path.join(apiDir, 'src', 'Rose.Api')
const dbPort = Number(process.env.ROSE_DB_PORT ?? 5433)
const children = []

const colors = { db: '\x1b[33m', api: '\x1b[35m', rose: '\x1b[36m', reset: '\x1b[0m' }
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

/** True when something accepts TCP connections on this local port. */
function isListening(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port, timeout: 1000 })
    const done = (result) => {
      socket.destroy()
      resolve(result)
    }
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
    socket.once('timeout', () => done(false))
  })
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
    // Either half stopping means ROSE is closing: stop the other half too.
    shutdown(code ?? 0)
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

async function startDatabase() {
  if (await isListening(dbPort)) {
    log('db', `PostgreSQL already listening on port ${dbPort}`)
    return true
  }
  const compose = path.join(apiDir, 'docker-compose.yml')
  if (!existsSync(compose)) {
    log('db', `Cannot find ${compose}.`)
    return false
  }
  log('db', 'starting PostgreSQL in Docker (the first time downloads the image)...')
  // --wait returns once the container's health check passes. The data survives in a Docker volume.
  const up = spawnSync('docker', ['compose', '-f', compose, 'up', '-d', '--wait'], { stdio: 'inherit' })
  if (up.status === 0) return true
  log('db', 'Could not start PostgreSQL. Is Docker Desktop running?')
  return false
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
  if (!existsSync(path.join(apiProject, 'appsettings.Local.json')) && !process.env.Supabase__Url) {
    log('api', 'Supabase is not configured. Copy appsettings.Local.example.json to appsettings.Local.json in')
    log('api', `${apiProject} and fill in your Supabase URL, publishable key and email.`)
    return
  }
  if (!(await startDatabase())) return

  log('api', 'building (the first time takes a minute)...')
  // No shell here: the folder path may contain spaces (e.g. OneDrive - Company).
  const build = spawnSync('dotnet', ['build', apiProject, '-c', 'Debug', '-nologo', '-v', 'q'], { stdio: 'inherit' })
  if (build.status !== 0) {
    log('api', 'Build failed - see the errors above.')
    return
  }

  // Run the built DLL directly (not `dotnet run`), so stopping ROSE also stops the API.
  // The working folder is the project, so appsettings*.json are found.
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