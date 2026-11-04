# Learning React + TypeScript with Project ROSE

This guide walks through ROSE one concept at a time. Each section points at real
files in this repo. Open them side by side with this guide; they are commented
on purpose.

**Suggested order:** read a section, open the file, change something small, and
watch the browser update (Vite hot-reloads on save).

---

## 0. The toolchain in one minute

| Tool | Role | Where |
| --- | --- | --- |
| **Vite** | Dev server + bundler. Serves `index.html` and compiles TS/JSX on the fly. | `vite.config.ts` |
| **TypeScript** | JavaScript plus types. `tsc -b` checks the types; Vite only strips them. | `tsconfig*.json` |
| **React** | Builds the UI from components. | everything in `src/` |
| **React Router** | Maps URLs to components. | `src/App.tsx` |
| **Vitest + Testing Library** | Unit and component tests. | `*.test.ts(x)` |
| **oxlint** | Fast linter that catches bugs and React-hook mistakes. | `npm run lint` |

Startup flow: `index.html` → `src/main.tsx` → `<App />` → routes → pages.

---

## 1. Components and JSX

A component is **a function that returns JSX** (HTML-like syntax that compiles to
`React.createElement` calls).

- Simple: `src/components/Brand.tsx`, `src/components/StatTile.tsx`
- With children: `src/components/Modal.tsx` renders whatever you put inside it.

```tsx
interface StatTileProps { label: string; value: string; hint?: string }
export function StatTile({ label, value, hint }: StatTileProps) { ... }
```

Things to notice:
- **Props are typed with an `interface`.** `hint?:` means optional.
- JSX uses `className` instead of `class`, and `{expression}` to embed JavaScript.
- Lists need a stable `key`: see `.map(...)` in `PaymentsTable.tsx`.
- Conditional rendering: `{showForm && <PaymentForm ... />}` in `PaymentsPage.tsx`.

**Try it:** add a `hint` to one of the StatTiles on the Payment Tracker report (`ReportPage.tsx`).

---

## 2. State: `useState` and controlled inputs

State is data that, when changed, makes React **re-render** the component.

- `src/pages/LoginPage.tsx`: the email and password fields are **controlled inputs**:
  `value={email}` + `onChange={(event) => setEmail(event.target.value)}`. React state is
  the single source of truth. A third piece of state, `reveal`, switches the password
  field between `type="password"` and `type="text"` (the Show/Hide button).
- `src/projects/payment-tracker/components/PaymentForm.tsx`: many fields, one
  `useState` each, and `handleSubmit` calls `e.preventDefault()`.

Rules of thumb:
- Never mutate state (`list.push(x)`); create a new value (`[...list, x]`).
- If something can be **calculated from props or state, don't store it.** Derive
  it during render. `NewTitleDialog.tsx` derives its "needs input" message
  instead of syncing it with an effect.
- Expensive initial value? Use a lazy initializer: `useState(() => compute())`
  (see `ImportDialog.tsx`).

---

## 3. Effects: `useEffect` and cleanup

Effects synchronize a component with **something outside React**: timers,
network, `localStorage`, the DOM.

- `src/hooks/useNow.ts`: `setInterval` in the effect, `clearInterval` in the
  cleanup function.
- `src/auth/AuthProvider.tsx`: schedules an auto-logout timer when the session
  expires.
- `src/hooks/useAsync.ts`: the `cancelled` flag. If the component unmounts or
  the inputs change before a request finishes, the stale result is ignored.

```ts
useEffect(() => {
  let cancelled = false
  load().then((d) => { if (!cancelled) setData(d) })
  return () => { cancelled = true }   // cleanup
}, [dependency])
```

The dependency array says "re-run when these change". `[]` means "on mount only".

---

## 4. Custom hooks

A custom hook is a function starting with `use` that calls other hooks. It's how
you **reuse stateful logic**, not UI.

