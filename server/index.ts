/**
 * ROSE Reminders worker. Run it with `npm start` (or `npm run reminders`).
 *
 *   - stores reminders in server/data/reminders.json (git-ignored)
 *   - checks every 15 seconds what is due
 *   - rings each one as a Web Push notification on your phone(s) and as an
 *     always-on-top popup on this Windows PC
 *
 * Node runs this TypeScript directly (--experimental-strip-types): no build step.
 */
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describeRepeat, type Reminder } from '../shared/reminders.ts'
import { createHandler } from './reminders/app.ts'
import { JsonFile } from './reminders/jsonFile.ts'
import { readLegacyTasks } from './reminders/legacyImport.ts'
import { createNativeAlarm } from './reminders/nativeAlarm.ts'
import { loadVapidKeys, PushService, type PushDevice, type VapidKeys } from './reminders/push.ts'
import { ReminderService } from './reminders/ReminderService.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.REMINDERS_PORT ?? 5176)
const dataDir = path.resolve(process.env.REMINDERS_DATA_DIR ?? path.join(here, 'data'))
const contact = process.env.ROSE_PUSH_CONTACT ?? 'https://github.com/chupipings1424/project-rose'
const nativeAlarms = process.platform === 'win32' && process.env.NO_NATIVE_ALARM !== '1'
const TICK_MS = 15_000

// ---- data ---------------------------------------------------------------
const remindersFile = new JsonFile<Reminder[]>(path.join(dataDir, 'reminders.json'), () => [])

// First run only: bring over the tasks from the old To-Do & Alarms app.
const legacy = process.env.TODO_APP_DIR && path.join(process.env.TODO_APP_DIR, 'tasks.json')
if (legacy && !existsSync(remindersFile.file) && existsSync(legacy)) {
  const imported = readLegacyTasks(legacy)
  remindersFile.write(imported)
  console.log(`imported ${imported.length} task(s) from ${legacy}`)
}

const reminders = new ReminderService(remindersFile)
const push = new PushService(
  new JsonFile<PushDevice[]>(path.join(dataDir, 'push-devices.json'), () => []),
  loadVapidKeys(new JsonFile<VapidKeys>(path.join(dataDir, 'vapid.json'), () => ({ publicKey: '', privateKey: '' }))),
  contact,
)
const showNativeAlarm = createNativeAlarm({ enabled: nativeAlarms, scriptPath: path.join(here, 'reminders', 'alarm.ps1'), port })

// ---- scheduler ----------------------------------------------------------
const clock = (date: Date) => date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

async function ring(reminder: Reminder): Promise<void> {
  const now = new Date()
  const when = reminder.repeat === 'none' ? clock(now) : `${clock(now)} · ${describeRepeat(reminder)}`
  showNativeAlarm(reminder, when)
  const result = await push.sendToAll({
    title: `⏰ ${reminder.text}`,
    body: when,
    url: '/projects/reminders',
    tag: reminder.id,
  })
  console.log(`rang "${reminder.text}" - phones: ${result.sent} sent, ${result.failed} failed`)
}

let ticking = false
async function tick(): Promise<void> {
  if (ticking) return // a slow push round must not overlap the next tick
  ticking = true
  try {
    await Promise.all(reminders.tick().map(ring))
  } catch (error) {
    console.error('scheduler error:', error)
  } finally {
    ticking = false
  }
}

// ---- http ---------------------------------------------------------------
const handler = createHandler({
  reminders,
  push,
  nativeAlarms,
  sendTest: () =>
    push.sendToAll({
      title: '🌹 ROSE Reminders',
      body: 'Notifications work! Reminders will appear like this.',
      url: '/projects/reminders',
      tag: 'rose-test',
    }),
})

// 127.0.0.1 only: the browser reaches it through Vite's proxy, never directly.
createServer((req, res) => void handler(req, res)).listen(port, '127.0.0.1', () => {
  console.log(`reminders API on http://127.0.0.1:${port}/api/reminders  (data: ${dataDir})`)
  console.log(`desktop popups ${nativeAlarms ? 'on' : 'off'} · ${push.count} phone(s) subscribed`)
  void tick()
  setInterval(() => void tick(), TICK_MS)
})