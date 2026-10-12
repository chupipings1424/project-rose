# Project ROSE

A personal, futuristic **project hub** built with **React 19 + TypeScript + Vite**, plus a
small **Node.js + TypeScript** background worker.
Log in with an access token, pick a theme, walk through the gate, and launch your projects:

| # | Project | What it shows off |
| --- | --- | --- |
| 01 | **Payment Tracker** | A full React rebuild of a Flask + Excel app: loans, payments, budget, charts, import/export |
| 02 | **Reminders** | A background worker with repeat rules, a Windows always-on-top alarm popup and **Web Push** browser notifications |

**Tech:** React 19 · TypeScript (strict) · Vite · React Router · Recharts · Vitest + Testing
Library · oxlint · Node 22 (native TypeScript type stripping) · Web Push (VAPID) · Service
Workers · PWA manifest · PowerShell/WPF.

Personal data never leaves the PC: payments live in a local Excel workbook and reminders in a
local JSON file. Both are git-ignored.

> New to React or TypeScript? Read **[LEARNING.md](LEARNING.md)**. It walks
> through this codebase concept by concept.

## Quick start

```powershell
# double-click start.cmd, or:
npm install      # first time only
npm start        # Payment Tracker API (if needed) + Reminders worker + ROSE
```

Then open <http://localhost:5180> and log in with the token stored in `.env`
as `VITE_ROSE_TOKEN`.

`npm start` runs `scripts/dev.mjs`, which:

1. checks whether the Payment Tracker API is already running at `PAYMENT_TRACKER_URL`
2. if not, starts `app.py` from `PAYMENT_TRACKER_DIR` (with `NO_BROWSER=1`)
3. starts the Reminders worker (`server/index.ts`) unless it is already running
4. starts the Vite dev server and opens the browser (set `ROSE_NO_OPEN=1` to skip)

ROSE and the classic Payment Tracker UI share the **same `payments.xlsx`**.

## Configuration (`.env`)

Copy `.env.example` to `.env` and edit it. `.env` is git-ignored.

| Variable | Purpose |
| --- | --- |
| `VITE_ROSE_TOKEN` | Access token for the login page. Change it here; restart `npm start`. |
| `PAYMENT_TRACKER_URL` | Where the Flask API runs (default `http://127.0.0.1:5174`). |
| `PAYMENT_TRACKER_DIR` | Folder containing the Payment Tracker `app.py`. |
| `REMINDERS_PORT` | Port of the Reminders worker (default `5176`, local only). |
| `REMINDERS_DATA_DIR` | Where reminders, phones and push keys are stored (default `server/data`). |
| `ROSE_PUSH_CONTACT` | Sender contact for push services (`mailto:` or `https://`). |
| `NO_NATIVE_ALARM` | `1` turns off the Windows popup (phone push still works). |
| `TODO_APP_DIR` | One-time import of the old To-Do & Alarms app's `tasks.json`. |

> **Security note:** the token is checked in the browser, so it is a "front door
> lock", not real security. Anything prefixed `VITE_` is bundled into the JavaScript.
> See *Authentication* in LEARNING.md for the upgrade path to server-side auth.

## The entrance: the Testing Gate

A **correct token** opens a giant stone gate (inspired by the Zoldyck
*Testing Gate* from Hunter x Hunter, drawn from scratch in CSS): it lands with a
thud, the seven engraved door numbers light up, the doors swing wide, the camera
flies through and you arrive at your projects.

- A **wrong token** gets a heavy thud, the login card shakes and glows red, and an
  error message appears. The gate stays shut.
- **Esc** or **Skip** jumps straight in. The speaker button mutes the synthesized
  sound (remembered in your browser).
- It only plays when you log in, not when you refresh while already logged in.
- It is skipped automatically if your OS asks for *reduced motion*. While
  developing, add `?nogate` to the URL to skip it.

## Themes

Pick a theme on the login page or from the top bar. It is saved in your browser.

| Theme | Look |
| --- | --- |
| Neon Cyberpunk, Deep Space, Matrix, Solar Flare, Hologram | the original futuristic themes |
| **Hunter x Hunter** | Killua: blue-white lightning bolts that flicker in the background |
| **Fullmetal Alchemist** | crimson and steel blue with a slowly turning, glowing red/blue transmutation circle |
| **Death Note** | blood red on black, notebook lines, ink drips and a gothic serif font |

## Currency

Pick the display currency in the top bar: **₱ PHP (default)**, $ USD, A$ AUD or € EUR.
It only changes the symbol and formatting. Amounts are never converted. The choice is
saved in your browser. (The Excel workbook keeps its own number format.)