| Hook | What it teaches |
| --- | --- |
| `useAsync<T>` | Generics + loading/error/data state machine + `reload` |
| `useDebouncedValue` | Delaying an update with a timer + cleanup |
| `useNow` | A ticking clock (used on the hub) |
| `useAuth`, `useTheme`, `useCurrency`, `useToast` | Reading context with a helpful error if the provider is missing |

---

## 5. Context: app-wide state without prop drilling

Context lets any component read a value without passing props through every level.
ROSE uses four, wired up in `src/main.tsx`:

```
<BrowserRouter> > <ThemeProvider> > <CurrencyProvider> > <AuthProvider> > <ToastProvider> > <App/>
```

Each one is split into three files (a common, lint-friendly pattern):
1. `xxxContext.ts`: `createContext` + the value's **type**
2. `XxxProvider.tsx`: owns the state, provides the value
3. `useXxx.ts`: a hook that reads the context and throws if it's missing

Study `src/theme/`. The provider writes `data-theme` on `<html>`, and CSS does the rest.

Then compare `src/currency/`, the same pattern applied to money:

```tsx
const { money, compactMoney } = useCurrency()
money(1234.5)        // '₱1,234.50'  (or $ / A$ / €, whatever is picked in the top bar)
```

Because components read `money` from context, changing the currency re-renders
every amount instantly **without re-fetching any data**. Note the design choice:
the hub's `ProjectStat` type is a union (`{ value: string } | { amount: number }`),
so money stays a *number* until render time and can follow the currency.
`NewTitleDialog.tsx` does the same: it stores the raw schedule preview and
formats it during render.

`src/components/toast/` uses context for an *action* rather than a value: `useToast()`
gives `notify(message, tone)`. A page just calls `notify('Saved', 'success')`; it never
needs to know how or where toasts are drawn. That is the **dependency inversion** idea
from SOLID, in React form.

---

## 6. Routing with React Router

`src/App.tsx` is the map of the app:

- **Layout routes** (no `path`): `<ProtectedRoute />` and `<AppShell />` render an
  `<Outlet />` where child routes appear. That's how every page inside the shell
  gets the header and the auth check.
- **ProtectedRoute** (`src/auth/ProtectedRoute.tsx`) redirects to `/login` and
  remembers where you wanted to go (`state.from`).
- **Nested routes**: `/projects/payment-tracker/*` hands the rest of the URL to
  `PaymentTrackerApp.tsx`, which has its own `<Routes>` inside a shared layout
  (`workbook/WorkbookLayout.tsx`: it takes the title and the tabs as props, so Payment
  Tracker and Personal Budget reuse it with their own `<NavLink>`s).
- **URL state**: `PaymentsPage.tsx` stores the selected title in the query string
  with `useSearchParams`, so you can bookmark or refresh it.
- **Code splitting**: `lazy(() => import(...))` + `<Suspense fallback>`. The tracker
  and the chart library download only when first opened. Run `npm run build` and
  look for the separate `PaymentTrackerApp-*.js` chunk.

---

## 7. TypeScript patterns used here

| Pattern | Example | Why |
| --- | --- | --- |
| `interface` for object shapes | `api/types.ts` | Documents exactly what the API returns |
| Union of literals | `status: 'Paid' \| 'Unpaid'` | Typos become compile errors |
| **Discriminated union** | `LoginResult` in `authService.ts` | `if (result.ok)` narrows to the right fields |
| **Type guard** | `isSession(value): value is Session` | Safely turn `unknown` (e.g. `JSON.parse`) into a typed value |
| **Generics** | `useAsync<T>`, `request<T>()` in `api/client.ts` | One function, many result types, still typed |
| `as const satisfies` | `THEMES` in `theme/themes.ts` | Keeps literal ids *and* checks the shape |
| Derived types | `type ThemeId = (typeof THEMES)[number]['id']` | One source of truth |
| `import type` | everywhere | Required by `verbatimModuleSyntax`; erased at build time |
| Typed DTOs + mapping | `ReminderDto` / `fromDto` in `reminders/api/client.ts` | The API's snake_case JSON is typed; the page keeps camelCase |

Tip: hover anything in VS Code to see its inferred type.

---

