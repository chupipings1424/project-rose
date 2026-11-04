# Project ROSE

A personal, futuristic **project hub** built with **React 19 + TypeScript + Vite**, running
for free in the cloud and installable as an app (PWA) on your PC and phone.
This repo is the **UI**. Data, login checks and background work live in the **ROSE API**, a
.NET 9 backend in its own repo: [project-rose-api](https://github.com/chupipings1424/project-rose-api).
Sign in with your email and password, pick a theme and launch your projects:

| # | Project | What it shows off |
| --- | --- | --- |
| 01 | **Payment Tracker** | A React rebuild of a Flask + Excel app: loans, instalments, payment report, Excel import/export |
| 02 | **Personal Budget** | Revenue and expense lines, net per month, a budget report |
| 03 | **Reminders** | Repeat rules and **Web Push** notifications on phone and PC |
| 04 | **Savings Goals** | Goals with deposits/withdrawals, the amount needed per month, a pace forecast and an SVG chart |
| 05 | **Habit Tracker** | Check or count habits, streaks, a 12-week heatmap, optimistic ticks (`useReducer`) and daily nudges |

**Tech:** React 19, TypeScript (strict), Vite, React Router, Recharts, Supabase Auth
(supabase-js), Vitest + Testing Library, oxlint, Service Workers, PWA manifest.
Backend: ASP.NET Core 9, EF Core + PostgreSQL (Supabase), Docker on Render, xUnit.

```
Browser / installed PWA ??HTTPS??> Render: one Docker container
                                     ?? this React app (built into wwwroot)
                                     ?? ROSE API ??> Supabase Postgres
Login: supabase-js -> Supabase Auth -> access token -> ROSE API checks it + the email allow-list
```

> New to React or TypeScript? Read **[LEARNING.md](LEARNING.md)**. It walks
> through this codebase concept by concept.

## Use it

Open your Render URL (`https://<service>.onrender.com`) and sign in. Install it as an app:

- **Edge / Chrome (PC, Android):** the install icon in the address bar.
- **iPhone (Safari):** Share > **Add to Home Screen**, then open ROSE from the Home Screen
  (iOS only allows push notifications for Home Screen apps).

You stay signed in on that device for **30 days**. Then sign in again.

Setting up the cloud (Supabase, Render, cron-job.org, backups) is a one-time job, described
step by step in the [API README](https://github.com/chupipings1424/project-rose-api#deploy-all-free).
After that, every push to `main` deploys automatically: the API repo through Render's
auto-deploy, this repo through the `deploy` job in CI (the `RENDER_DEPLOY_HOOK` secret).

## Develop locally

Clone both repos **side by side**:

```
Desktop\
  project-rose\        this repo (UI)
  project-rose-api\    the .NET API
```

One-time setup:

1. Install **Node.js 22+**, the **.NET 9 SDK** and **Docker Desktop**.
2. In `project-rose-api\src\Rose.Api`, copy `appsettings.Local.example.json` to
   `appsettings.Local.json` and fill in your Supabase URL, publishable key and email
   (git-ignored). Local development signs in with the same Supabase account.
3. Here, copy `.env.example` to `.env` (optional).

Then:

```powershell
npm install      # first time only
npm start        # local Postgres (Docker) + ROSE API + Vite
```

Open <http://localhost:5180>. The API's Swagger UI is at <http://127.0.0.1:5175/swagger>.

`npm start` runs `scripts/dev.mjs`, which:

1. starts the local Postgres (`docker compose up` in project-rose-api), unless something
   already listens on port 5433;
2. builds and starts the API, unless it already answers at `ROSE_API_URL/health`;
3. waits until the API is healthy, then starts Vite and opens the browser.

`Ctrl+C` stops the API and Vite (the database container keeps running; stop it with
`docker compose down` in project-rose-api). The local database is separate from the cloud one.

## Configuration (`.env`)

Only for local development. `.env` is git-ignored.

| Variable | Purpose |
| --- | --- |
| `ROSE_API_URL` | Where the API answers (default `http://127.0.0.1:5175`). Vite forwards `/api/*` there. |
| `ROSE_API_DIR` | Where project-rose-api is cloned (default `../project-rose-api`). |
| `ROSE_DB_PORT` | Port of the local Postgres (default `5433`). |
| `ROSE_NO_OPEN` | `1` = do not open the browser. |

Supabase settings live in the API (`appsettings.Local.json` locally, env vars on Render). The
browser fetches the public Supabase URL and key from `GET /api/config`, so the same build
works everywhere and nothing secret is in the JavaScript bundle.

> **Security:** Supabase checks the password and returns a short-lived access token (JWT),
> refreshed automatically. Every API call sends it as `Authorization: Bearer <token>`; the
> API verifies its signature and that your email is on its allow-list. Sign-ups are turned
> off in Supabase. See *Authentication* in LEARNING.md.

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

Pick the display currency at the top of the **Payment Tracker** or **Budget**: **? PHP
(default)**, $ USD, A$ AUD or ? EUR. It only changes the symbol and formatting; amounts are
never converted. The choice is saved in your browser.

## Payment Tracker and Personal Budget (Projects 01 and 02)

Both share the same data (tables in Postgres) but are separate projects on the hub:

- **Payment Tracker**: *Payments* (titles, instalments, record payments) and a *Report*
  (KPIs, repayment progress, monthly activity, status, upcoming dues).
- **Personal Budget**: *Budget* (revenue and expense lines, monthly net) and a *Report*
  (cash flow, expense mix, top items).

Each report has a year picker and a Print button. **Import** reads CSV/XLSX files and
**Download** gives you everything as an Excel workbook. Shared code (the API client, layout,
charts, import dialog) lives in `src/projects/workbook/`.

## Reminders (Project 03)

Reminders with a date and time, optionally repeating (**daily**, **weekdays**, **weekly on
chosen days**, **monthly**). The API checks every 15 seconds; when one is due it sends a
**push notification** to every phone/PC that turned notifications on.

In ROSE a ringing reminder can be snoozed (5/10/30/60 min), marked done, edited or deleted.
Missed one-off reminders stay in **Missed** until you finish them. Repeating reminders move
to their next time automatically.

```
 ROSE (browser/PWA) --/api--> ROSE API on Render --> Postgres
                                   |
 phone / PC notification <-- Web Push (VAPID) <-- background scheduler
```

The scheduler is a .NET `BackgroundService` inside the API. cron-job.org pings `/health`
every 10 minutes so Render's free plan never puts it to sleep.

## Savings Goals (Project 04)

Create a goal (name, target, optional deadline and icon), then log **deposits** and
**withdrawals** as you save. Each card shows:

- saved / target with a progress bar, and what is left;
- **what to save each month** to make the deadline;
- the **estimated finish date** at your pace over the last 90 days;
- a status: *On track*, *Behind*, *Past deadline*, *No deadline* or *Reached*.

*History* opens a step chart (hand-drawn SVG, no chart library) and every entry, which you can
delete. A withdrawal can never take more than is saved. The maths lives in the API
(`SavingsRules.cs`).

## Habit Tracker (Project 05)

Two kinds of habit:

- **Done / not done**, e.g. *Read 20 minutes*: tap a day to tick it.
- **Count towards a target**, e.g. *8 glasses of water*: pick a day, then use **-** / **+** or *Fill*.

You can change **today and the 6 days before it**; older days are locked. Each card shows the
current **streak** (a streak survives until today is over), the best streak and a **12-week
heatmap**. Ticks appear instantly and are rolled back if the API refuses (optimistic updates
with `useReducer`).

Give a habit a **nudge time** and, if it is still not done by then, ROSE sends a push
notification to the devices that turned notifications on in Reminders. One nudge per day
at most.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Local Postgres + ROSE API + Vite dev server (recommended) |
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
  api/http.ts           apiFetch: adds the access token, friendly errors, 401 = log out
  auth/                 supabase.ts (lazy client), authService (login rules), session (30 days),
                        AuthProvider, ProtectedRoute
  theme/                6 themes (5 futuristic + 1 retro), ThemeProvider, ThemePicker
  currency/             display currency (? PHP default, $ USD, A$ AUD, ? EUR)
  components/           shared UI: AppShell, Modal, toasts, stat tiles, states
  hooks/                useAsync, useDebouncedValue, useNow
  lib/format.ts         money / date helpers (formatMoney takes a currency)
  lib/migrateStorage.ts copies old febvy.* browser settings to rose.* once
  lib/serviceWorker.ts  registers public/sw.js, follows notification taps
  pages/                LoginPage, ProjectsHubPage, NotFoundPage
  projects/
    registry.ts         the list of projects shown on the hub
    workbook/           shared by the next two: API client + types, layout, charts, import
    payment-tracker/    Payments + Report pages and their components
    budget/             Budget + Report pages and their components
    reminders/          Reminders page, form, model.ts (types), push opt-in (lib/push.ts)
    savings/            Savings Goals page, goal/entry forms, SVG chart (lib/chart.ts)
    habits/             Habit Tracker page, reducer (lib/reducer.ts), heatmap, 7-day strip
  styles/global.css     design system + theme CSS variables
public/
  sw.js                 service worker: shows push notifications
  manifest.webmanifest  PWA manifest (name, icons, standalone)
scripts/dev.mjs         one-command local launcher (Postgres + API + UI)
```

## Adding a project

1. Build it under `src/projects/<id>/` with a root component.
2. Add a lazy route in `src/App.tsx`.
3. Add an entry in `src/projects/registry.ts`.

The detailed walkthrough is in LEARNING.md.
