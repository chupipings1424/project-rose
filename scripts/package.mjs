// Builds ROSE.exe: ONE self-contained file holding the ROSE API and this React app.
// The other laptop needs nothing installed (no .NET, no Node). Run: `npm run package`
// (or double-click package-rose.cmd).
//
// Output - by default a ROSE folder next to the two repos (your Desktop):
//   ROSE.exe                double-click to open ROSE in your browser
//   appsettings.json        settings (port, reminder timings...)
//   appsettings.Local.json  your access token - copied from the API repo, never commit it
//   data\                   payments.xlsx (payments + budget) and reminders.json
// Re-running updates ROSE.exe and appsettings.json but never overwrites your data or token.
//
// Options (.env or environment): ROSE_API_DIR, ROSE_PACKAGE_DIR, or pass the folder: npm run package -- D:\ROSE
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const apiDir = path.resolve(root, process.env.ROSE_API_DIR ?? '../project-rose-api')
const apiProject = path.join(apiDir, 'src', 'Rose.Api')
const output = path.resolve(process.argv[2] ?? process.env.ROSE_PACKAGE_DIR ?? path.join(root, '..', 'ROSE'))
const publishDir = path.join(os.tmpdir(), `rose-publish-${process.pid}`)

function step(message) {
  console.log(`\n\x1b[36m[package]\x1b[0m ${message}`)
}

function fail(message) {
  console.error(`\n\x1b[31m[package]\x1b[0m ${message}`)
  process.exit(1)
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...options })
  if (result.status !== 0) fail(`${cmd} ${args[0]} failed - see the messages above.`)
}

/** Copies a file unless the target already has one (your data on the other laptop wins). */
function copyIfMissing(source, target) {
  const name = path.relative(output, target)
  if (existsSync(target)) return console.log(`  kept     ${name} (already there)`)
  if (!existsSync(source)) return console.log(`  skipped  ${name} (not found in ${path.dirname(source)})`)
  copyFileSync(source, target)
  console.log(`  copied   ${name}`)
}

if (!existsSync(path.join(apiProject, 'Rose.Api.csproj'))) fail(`Cannot find the ROSE API in ${apiDir}. Set ROSE_API_DIR.`)

step('1/4 Building the web UI (npm run build)...')
// shell: npm is a .cmd file on Windows. The working folder may contain spaces, which cwd handles.
run('npm', ['run', 'build'], { cwd: root, shell: true })

step('2/4 Publishing ROSE.exe (the first time downloads the .NET runtime, about a minute)...')
// No shell: the paths may contain spaces (e.g. "OneDrive - Company").
run('dotnet', ['publish', apiProject, '-c', 'Release', '-nologo', '-v', 'q', `-p:RoseUiDist=${path.join(root, 'dist')}`, '-o', publishDir])

step(`3/4 Copying to ${output}`)
mkdirSync(path.join(output, 'data'), { recursive: true })
try {
  copyFileSync(path.join(publishDir, 'ROSE.exe'), path.join(output, 'ROSE.exe'))
  console.log('  updated  ROSE.exe')
} catch (error) {
  if (error.code === 'EBUSY' || error.code === 'EPERM') fail('ROSE.exe is running - close ROSE (power button) and run this again.')
  throw error
}
copyFileSync(path.join(apiProject, 'appsettings.json'), path.join(output, 'appsettings.json'))
console.log('  updated  appsettings.json')
copyIfMissing(path.join(apiProject, 'appsettings.Local.json'), path.join(output, 'appsettings.Local.json'))
for (const file of ['payments.xlsx', 'reminders.json']) {
  copyIfMissing(path.join(apiDir, 'data', file), path.join(output, 'data', file))
}
if (!existsSync(path.join(output, 'appsettings.Local.json'))) {
  console.log('  ! No access token yet: copy appsettings.Local.example.json from the API repo into the')
  console.log('    ROSE folder as appsettings.Local.json and put your token in it.')
}

step('4/4 Cleaning up the build output...')
rmSync(publishDir, { recursive: true, force: true })
for (const project of ['Rose.Api', 'Rose.Application', 'Rose.Domain', 'Rose.Infrastructure']) {
  for (const folder of ['bin', 'obj']) {
    rmSync(path.join(apiDir, 'src', project, folder, 'Release'), { recursive: true, force: true })
  }
}
rmSync(path.join(root, 'dist'), { recursive: true, force: true })

step(`Done. Copy the whole folder ${output} to the other laptop and double-click ROSE.exe.`)