## 8. Talking to a backend

All data comes from the **ROSE API**, a separate .NET 9 project
([project-rose-api](https://github.com/chupipings1424/project-rose-api)). Its Swagger UI at
<http://127.0.0.1:5175/swagger> (local development) lists every endpoint and lets you try them out.

- `src/api/http.ts` is the one door to the API. `apiFetch()` adds
  `Authorization: Bearer <access token>` (from `accessToken()`, section 12), turns "cannot reach the server" into a friendly
  message, and on **401** clears the session and fires `rose:unauthorized`, which
  `AuthProvider` listens for to send you back to the login page.
- Each API area has its own typed client (`workbook/api/client.ts`,
  `reminders/api/client.ts`). Components call `workbookApi.summary(title)` and get typed
  data back; they never call `fetch` themselves. Payment Tracker and Personal Budget both
  import `workbookApi`: two features, one data source, one client.
- **Error messages come from the server.** The API answers errors as RFC 7807
  *problem details* (`{ title, status, detail }`), and `errorMessage()` shows the `detail`.
- **snake_case vs camelCase.** The API speaks `due_at`; the reminders page uses `dueAt`.
  `reminders/api/client.ts` maps between them in one place (`fromDto` / `toDto`), so the
  rest of the UI never sees the wire format.
- **Downloads need the token too.** A plain `<a href>` cannot send an `Authorization`
  header, so `downloadFile()` fetches the bytes and hands the browser a temporary `blob:` URL.
- **Vite proxy** (`vite.config.ts`): the browser calls `/api/...` on port 5180 and Vite
  forwards it to the API at `ROSE_API_URL`. No CORS setup, and no hard-coded backend address.
- After a mutation the API returns fresh data and the page calls `setData(...)` from
  `useAsync`, so there's no extra reload round-trip.

---

## 9. Patterns worth stealing

- **Reset state with `key`:** in `BudgetSectionTable.tsx` each editable cell's
  `key` includes its amount. When the server value changes, React throws the old
  cell away and creates a fresh one with fresh state. No effect is needed.
- **Mount only when open:** `Modal.tsx` renders children only while open, so
  forms inside start clean each time.
- **Theme-aware charts:** `workbook/components/ReportCharts.tsx` colours use `var(--c1)` etc., so
  charts recolour when you switch theme.
- **Open/Closed hub:** `ProjectsHubPage.tsx` just loops over `PROJECTS`. Adding a
  project never touches the hub.

---

## 10. Styling and themes

`src/styles/global.css` defines design tokens as **CSS custom properties**:

```css
[data-theme='neon'] { --bg: #0b0420; --accent: #ff2bd6; --accent-2: #00f0ff; ... }
```

Components only use `var(--accent)` and never raw colours, so a theme is just a
new block of variables. `index.html` applies the saved theme **before** React
loads, which avoids a flash of the wrong theme.

**Try it:** add another theme. Add an entry to `THEMES` in `themes.ts` and a matching
`[data-theme='yourid']` block in `global.css`. TypeScript will tell you if you
missed a field.

The picker groups themes with a `group` field (`'futuristic' | 'retro'`), and the
**Retro 8-bit** theme shows two more tricks:

- **Specificity.** `[data-theme='x']` and `:root` have the *same* specificity, so
  whichever comes later in the file wins. To override base variables such as
  `--font-display` and `--radius`, Retro uses `html[data-theme='retro']`, which is one
  notch more specific. That one block swaps in a monospace font and square corners.
- **A palette is a design decision.** Retro uses the four greens of an old handheld
  console for the whole UI, plus a few extra inks (`--c1` ... `--c6`) so the charts
  stay readable.
- **Unique SVG ids.** The logo in `Brand.tsx` uses a `<linearGradient id=...>`.
  It appears twice on some pages, and duplicate ids break gradients, so the
  component gets a unique id from React's `useId()`.

**Renaming safely.** When Febvy became ROSE, the `localStorage` keys changed from
`febvy.*` to `rose.*`. `src/lib/migrateStorage.ts` runs once before React renders.
It copies the old values without overwriting new ones and deletes the old keys, so
nobody loses their saved theme. Rename + migrate is a pattern you will meet with
databases too.

---

### Static on purpose: cheap on CPU and GPU

ROSE used to have looping background animations, per-theme art and a login entrance
with synthesized sound. They looked great but kept the GPU busy on every frame, even
while you were only reading a table. Now:

- the background (`Background.tsx`: two blurred orbs, a perspective grid, scanlines) is
  **painted once** and never animates;
- the only animations left are short, one-off ones that answer an action: a dialog
  opening, a toast sliding in, the loading spinner;
- `@media (prefers-reduced-motion: reduce)` turns even those off.

Rule of thumb: an `animation: ... infinite` costs power for as long as the page is open.
Use motion to answer something the user did, not as decoration.

---

## 11. Testing

```powershell
npm test            # run once
npm run test:watch  # re-run on save
```

- **Pure logic** is the easiest to test: `lib/format.test.ts`,
  `payment-tracker/lib/dueBadge.test.ts`, `auth/authService.test.ts`.
- **Components** are tested the way a user would use them:
  `pages/LoginPage.test.tsx` types into the field with `userEvent` and asserts on
  what's visible (`screen.getByRole(...)`), not on internal state.
- `vi.stubGlobal('fetch', ...)` replaces the network (`test/mockLoginApi.ts` is a fake
  login endpoint), and `vi.useFakeTimers` / a `now` parameter make time deterministic.
- The API has its own xUnit tests: run `dotnet test` in project-rose-api.

TDD loop (Kent Beck): write a failing test → make it pass → refactor.

---

## 12. Authentication

ROSE does not store passwords itself. **Supabase Auth** does that, and ROSE only checks the
result. Files: `src/auth/supabase.ts`, `authService.ts`, `session.ts`, `AuthProvider.tsx`.

1. The login page calls `login(email, password)` in `authService.ts`.
2. `getSupabase()` creates the Supabase client on first use. It needs the project URL and
   the **publishable key**, which it fetches from `GET /api/config`. They are public by
   design (they only let you *ask* Supabase to log in), and fetching them means the same
   build works locally and in the cloud.
3. `supabase.auth.signInWithPassword()` sends the email and password to Supabase. If they
   match, Supabase returns an **access token** (a JWT that expires after an hour) and a
   **refresh token**. supabase-js stores both in `localStorage` (`rose.supabase`) and
   quietly swaps the refresh token for a new access token before the old one expires.
4. ROSE then calls `GET /api/auth/session` with `Authorization: Bearer <access token>`.
   The API checks the **signature** with Supabase's public keys (JWKS), the issuer, the
   audience, the expiry, and finally that the token's user id (`sub`) has a **ROSE
   account**. A stranger who somehow has a Supabase account gets **403** and is signed out
   again. The check lives on the server, so editing the browser code cannot skip it. The
   answer also says whether you are an **admin** and whether you still **must change your
   password**; `session.ts` keeps both flags.
5. `session.ts` remembers the login for **30 days** (`rose.login` in `localStorage`).
   Supabase's free plan cannot limit session length, so ROSE does it in the browser:
   `AuthProvider` logs you out when `expiresAt` passes.
6. From then on `apiFetch()` asks `accessToken()` for a fresh token on every request. A
   **401** from the API logs you out.

**What is a JWT?** Three base64url parts: `header.payload.signature`. The payload is
readable by anyone (paste a token into <https://jwt.io>: you will see your email, `role`,
`exp`). The signature is what makes it trustworthy: Supabase signs with a private key, the
API verifies with the matching public key, so nobody can change the payload without
breaking the signature. Never put secrets in a JWT payload.

**Why lazy-load supabase-js?** `supabase.ts` uses `await import('@supabase/supabase-js')`
instead of a normal import, and `authService.ts` imports only *types* from it (`import type`
disappears at build time). Vite therefore puts the library (about 200 KB) in its own chunk,
loaded only when someone logs in or calls the API, which keeps the first page load small.

**Adding or removing a person:** open **Users** (admins only) and add their email with a
temporary password. The API creates the Supabase login for them (with its secret key) and a
ROSE account. Sign-ups are switched off, so nobody can create their own account.

### Accounts: one app, separate data

- **Owner on every row.** Each table in the API has an `owner_id` (your Supabase user id).
  The API reads the id from the verified token, never from the request body, and every query
  filters by it. That is why the React code did not change at all for separate data: the
  same `GET /api/savings/goals` simply returns *your* goals.
- **Flags drive routes.** `ProtectedRoute` sends anyone with `mustChangePassword` to
  `/change-password` first (the API also answers 403 everywhere else, so skipping the
  redirect in the browser gains nothing). `AdminRoute` is the same idea for `/admin/users`.
  A route guard is just a component that renders either `<Outlet />` or `<Navigate />`.
- **Refresh on start.** `AuthProvider` asks `/api/auth/session` again whenever the app
  opens: if the admin reset your password you are sent to choose a new one, and if your
  account was removed (403) you are logged out. Offline? It keeps the saved session.
- **Two kinds of log out.** `logout()` (you clicked it) first turns off push on this device
  (`forgetThisDevice()`, loaded with `import()` only then), because that needs a valid token.
  `endSession()` (token already rejected) just forgets the login; calling the API there
  would get another 401 and loop.
- **Secure random passwords.** `temporaryPassword()` uses `crypto.getRandomValues`, never
  `Math.random()`, and skips bytes that would make some letters more likely than others.

**Tests never talk to Supabase.** `src/test/mockLogin.ts` replaces `getSupabase()` with a
fake client (`vi.mock`), and the API's integration tests mint their own tokens with a
test-only key.

---

## 13. Adding a new project (step by step)

1. Create `src/projects/my-thing/MyThingApp.tsx`:
   ```tsx
   export default function MyThingApp() {
     return <section className="card"><h1>My Thing</h1></section>
   }
   ```
2. Register a lazy route in `src/App.tsx`, next to the payment tracker:
   ```tsx
   const MyThingApp = lazy(() => import('./projects/my-thing/MyThingApp'))
   // ...
   <Route path="/projects/my-thing/*" element={<MyThingApp />} />
   ```
3. Add an entry to `PROJECTS` in `src/projects/registry.ts` (replace or keep the
   "coming soon" slot), with `path: '/projects/my-thing'`.
4. Optional: give it `loadStats` so the hub card shows live numbers.

---

## 14. Reminders: a background service, Web Push and service workers

Project 03 needs code that runs **when no page is open**: something has to watch the clock
and ring. That lives in the API as a .NET `BackgroundService` (`SchedulerWorker`) that ticks
every 15 seconds and runs every registered `IScheduledJob` (the reminder ringer, and since
Project 05 the habit nudger too, see section 17). The rules (repeat, snooze, "the 31st rings on the last day of short
months") are pure functions that take the time as an argument, so the API's tests can ask
"what rings at 09:00 on 31 January?" without waiting or mocking clocks.

The page only shows and edits reminders: `reminders/model.ts` holds the `Reminder` type and
`describeRepeat()` ("Every Mon, Thu") for display.

(This worker started as Node + TypeScript inside this repo. It was ported to .NET and
checked against the old version with the same inputs before the switch.)

**Web Push in four steps:**

1. The API creates a **VAPID key pair** once (stored in the database). The public key
   identifies *your* server to Apple/Google.
2. The page calls `Notification.requestPermission()`, **directly inside the click handler**
   (iOS ignores it otherwise), then `pushManager.subscribe({ applicationServerKey })`.
3. The browser returns a **subscription** (a secret URL at Apple's push service plus
   encryption keys). The page POSTs it to the API, which stores it in the database.
4. When a reminder is due, the API encrypts the message and POSTs it to that URL. Apple
   wakes the phone, which wakes **`public/sw.js`**, which calls `showNotification`.

**Service workers** are scripts the browser keeps *outside* your page. They can run when no
tab is open, which is the only way a closed app can react to a push. ROSE's service worker
does nothing else (no offline caching), which keeps it simple and avoids stale-code surprises.

**PWA = a website that can be installed.** `manifest.webmanifest` (name, icons,
`display: standalone`) plus the `apple-touch-icon` lets Edge's *Install app* turn
ROSE into its own window with an icon. (On iPhone, web push only works for apps added to
the Home Screen.)

The scheduler only rings if the API is running. On Render's free plan a service sleeps
after 15 minutes without traffic, so cron-job.org calls `/health` every 10 minutes
(section 15).

## 15. Shipping ROSE: Docker, Render and a PWA

ROSE used to be a Windows exe. Now it is one website, so it works on any laptop or phone
with nothing to copy. The pieces (files are in the API repo):

| Piece | File | Job |
| --- | --- | --- |
| Docker image | `Dockerfile` | Builds the UI and the API and packs both into one container |
| Hosting | `render.yaml` | Render *Blueprint*: a free Docker web service in Singapore |
| Local database | `docker-compose.yml` | The same Postgres version on your PC (port 5433) |
| CI/CD | `.github/workflows/ci.yml` (both repos) | Tests on every push; `main` deploys |
| Keep awake | cron-job.org | `GET /health` every 10 minutes |
| Backup | `ops/backup/rose-backup.yml` | Weekly encrypted `pg_dump` into a private repo |

**A multi-stage Dockerfile.** Each `FROM` starts a fresh stage; only the last one becomes
the image.

1. `node:24-alpine` downloads this repo, runs `npm ci` and `npm run build` -> `dist/`.
2. `dotnet/sdk:9.0` restores and publishes the API (copying the `.csproj` files first, so
   Docker can reuse the cached restore layer when only code changed).
3. `dotnet/aspnet:9.0` (runtime only, much smaller) gets the published API plus `dist/` as
   `wwwroot`. It runs as a non-root user, with `TZ=Asia/Manila` so "09:00" means Manila time.

The SDKs and node_modules never reach the final image; that is the point of multi-stage builds.

**One origin.** The API serves the React files from `wwwroot` (`UseStaticFiles`) next to
`/api/...`, so the UI's relative `fetch('/api/...')` calls just work. No CORS, the same way
Vite's proxy works in development. Two details in `Program.cs`:

- **SPA fallback.** `/projects/budget` is not a file: it is a React Router route.
  `MapFallbackToFile("{*path:nonfile:regex(^(?!api/).*$)}", "index.html")` answers every
  non-file, non-API address with `index.html`, and React Router takes over in the browser.
  Unknown `/api/...` addresses still get a real 404.
- **Caching.** Vite puts a content hash in every asset name (`index-CfnYa5gm.js`), so those
  are cached for a year (`immutable`). `index.html` and `sw.js` are `no-cache`, so a new
  deploy is picked up on the next visit.

**Configuration without secrets in git.** ASP.NET Core reads settings from several
places, later ones winning: `appsettings.json` -> `appsettings.Production.json` ->
`appsettings.Local.json` -> **environment variables**. On Render the connection string and
Supabase settings are env vars (`Supabase__Url`: `__` stands for `:`), typed once in the
dashboard (`sync: false` in `render.yaml`).

**Continuous delivery.** Push to `main` -> CI runs the tests -> Render rebuilds the image
-> `/health` must answer before Render switches traffic to the new container. A broken
build never replaces the running one.

**The PWA.** `manifest.webmanifest` (name, icons, `display: standalone`) and a service
worker make ROSE *installable*: Edge/Chrome show an install icon, and iPhone's *Add to
Home Screen* gives it its own icon and window (and, on iOS, permission to receive push).

---

## 16. Savings Goals: derived state with `useMemo` and a hand-drawn SVG chart

Files: `src/projects/savings/` (UI), `Rose.Domain/Savings/SavingsRules.cs` (API).

**Store the facts, derive the rest.** A goal stores only its target, deadline and list of
entries. "Saved", "per month", "estimated finish" and the status are *computed* from those
by the API every time. Nothing can drift out of sync because nothing is stored twice.

The page does the same on its side. `SavingsApp.tsx` keeps the goal list in state and
derives the header numbers and the active/reached split:

```tsx
const summary = useMemo(() => summarize(data ?? []), [data])
const active  = useMemo(() => (data ?? []).filter((g) => g.status !== 'done'), [data])
```

`useMemo` re-runs the function only when `data` changes, not on every render (for example
while you type in a form). `summarize()` lives in `lib/summary.ts` as a **pure function**, so
the test calls it directly without rendering anything. Do not reach for `useMemo` by default:
use it when the work is not trivial or when a stable object/array matters to a child.

**Immutable updates.** After saving an entry the API returns the whole updated goal, and
`replace()` swaps it in with `data.map((g) => (g.id === changed.id ? changed : g))`. A
*new* array is what tells React something changed; mutating `g.saved = ...` would not.

**SVG without a library.** `SavingsChart.tsx` draws the running total as a step line.
`lib/chart.ts` turns points into coordinates (`chartGeometry`): scale x by time and y by
amount, flip y because SVG's y grows downwards, then build a `d="M0,80 L40,80 L40,50 ..."`
path (`M` = move to, `L` = line to). Each deposit adds two points (same x, old then new
balance), which draws the "balance jumps on deposit" steps. It is plain maths, so it can be
tested without a browser.

**Testing a `<dialog>`.** jsdom (the fake browser in Vitest) has no `showModal()`, so the
test adds a tiny polyfill in `beforeEach` (see `SavingsApp.test.tsx`). Without it the
dialog stays closed and Testing Library cannot type into it.

## 17. Habit Tracker: `useReducer`, optimistic updates and a CSS-grid heatmap

Files: `src/projects/habits/` (UI), `Rose.Domain/Habits/HabitRules.cs`,
`Rose.Application/Habits/` (API).

**Optimistic update = show it first, confirm later.** Ticking a day should feel instant, so
the page updates the screen *before* the API answers, and undoes it if the API says no:

```ts
dispatch({ type: 'dayChanged', id, date, value })          // screen updates now
try {
  dispatch({ type: 'dayConfirmed', habit: await habitsApi.setDay(id, date, value) })
} catch (error) {
  dispatch({ type: 'dayFailed', id, date, previous })      // roll back + toast
}
```

**Why `useReducer` here and `useState` elsewhere?** With several actions touching the same
list (load, add, edit, delete, tick, confirm, roll back) a reducer keeps every state change
in one pure function, `lib/reducer.ts`. Pure means: same state + same action = same result,
no fetch, no `Date.now()`. So `reducer.test.ts` checks each transition with plain objects.
The reducer also counts pending ticks per habit, so a slow answer for an *earlier* tick
cannot overwrite a newer one on screen.

**The heatmap is just CSS grid.** `lib/days.ts` builds 12 Monday-first weeks of dates and
`intensity()` maps each day to a level 0-4. `Heatmap.tsx` renders one `<span>` per day in a
grid with `grid-auto-flow: column` and 7 rows, so the days fill top-to-bottom, then the next
week. The colour comes from a `lvl-0` ... `lvl-4` class that mixes the theme's accent
colour, so every theme keeps working. `memo()` skips re-rendering a card's heatmap when its
props did not change.

**Rules live in the API.** Streaks, "today and the 6 days before only", and "a count habit
is done when it reaches its target" are in `HabitRules.cs` and covered by xUnit tests. The UI
disables locked days for convenience, but the API still refuses them: never trust the client.

**One scheduler, many jobs (Open/Closed principle).** Reminders already had a background
worker. Instead of adding a second one, it became a generic `SchedulerWorker` that runs
every `IScheduledJob` registered in DI. `HabitNudger` is just one more job:

```csharp
services.AddSingleton<IScheduledJob>(sp => sp.GetRequiredService<HabitNudger>());
```

The desktop popup was generalised the same way (`DesktopAlarmRequest` carries the title,
header and callback URL), so the Windows alarm window serves both reminders and habits.

---

## 18. Cloud data: PostgreSQL, EF Core and Supabase

The data used to live in an Excel file and JSON files on one PC. Now it is in a **PostgreSQL**
database hosted by **Supabase** (free plan, Singapore). Files are in the API repo under
`src/Rose.Infrastructure/Persistence/`.

**Relational tables.** Each kind of data has a table in the `rose` schema: `accounts`,
`payments`, `budget_lines`, `reminders`, `push_devices`, `savings_goals` + `savings_entries`,
`habits` + `habit_days`, `app_secrets`. A savings entry points at its goal with a
**foreign key**, and `ON DELETE CASCADE` removes the entries when the goal is deleted.

**EF Core** (Entity Framework) maps C# classes to tables:

- `RoseDbContext` lists the tables (`DbSet<T>`) and their keys, indexes and relations.
  `UseSnakeCaseNamingConvention()` turns `DueAt` into the `due_at` column.
- **Migrations** are C# files that create or change the schema
  (`dotnet ef migrations add <Name>`). The API applies pending ones on startup
  (`RoseDatabase.InitializeAsync`), so a deploy upgrades the database by itself.
- **Clean architecture.** The services in `Rose.Application` only know `IRepository<T>`, an
  interface. `Rose.Infrastructure` implements it with EF Core. The unit tests use an
  in-memory fake instead, so they need no database.

**Row-level security (RLS).** Supabase also exposes every table through a public REST API.
On startup ROSE turns RLS on for every `rose` table *without* any policy, which means
"nobody may read this through that API". Only ROSE's own server connection (the table
owner) can.

**Connection pooling.** Render's free plan only speaks IPv4, so ROSE connects through
Supabase's **session pooler** (`...pooler.supabase.com:5432`, user `postgres.<ref>`).
`RoseDatabase` also retries the first connection a few times, because a cloud database can
drop a connection while it wakes up.

**Testing against a real database.** The integration tests start a throw-away Postgres in
Docker (*Testcontainers*), give every test class its own empty database, and run the whole
API against it. The same migrations, the same SQL: no surprises in production.

**Backups.** A GitHub Actions workflow in a private repo runs `pg_dump --schema=rose` every
Sunday, encrypts the dump with `gpg` (AES-256, a passphrase only you know) and commits it,
keeping the newest 12. *Download* in the Payment Tracker still gives you an Excel copy anytime.

**Why one container is enough.** The API caches each list in memory and writes every
change straight through to the database. That is safe because Render's free plan runs
exactly one instance. With two instances each would have its own cache, and you would
read from the database every time instead.

---

## Exercises (easy → harder)

1. Change the hub greeting text in `ProjectsHubPage.tsx`.
2. Add a "Remember me" checkbox to the login page: when unticked, sign out when the
   browser closes (hint: compare `localStorage` and `sessionStorage`).
3. Add a second Retro theme, e.g. amber-on-black terminal (see section 10).
4. Write a test for `formatCompactMoney` edge cases (negative numbers, zero).
5. Add a search box to `PaymentsTable` using `useDebouncedValue`.
6. Build a tiny "Notes" project that stores notes in `localStorage` and plug it
   into the hub (section 13). Write one component test for it.
7. Add a "Forgot password?" link that calls `supabase.auth.resetPasswordForEmail()`
   (section 12; Supabase sends the email).
8. Add a "yearly" repeat rule: first in the API's reminder rules (write the xUnit tests
   first), then in `REPEAT_RULES` / `describeRepeat` in `reminders/model.ts` and the form
   (section 14).
9. Add a `notes` column to `savings_goals`: change the row class, run
   `dotnet ef migrations add AddGoalNotes`, and show the notes on the card (sections 15, 18).
10. Savings: add a "Pause" flag to a goal so it is left out of the *Behind* count
    (API rule + test first, then the card; section 16).
11. Habits: show "Skipped" days (e.g. sick days) that do not break a streak. Start with a
    failing test in `HabitRulesTests.cs`, then extend the reducer (section 17).