## Payment Tracker backend patch (delete title / delete year)

The trash icons next to the **title** dropdown (Payments) and the **year** dropdown
(Budget) need two endpoints that the original Flask app doesn't have yet:

| Endpoint | Does |
| --- | --- |
| `DELETE /api/accounts/<title>` | Deletes the title **and all its payments** in one save |
| `DELETE /api/budget/years/<year>` | Deletes every budget line in that year (and its "Budget YYYY" sheet) |

Apply the patch once, then restart `npm start`:

```powershell
cd <path-to>\payment-tracker
git apply <path-to>\project-rose\backend-patches\payment-tracker-delete.patch
py -3 -m unittest test_delete -v     # 7 new tests
```

Until it is applied, the trash icons show a message telling you to apply it.
Nothing is deleted.

## Reminders (Project 02)

Reminders with a date and time, optionally repeating (**daily**, **weekdays**, **weekly on
chosen days**, **monthly**). A background worker checks every 15 seconds; when one is due it:

- pops up the **always-on-top alarm window** on the PC (with sound, Done and Snooze), and
- sends a **Windows notification** through the browser (if you turned notifications on in Reminders).

In ROSE a ringing reminder can be snoozed (5/10/30/60 min), marked done, edited or deleted.
Missed one-off reminders stay in **Missed** until you finish them. Repeating reminders move
to their next time automatically.

```
 Browser ──/api/reminders──▶ Vite :5180 ──proxy──▶ worker :5176 ──▶ reminders.json
                                                     │
          Windows popup (alarm.ps1) ◀────────────────┤
          browser notification ◀── Web Push (VAPID) ─┘
```

The worker is plain Node 22 (`node:http`, no framework) running TypeScript directly. The
scheduling rules live in `shared/reminders.ts` and are used by **both** the worker and the
React page. Run it alone with `npm run reminders`.

Everything runs on this PC only. The worker listens on `127.0.0.1`, so nothing is
reachable from other devices. The PC must be on with `npm start` running; reminders that
fall due while it is off ring as soon as it starts again.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Payment Tracker API + Reminders worker + Vite dev server (recommended) |
| `npm run dev` | Vite only (start the APIs yourself) |
| `npm run reminders` | Reminders worker only |
| `npm test` / `npm run test:watch` | Vitest + React Testing Library |
| `npm run lint` | oxlint |
| `npm run typecheck` | `tsc -b` |
| `npm run build` / `npm run preview` | Production build / serve it |

## Project structure

```
src/
  main.tsx              entry point: storage migration + providers
                        (Router > Theme > Currency > Auth > Toast > Entrance)
  App.tsx               routes (login, protected shell, lazy projects)
  auth/                 token check, session storage, AuthProvider, ProtectedRoute
  theme/                8 themes (5 futuristic + 3 anime), ThemeProvider, ThemePicker
  intro/                the login gate (EntranceProvider, GateIntro, GateDoor, gate.css, Web Audio)
  currency/             display currency (₱ PHP default, $ USD, A$ AUD, € EUR)
  components/           shared UI: AppShell, Modal, toasts, stat tiles, states
  hooks/                useAsync, useDebouncedValue, useNow
  lib/format.ts         money / date helpers (formatMoney takes a currency)
  lib/migrateStorage.ts copies old febvy.* browser settings to rose.* once
  lib/serviceWorker.ts  registers public/sw.js, follows notification taps
  pages/                LoginPage, ProjectsHubPage, NotFoundPage
  projects/
    registry.ts         the list of projects shown on the hub
    payment-tracker/    api client + types, pages, components, styles
    reminders/          Reminders page, form, push opt-in (lib/push.ts)
  styles/global.css     design system + theme CSS variables
shared/reminders.ts     types + repeat/scheduling rules used by BOTH browser and worker
server/
  index.ts              Reminders worker entry: 15s tick, push, popup, legacy import
  reminders/            HTTP routes, ReminderService, PushService, JSON storage, alarm.ps1
public/
  sw.js                 service worker: shows push notifications
  manifest.webmanifest  PWA manifest (name, icons, standalone)
scripts/dev.mjs         one-command launcher
backend-patches/        changes for the Payment Tracker Flask app (see below)
```

## Adding a project

1. Build it under `src/projects/<id>/` with a root component.
2. Add a lazy route in `src/App.tsx`.
3. Add an entry in `src/projects/registry.ts`.

The detailed walkthrough is in LEARNING.md.
