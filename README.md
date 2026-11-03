# Project ROSE

A personal, futuristic **project hub** built with **React 19 + TypeScript + Vite**.
This repo is the **UI only**. All data and background work live in the **ROSE API**, a
.NET 9 backend with Swagger in its own repo:
[project-rose-api](https://github.com/chupipings1424/project-rose-api).
Log in with an access token, pick a theme and launch your projects:

| # | Project | What it shows off |
| --- | --- | --- |
| 01 | **Payment Tracker** | A React rebuild of a Flask + Excel app: loans, instalments, payment report, import/export |
| 02 | **Personal Budget** | Revenue and expense lines, net per month, a budget report. Same Excel workbook as 01 |
| 03 | **Reminders** | Repeat rules, a Windows always-on-top alarm popup and **Web Push** notifications (iPhone too) |
| 04 | **Savings Goals** | Goals with deposits/withdrawals, the amount needed per month, a pace forecast and an SVG chart |
| 05 | **Habit Tracker** | Check or count habits, streaks, a 12-week heatmap, optimistic ticks (`useReducer`) and daily nudges |


**Tech:** React 19, TypeScript (strict), Vite, React Router, Recharts, Vitest + Testing
Library, oxlint, Service Workers, PWA manifest. Backend: ASP.NET Core 9, Swagger, JWT, xUnit
(see project-rose-api).

Personal data stays on the PC: payments and the budget live in a local Excel workbook;
reminders, savings goals and habits in local JSON files. All of them are in the API's
git-ignored `data/` folder (or next to `ROSE.exe`, see below).

Want ROSE on another laptop? **[ROSE.exe](#roseexe-one-file-for-another-laptop)** is one
file with nothing to install.

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
npm install      # first time only
npm start        # ROSE API + ROSE UI
```

Or double-click **`start-rose.bat`**: it runs `npm start` in **one minimized window**, which
starts the API, then the UI, then opens your browser.

Open <http://localhost:5180> and log in with your access token.
The API documentation (Swagger UI) is at <http://127.0.0.1:5175/swagger>.

`npm start` runs `scripts/dev.mjs`, which:

1. checks whether the ROSE API already answers at `ROSE_API_URL/health`
2. if not: runs `dotnet build` and starts the API
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
you enter the token again.

While ROSE is closed, reminders do not ring and phone push does not arrive. They ring as soon
as you start it again. To keep ROSE running in the background, set `ROSE_AUTO_CLOSE=0`.
Then the power button is hidden and closing the browser leaves everything running.

## ROSE.exe: one file for another laptop

`package-rose.cmd` (or `npm run package`) builds **ROSE.exe**: one self-contained file with
the ROSE API *and* this UI inside. The other laptop needs **nothing installed**: no .NET,
no Node.

```
ROSE\                      made next to the two repos (ROSE_PACKAGE_DIR changes it)
  ROSE.exe                 double-click: starts ROSE and opens it in your browser
  appsettings.json         settings (port, reminder timings)
  appsettings.Local.json   your access token (copied from the API repo - keep it private)
  data\payments.xlsx       payments and budget
  data\reminders.json      reminders
  data\goals.json          savings goals (created on first use)
  data\habits.json         habits (created on first use)
```

1. On this PC (it needs Node and the .NET 9 SDK), double-click **`package-rose.cmd`**.
2. Copy the whole `ROSE` folder to the other laptop (USB stick, OneDrive...).
3. Double-click **`ROSE.exe`**. No window appears; your browser opens at <http://127.0.0.1:5175>.

- Close the last ROSE tab (or use the power button) and ROSE.exe stops 20 s later.
  Double-clicking it while it runs just opens another tab.
- Running `package-rose.cmd` again updates `ROSE.exe` and `appsettings.json` but never
  overwrites the data or token already in the folder.
- If ROSE cannot start (no token, port 5175 taken...), the reason is written to
  `rose-error.log` next to the exe and opened in Notepad.
- The session key and push keys are created per laptop on first start, so turn phone
  notifications on again there.
- Windows SmartScreen may warn the first time because the exe is not signed:
  *More info > Run anyway*.

How it works: [LEARNING.md, section 15](LEARNING.md#15-packaging-one-roseexe-for-another-laptop).

## Configuration (`.env`)

Copy `.env.example` to `.env` and edit it. `.env` is git-ignored.

| Variable | Purpose |
| --- | --- |
| `ROSE_API_URL` | Where the API answers (default `http://127.0.0.1:5175`). Vite forwards `/api/*` there. |
| `ROSE_API_DIR` | Where project-rose-api is cloned (default `../project-rose-api`). |
| `ROSE_PACKAGE_DIR` | Where `npm run package` puts ROSE.exe (default `../ROSE`). |
| `ROSE_NO_OPEN` | `1` = do not open the browser. |
| `ROSE_AUTO_CLOSE` | `0` = keep running when the last tab closes (default: close after 20 s). |

The access token, session length, reminder and push settings live in the API: see its README.

> **Security:** the access token is checked by the API (constant-time compare, at most 10
> attempts per minute). The API answers with a signed session token (a JWT, valid 12 hours)
> that the browser sends as `Authorization: Bearer ...` on every request. Nothing secret is in
> the JavaScript bundle. See *Authentication* in LEARNING.md.

## Themes

Pick a theme on the login page or from the top bar. It is saved in your browser.
Backgrounds are **static** (no looping animation, no sound), so ROSE stays light on CPU
and GPU.

| Group | Theme | Look |
| --- | --- | --- |
| Futuristic | Neon Cyberpunk | magenta and cyan on midnight violet |
| Futuristic | Deep Space | nebula blues and starlight |
| Futuristic | Matrix | phosphor-green terminal glow |
| Futuristic | Solar Flare | molten amber and plasma red |
| Futuristic | Hologram | bright iridescent glass (light) |
| Retro | Retro 8-bit | handheld-console greens, monospace type and square corners (light) |

## Currency

Pick the display currency at the top of the **Payment Tracker** or **Budget** (the other projects do not use money, so it is not in the top bar): **₱ PHP (default)**, $ USD, A$ AUD or € EUR.
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

## Savings Goals (Project 04)

Create a goal (name, target, optional deadline and icon), then log **deposits** and
**withdrawals** as you save. Each card shows:

- saved / target with a progress bar, and what is left;
- **what to save each month** to make the deadline;
- the **estimated finish date** at your pace over the last 90 days;
- a status: *On track*, *Behind*, *Past deadline*, *No deadline* or *Reached*.

*History* opens a step chart (hand-drawn SVG, no chart library) and every entry, which you can
delete. A withdrawal can never take more than is saved. Amounts follow the global currency
picker. The maths lives in the API (`SavingsRules.cs`); data goes to `data\goals.json`.

## Habit Tracker (Project 05)

Two kinds of habit:

- **Done / not done**, e.g. *Read 20 minutes*: tap a day to tick it.
- **Count towards a target**, e.g. *8 glasses of water*: pick a day, then use **-** / **+** or *Fill*.

You can change **today and the 6 days before it**; older days are locked. Each card shows the
current **streak** (a streak survives until today is over), the best streak and a **12-week
heatmap**. Ticks appear instantly and are rolled back if the API refuses (optimistic updates
with `useReducer`).

Give a habit a **nudge time** and, if it is still not done at that time, ROSE shows the same
always-on-top popup as Reminders (*Mark as done*, *Snooze*, *Dismiss*) and a push
notification on phones that turned notifications on in Reminders. One nudge per day at
most. Data goes to `data\habits.json`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | ROSE API + Vite dev server (recommended) |
| `npm run package` | Build ROSE.exe (see above); same as `package-rose.cmd` |
| `npm run dev` | Vite only (start the API yourself, see the project-rose-api README) |
| `npm test` / `npm run test:watch` | Vitest + React Testing Library |
| `npm run lint` | oxlint |
| `npm run typecheck` | `tsc -b` |
| `npm run build` / `npm run preview` | Production build / serve it |

## Project structure

```
src/
  main.tsx              entry point: storage migration + providers
                        (Router > Theme > Currency > Auth > Toast)
  App.tsx               routes (login, protected shell, lazy projects)
  api/http.ts           apiFetch: adds the session token, friendly errors, 401 = log out
  auth/                 login against the API, sessionStorage session, AuthProvider, ProtectedRoute
  theme/                6 themes (5 futuristic + 1 retro), ThemeProvider, ThemePicker
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
    savings/            Savings Goals page, goal/entry forms, SVG chart (lib/chart.ts)
    habits/             Habit Tracker page, reducer (lib/reducer.ts), heatmap, 7-day strip
  styles/global.css     design system + theme CSS variables
public/
  sw.js                 service worker: shows push notifications
  manifest.webmanifest  PWA manifest (name, icons, standalone)
scripts/dev.mjs         one-command launcher (API + UI)
scripts/package.mjs     builds ROSE.exe (package-rose.cmd)
```

## Adding a project

1. Build it under `src/projects/<id>/` with a root component.
2. Add a lazy route in `src/App.tsx`.
3. Add an entry in `src/projects/registry.ts`.

The detailed walkthrough is in LEARNING.md.
