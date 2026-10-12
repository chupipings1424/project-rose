import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import type { Reminder } from '../../shared/reminders.ts'

/**
 * The always-on-top Windows popup (ported from the old To-Do & Alarms app).
 * alarm.ps1 draws a WinForms window and reports the button you pressed back to
 * this server's API.
 */
export function createNativeAlarm(options: { enabled: boolean; scriptPath: string; port: number }) {
  const open = new Set<string>()

  return function showNativeAlarm(reminder: Reminder, dueLabel: string): void {
    if (!options.enabled || open.has(reminder.id)) return
    let script: string
    try {
      script = readFileSync(options.scriptPath, 'utf8')
    } catch {
      console.error(`[alarm] ${options.scriptPath} is missing - no desktop popup.`)
      return
    }
    // -EncodedCommand runs the script as a command, so execution policy can't block it.
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    open.add(reminder.id)
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-STA', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded],
      {
        windowsHide: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          ALARM_TITLE: reminder.text,
          ALARM_DUE: dueLabel,
          ALARM_TASKID: reminder.id,
          ALARM_PORT: String(options.port),
        },
      },
    )
    child.on('error', (error) => {
      open.delete(reminder.id)
      console.error(`[alarm] could not open the popup: ${error.message}`)
    })
    child.on('exit', () => open.delete(reminder.id))
  }
}