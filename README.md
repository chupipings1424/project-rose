# Project ROSE

A personal, futuristic **project hub** built with **React 19 + TypeScript + Vite**.
This repo is the **UI only**. All data and background work live in the **ROSE API**, a
.NET 9 backend with Swagger in its own repo:
[project-rose-api](https://github.com/chupipings1424/project-rose-api).
Log in with an access token, pick a theme, walk through the gate, and launch your projects:

| # | Project | What it shows off |
| --- | --- | --- |
| 01 | **Payment Tracker** | A React rebuild of a Flask + Excel app: loans, instalments, payment report, import/export |
| 02 | **Personal Budget** | Revenue and expense lines, net per month, a budget report. Same Excel workbook as 01 |
| 03 | **Reminders** | Repeat rules, a Windows always-on-top alarm popup and **Web Push** notifications (iPhone too) |

**Tech:** React 19, TypeScript (strict), Vite, React Router, Recharts, Vitest + Testing
Library, oxlint, Service Workers, PWA manifest. Backend: ASP.NET Core 9, Swagger, JWT, xUnit
(see project-rose-api).

Personal data never leaves the PC: payments live in a local Excel workbook and reminders in a
local JSON file, both in the API's git-ignored `data/` folder.

> New to React or TypeScript? Read **[LEARNING.md](LEARNING.md)**. It walks
> through this codebase concept by concept.

## Quick start

Clone both repos **side by side**:

```
Desktop\
  project-rose\        this repo (UI)
  project-rose-api\    the .NET API
```

One-time setup:

1. Install **Node.js 22+** and the **.NET 9 SDK**.
2. In `project-rose-api\src\Rose.Api`, copy `appsettings.Local.example.json` to
   `appsettings.Local.json` and put your access token in it (that file is git-ignored).
3. Here, copy `.env.example` to `.env`.

Then:

```powershell
# double-click start.cmd, or:
npm install      # first time only
npm start        # ROSE API + ROSE UI
```

Or double-click **`start-rose.bat`**: it runs `npm start` in **one minimized window**, which
starts the API, then the UI, then opens your browser.

Open <http://localhost:5180> and log in with your access token.
The API documentation (Swagger UI) is at <http://127.0.0.1:5175/swagger>.

`npm start` runs `scripts/dev.mjs`, which:

1. checks whether the ROSE API already answers at `ROSE_API_URL/health`
2. if not: copies old data the API does not have yet (see below), runs `dotnet build`
   and starts the API
3. waits until the API is healthy, then starts Vite and opens the browser
   (set `ROSE_NO_OPEN=1` to skip)

`Ctrl+C` stops both.

### Closing ROSE

You never have to hunt for the terminal window:

- **Close the last ROSE browser tab**, and about **20 seconds** later the API, the UI and the
  window all stop. (Each open tab keeps a small live connection to `/api/system/presence`.
  When the last one is gone, the API waits 20 s, so a page refresh does not count, then
  shuts down. `npm start` notices and stops Vite too.)
- Or click the small **power button (⏻)** in the bottom-left corner of any page and confirm.

Your login lives in `sessionStorage`, so it is forgotten when the browser closes: next time
you go through the token page and the gate again.

While ROSE is closed, reminders do not ring and phone push does not arrive. They ring as soon
as you start it again. To keep ROSE running in the background, set `ROSE_AUTO_CLOSE=0`.
Then the power button is hidden and closing the browser leaves everything running.

### Moving from the old Flask + Node setup

The first `npm start` copies these into `project-rose-api\data\`. It only copies files
that are **missing** there, so it never overwrites anything:

| From | To |
| --- | --- |
| `PAYMENT_TRACKER_DIR\payments.xlsx` | `data\payments.xlsx` |
| `server\data\reminders.json`, `push-devices.json`, `vapid.json` | `data\` (same names) |

`vapid.json` is the push key pair; keeping it means your iPhone stays subscribed. The Flask
app is no longer needed. Once everything works, `server\data\` can be deleted.

## Configuration (`.env`)

Copy `.env.example` to `.env` and edit it. `.env` is git-ignored.

| Variable | Purpose |
| --- | --- |
| `ROSE_API_URL` | Where the API answers (default `http://127.0.0.1:5175`). Vite forwards `/api/*` there. |
| `ROSE_API_DIR` | Where project-rose-api is cloned (default `../project-rose-api`). |
| `PAYMENT_TRACKER_DIR` | Only used once, to copy `payments.xlsx` into the API. |
| `ROSE_NO_OPEN` | `1` = do not open the browser. |
| `ROSE_AUTO_CLOSE` | `0` = keep running when the last tab closes (default: close after 20 s). |

The access token, session length, reminder and push settings live in the API: see its README.

> **Security:** the access token is checked by the API (constant-time compare, at most 10
> attempts per minute). The API answers with a signed session token (a JWT, valid 12 hours)
> that the browser sends as `Authorization: Bearer ...` on every request. Nothing secret is in
> the JavaScript bundle. See *Authentication* in LEARNING.md.

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

**Every theme has its own gate.** The doors, the scenery, the light beyond and the sound
change with the theme:

| Theme | Gate | Sound |
| --- | --- | --- |
| Hunter x Hunter | the original stone Testing Gate in a forest | stone thud and rumble |
| Neon Cyberpunk | neon blast doors in a night city with a perspective grid floor | synth bass and zaps |
| Deep Space | airlock under the stars | hydraulic hiss and hum |
| Matrix | green code rain over a data vault | digital bleeps |
| Solar Flare | sun temple in the dunes | deep gong |
| Hologram | glass light doors | crystal chimes |
| Fullmetal Alchemist | the **Gate of Truth**: the eye opens over a glowing transmutation circle | heartbeat and choir |
| Death Note | gothic black doors, blood-red light | church bells |

All skins share one gate component. Each skin only sets CSS variables (`--g-*`) and turns on
a few extras. See `src/intro/gateSkins.ts`.

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

## Payment Tracker and Personal Budget (Projects 01 and 02)

Both read the same Excel workbook through the API, but they are separate projects on the hub:

- **Payment Tracker**: *Payments* (titles, instalments, record payments) and a *Report*
  (KPIs, repayment progress, monthly activity, status, upcoming dues).
- **Personal Budget**: *Budget* (revenue and expense lines, monthly net) and a *Report*
  (cash flow, expense mix, top items).

Each report has a year picker and a Print button. Shared code (the API client, layout, charts,
import dialog) lives in `src/projects/workbook/`.

## Reminders (Project 03)

Reminders with a date and time, optionally repeating (**daily**, **weekdays**, **weekly on
chosen days**, **monthly**). The API checks every 15 seconds; when one is due it:

- pops up the **always-on-top alarm window** on the PC (with sound, Done and Snooze), and
- sends a **push notification** to every phone/browser that turned notifications on.

In ROSE a ringing reminder can be snoozed (5/10/30/60 min), marked done, edited or deleted.
Missed one-off reminders stay in **Missed** until you finish them. Repeating reminders move
to their next time automatically.

```
 Browser --/api--> Vite :5180 --proxy--> ROSE API :5175 --> data\reminders.json
                                              |
           Windows alarm popup <--------------+
           phone / browser notification <-- Web Push (VAPID)
```

The scheduler is a .NET `BackgroundService` inside the API. Everything runs on this PC only:
the API listens on `127.0.0.1`. ROSE must be running (see *Closing ROSE*). Reminders that
fall due while it is closed ring as soon as it starts again.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | ROSE API + Vite dev server (recommended) |
| `npm run dev` | Vite only (start the API yourself, see the project-rose-api README) |
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
  api/http.ts           apiFetch: adds the session token, friendly errors, 401 = log out
  auth/                 login against the API, sessionStorage session, AuthProvider, ProtectedRoute
  theme/                8 themes (5 futuristic + 3 anime), ThemeProvider, ThemePicker
  intro/                the login gate (GateIntro, gateSkins per theme, gate.css, Web Audio sounds)
  lifetime/             PowerControl: presence connection, power button, auto-close
  currency/             display currency (₱ PHP default, $ USD, A$ AUD, € EUR)
  components/           shared UI: AppShell, Modal, toasts, stat tiles, states
  hooks/                useAsync, useDebouncedValue, useNow
  lib/format.ts         money / date helpers (formatMoney takes a currency)
  lib/migrateStorage.ts copies old febvy.* browser settings to rose.* once
  lib/serviceWorker.ts  registers public/sw.js, follows notification taps
  pages/                LoginPage, ProjectsHubPage, NotFoundPage
  projects/
    registry.ts         the list of projects shown on the hub
    workbook/           shared by the next two: Excel API client + types, layout, charts, import
    payment-tracker/    Payments + Report pages and their components
    budget/             Budget + Report pages and their components
    reminders/          Reminders page, form, model.ts (types), push opt-in (lib/push.ts)
  styles/global.css     design system + theme CSS variables
public/
  sw.js                 service worker: shows push notifications
  manifest.webmanifest  PWA manifest (name, icons, standalone)
scripts/dev.mjs         one-command launcher (API + UI)
```

## Adding a project

1. Build it under `src/projects/<id>/` with a root component.
2. Add a lazy route in `src/App.tsx`.
3. Add an entry in `src/projects/registry.ts`.

The detailed walkthrough is in LEARNING.md.
