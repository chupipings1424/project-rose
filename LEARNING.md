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

- `src/pages/LoginPage.tsx`: the token input is a **controlled input**:
  `value={token}` + `onChange={(e) => setToken(e.target.value)}`. React state is
  the single source of truth.
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
ROSE uses five, wired up in `src/main.tsx`:

```
<BrowserRouter> → <ThemeProvider> → <CurrencyProvider> → <AuthProvider> → <ToastProvider> → <EntranceProvider> → <App/>
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

`src/intro/` uses context for an *action* rather than a value: `useEntrance()`
gives `open()` and `deny()`. `LoginPage` calls `entrance.open()` after a correct
token and `entrance.deny()` after a wrong one. It never needs to know how the gate
or the sound works. That is the **dependency inversion** idea from SOLID, in React form.

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
<http://127.0.0.1:5175/swagger> lists every endpoint and lets you try them out.

- `src/api/http.ts` is the one door to the API. `apiFetch()` adds
  `Authorization: Bearer <session token>`, turns "server not running" into a friendly
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

The anime themes (`hunter`, `alchemist`, `deathnote`, `dragonball`, `naruto`, `bleach`, `geass`) show a few more tricks:

- **Background art in CSS.** `.bg-motif` in `Background.tsx` is an
  empty `div`. Each theme gives it a different `background-image`: SVG drawn
  inline as a `data:` URL (Killua's lightning bolts), or plain
  `repeating-linear-gradient`s (Death Note's ruled notebook lines).
- **Recolouring a drawing with a mask.** The Fullmetal Alchemist circle is a real
  drawing, turned into white lines on a transparent background
  (`src/assets/transmutation-circle.webp`). CSS uses it as a `mask` over a red/blue
  `conic-gradient`, so the lines take the gradient's colours and you can recolour
  them without editing the image. The glow (`filter: drop-shadow`) sits on the
  *parent*, because a mask would also cut away a glow on the same element.
- **Specificity.** `[data-theme='x']` and `:root` have the *same* specificity, so
  whichever comes later in the file wins. To override a base variable such as
  `--font-display`, Death Note uses `html[data-theme='deathnote']`, which is one
  notch more specific.
- **Unique SVG ids.** The logo in `Brand.tsx` uses a `<linearGradient id=...>`.
  It appears twice on some pages, and duplicate ids break gradients, so the
  component gets a unique id from React's `useId()`.

**Renaming safely.** When Febvy became ROSE, the `localStorage` keys changed from
`febvy.*` to `rose.*`. `src/lib/migrateStorage.ts` runs once before React renders.
It copies the old values without overwriting new ones and deletes the old keys, so
nobody loses their saved theme. Rename + migrate is a pattern you will meet with
databases too.

---

### Animation: how the Testing Gate works (`src/intro/`)

| File | Job |
| --- | --- |
| `EntranceProvider.tsx` | `open()` shows the gate after a correct login; `deny()` plays the thud. |
| `GateIntro.tsx` | A tiny **state machine**: phases `arrive → opening → done` (or `leaving` on Skip), driven by timers. |
| `gateConfig.ts` | Constants: door sizes and the timings shared by the code and the tests. |
| `GateDoor.tsx` | One door, rendered **recursively** (door 7 contains door 6, ...). |
| `gate.css` | All visuals: keyframes, transitions, 3D transforms, SVG-filter stone. |
| `gateSound.ts` | Sounds synthesized with the Web Audio API (no audio files). |

Ideas worth learning:

1. **Let CSS animate, let React switch phases.** React only changes `data-phase`
   on the overlay three times. Every movement (rumble, swinging doors, camera,
   flash, fade) is a CSS animation keyed off that attribute. That means 3 renders
   instead of 60 per second.
2. **3D hinges.** `perspective` on the container, `transform-style: preserve-3d`
   on every door, and `transform-origin` on the hinge edge. Because smaller doors
   are *children*, they ride along when a bigger door swings.
3. **Measure before you optimize.** Two real lessons from this gate:
   - An earlier hold-to-push version set CSS custom properties on the whole scene
     every frame: 19 fps. Custom properties are *inherited*, so every element
     restyled. Setting `style.translate` directly: 59 fps.
   - Chrome rasterises an animated `scale` at its **largest** value. Zooming to 3.4x
     meant painting about 11x the pixels on every frame. The white flash hides
     everything after 80%, so the zoom now peaks at 2.6x. The app behind the opaque
     gate is also set to `visibility: hidden`, timed with keyframes, so its blurred
     orbs stop being composited. Together they roughly doubled the frame rate.
4. **Restart a CSS animation with `key`.** `<div className="gate-dust" key={`dust-${wideOpen}`}>`
   remounts the element when the doors swing wide, so the falling dust replays.
5. **Stone without images.** `feTurbulence` (fractal noise) lit by
   `feDiffuseLighting` inside an SVG data URL gives a realistic rocky relief.
6. **Be kind:** `prefers-reduced-motion`, a Skip button, Esc, a mute toggle,
   `inert` on the app behind the overlay, and a portal (`createPortal`) so the
   overlay is not trapped inside the app's layout.
7. **Sound needs a click.** Browsers only allow audio after a user gesture. The
   gate opens straight after the login click, so the `AudioContext` it creates is allowed.
8. **Testing time.** `vi.useFakeTimers()` lets `GateIntro.test.tsx`
   fast-forward the whole animation in milliseconds.
9. **A registry of scenes.** Every theme has its own entrance, but there is still only
   one `GateIntro`: the *shell* (timers, sound, HUD, Skip). It looks up
   `SCENES[theme]` in `scenes/index.ts`, typed as `Record<ThemeId, ComponentType<SceneProps>>`,
   so TypeScript fails the build if a new theme has no scene. Adding a scene means adding
   one component and one registry line, without touching the shell: the
   *Open/Closed principle*. `gateSkins.ts` holds the sound profile and the status lines.
10. **One timeline per scene.** Each scene runs all its keyframes with the same duration,
   `var(--scene-t)` (set by the shell), and places every event with percentages. So all
   the parts stay in sync, and changing the length is one number. Big effects (the ink
   flood, the shockwave, the Geass sigils) are drawn at full size and scaled *up to*
   1, so the browser never has to rasterize a huge element.
11. **Animating a custom property.** `@property --sweep { syntax: '<angle>' }` tells the
   browser `--sweep` is an angle, so it can animate it. The transmutation circle uses it
   in a `conic-gradient` mask to *draw itself*. SVG strokes use the classic trick
   `pathLength="1"` plus animating `stroke-dashoffset` from 1 to 0 (the solar flares).

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

1. The login page sends your token to `POST /api/auth/login`.
2. The API compares it with the token in its `appsettings.Local.json` using a
   **constant-time** comparison (so timing does not reveal how many characters matched),
   and allows at most 10 attempts per minute.
3. If it matches, the API returns a **JWT** (JSON Web Token): a small signed note saying
   "this session is valid until ...". It is signed with a key only the API knows
   (`data/session-signing.key`), so the browser cannot forge or extend it.
4. `authService.ts` keeps it in `sessionStorage` (`rose.session`) and `apiFetch()` sends it
   with every request. The API rejects any request without a valid one (**401**).
   `sessionStorage` is like `localStorage`, but it is wiped when the browser closes, so
   closing the browser logs you out. Your theme stays in `localStorage` because it should
   survive.
5. After 12 hours (or if the key changes) the API answers 401 and ROSE returns to the login page.

Nothing secret is in the JavaScript bundle any more: search the built files and you will not
find the token.

**Changing the token:** edit `project-rose-api/src/Rose.Api/appsettings.Local.json`, then
restart `npm start`. To log every device out, delete `data/session-signing.key` and restart.

**Possible next step:** keep the session in an **httpOnly cookie** instead of
`sessionStorage`, so JavaScript (including any injected script) cannot read it.

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
and ring. That lives in the API as a .NET `BackgroundService` (`ReminderWorker`) that ticks
every 15 seconds. The rules (repeat, snooze, "the 31st rings on the last day of short
months") are pure functions that take the time as an argument, so the API's tests can ask
"what rings at 09:00 on 31 January?" without waiting or mocking clocks.

The page only shows and edits reminders: `reminders/model.ts` holds the `Reminder` type and
`describeRepeat()` ("Every Mon, Thu") for display.

(This worker started as Node + TypeScript inside this repo. It was ported to .NET and
checked against the old version with the same inputs before the switch.)

**Web Push in four steps:**

1. The API creates a **VAPID key pair** once (`data/vapid.json`). The public key
   identifies *your* server to Apple/Google.
2. The page calls `Notification.requestPermission()`, **directly inside the click handler**
   (iOS ignores it otherwise), then `pushManager.subscribe({ applicationServerKey })`.
3. The browser returns a **subscription** (a secret URL at Apple's push service plus
   encryption keys). The page POSTs it to the API, which stores it (`data/push-devices.json`).
4. When a reminder is due, the API encrypts the message and POSTs it to that URL. Apple
   wakes the phone, which wakes **`public/sw.js`**, which calls `showNotification`.

**Service workers** are scripts the browser keeps *outside* your page. They can run when no
tab is open, which is the only way a closed app can react to a push. ROSE's service worker
does nothing else (no offline caching), which keeps it simple and avoids stale-code surprises.

**PWA = a website that can be installed.** `manifest.webmanifest` (name, icons,
`display: standalone`) plus the `apple-touch-icon` lets Edge's *Install app* turn
ROSE into its own window with an icon. (On iPhone, web push only works for apps added to
the Home Screen.)

**Closing ROSE when the last tab closes (`src/lifetime/`).** A browser cannot reliably tell
a server "I am closing" (the page may be killed first). So ROSE flips it around:

1. Every open tab holds one long-lived request, `GET /api/system/presence`. The API answers
   with a **Server-Sent Events** stream and never finishes it.
2. The API counts the open streams (`PresenceTracker`). When a tab closes, the browser drops
   the connection and the count goes down. No goodbye message is needed.
3. A `BackgroundService` (`ShutdownWatchdog`) sees the count at 0, waits 20 seconds (a page
   refresh reconnects within that time), then calls `StopApplication()`.
4. `scripts/dev.mjs` notices that the API process exited and stops Vite, so the terminal
   window closes too.

The power button does the same thing on purpose: `POST /api/system/shutdown`. It needs an
`X-Rose-Client` header, and a plain link or form from another website cannot add custom
headers. That blocks a cheap *CSRF* trick where some other page shuts ROSE down.
`keepPresence()` in `lifetime/system.ts` reconnects after 3 seconds if the stream breaks.
That is an `async` loop stopped by an `AbortSignal`, the standard way to cancel `fetch`.

## 15. ROSE Lingo: a real database (SQLite + EF Core)

Projects 01-03 keep their data in files (an Excel workbook, JSON). ROSE Lingo (Project 04)
needs to ask questions like *"which Korean cards are due today?"* across hundreds of rows,
so it uses a real database: **SQLite**, one file (`project-rose-api/data/lingo.db`) with no
server to install. The API talks to it through **Entity Framework Core (EF Core)**, .NET's
ORM: you write C# classes and LINQ, and EF Core writes the SQL.

### The pieces

| Piece | File (in project-rose-api) | Job |
| --- | --- | --- |
| Entities | `Rose.Domain/Lingo/Card.cs`, `QuizResult.cs` | Plain C# classes with the rules (no database code) |
| `DbContext` | `Rose.Infrastructure/Lingo/LingoDbContext.cs` | The database session: `DbSet<Card> Cards`, and the table / index setup |
| Migrations | `Rose.Infrastructure/Lingo/Migrations/` | Generated C# that creates or changes the tables, one step per change |
| Migrator | `LingoDatabaseMigrator.cs` | On API start: creates `lingo.db` and applies new migrations |
| Repository | `EfLingoRepository.cs` (behind `ILingoRepository`) | The only class that writes LINQ queries, so the services stay testable |
| Design-time factory | `LingoDesignTimeFactory.cs` | Lets the `dotnet ef` tool build the DbContext without starting the API |

### How to create a SQLite database with EF Core, step by step

This is exactly how `lingo.db` was made. Run the commands in the **project-rose-api** folder.

1. **Add the packages** (versions live in `Directory.Packages.props`):

   ```powershell
   dotnet add src/Rose.Infrastructure package Microsoft.EntityFrameworkCore.Sqlite
   dotnet add src/Rose.Infrastructure package Microsoft.EntityFrameworkCore.Design
   ```

2. **Install the `dotnet ef` tool** for this repo only (a *local tool*, listed in
   `.config/dotnet-tools.json`, so everyone gets the same version):

   ```powershell
   dotnet new tool-manifest          # once per repo (already done here)
   dotnet tool install dotnet-ef --version 9.0.20
   dotnet tool restore               # on a new PC: installs what the manifest lists
   ```

3. **Write the entity**: an ordinary class with an `Id`. EF Core can use a private
   parameterless constructor, so the public constructor can still enforce your rules.

4. **Write the `DbContext`** and describe tables with the **Fluent API** (keeps database
   details out of the domain classes):

   ```csharp
   public sealed class LingoDbContext(DbContextOptions<LingoDbContext> options) : DbContext(options)
   {
       public DbSet<Card> Cards => Set<Card>();

       protected override void OnModelCreating(ModelBuilder model)
       {
           model.Entity<Card>().HasKey(c => c.Id);
           model.Entity<Card>().HasIndex(c => new { c.Language, c.DueOn }); // fast "due today"
       }
   }
   ```

5. **Register it** in dependency injection with a connection string pointing at the file:

   ```csharp
   services.AddDbContext<LingoDbContext>(o => o.UseSqlite("Data Source=data/lingo.db"));
   ```

6. **Create the first migration.** EF Core compares your classes with the last snapshot and
   generates the C# that creates the tables:

   ```powershell
   dotnet ef migrations add InitialLingo `
     --project src/Rose.Infrastructure --startup-project src/Rose.Infrastructure `
     --context LingoDbContext --output-dir Lingo/Migrations
   ```

   Open the generated `*_InitialLingo.cs`: `Up()` creates the tables, `Down()` removes them.
   Commit migrations like any other code.

7. **Create the database file.** Either by hand:

   ```powershell
   dotnet ef database update --project src/Rose.Infrastructure --context LingoDbContext
   ```

   or, like ROSE, automatically when the API starts: `LingoDatabaseMigrator` calls
   `db.Database.MigrateAsync()`. If `lingo.db` is missing it is created; if there are new
   migrations they are applied. Nothing to remember.

8. **Change the model later** (say, add `Card.Example`): edit the class, run
   `dotnet ef migrations add AddCardExample ...` (same options as step 6), restart the API.
   Your existing cards are kept; only the new column is added.

   A real example: v2 replaced the daily quiz with on-demand quizzes. `QuizResult` got a
   `Mode` (`random` / `custom`) and lost its "one quiz per language per day" unique index.
   `dotnet ef migrations add OnDemandQuiz ...` generated `*_OnDemandQuiz.cs`; its `Up()` also
   deletes the old daily-quiz rows (`migrationBuilder.Sql(...)`), because a migration can
   move or clean data as well as change tables.

### Look inside the database

`lingo.db` is a normal file. Open it with **DB Browser for SQLite** (free, sqlitebrowser.org)
or the **SQLite Viewer** extension in VS Code, and you can browse the `Cards` and
`QuizResults` tables or run SQL such as
`SELECT Term, DueOn FROM Cards WHERE Language = 'ja' ORDER BY DueOn;`.
Close ROSE first if you want to edit rows by hand. (`lingo.db-wal` / `-shm` next to it are
SQLite's write-ahead log; leave them alone.) Back it up by copying `lingo.db` while ROSE is closed.

### Things that tripped me up (and the fixes)

- **"The model has pending changes".** The unit test `LingoDbContextTests` calls
  `db.Database.HasPendingModelChanges()`, so forgetting step 8 fails the build, not production.
- **SQLite has no `DateTimeOffset` type.** EF Core stores it as text and cannot `ORDER BY`
  it in SQL, so `LingoService` sorts those in memory. `DateOnly` (e.g. `DueOn`) works fine in SQL.
- **Case-insensitive duplicates.** "Wasser" and "wasser" should be the same card:
  `EF.Functions.Collate(c.Term, "NOCASE") == term` asks SQLite to compare without case.
- **The analyzers complained about generated code.** `.editorconfig` marks
  `**/Migrations/*.cs` as `generated_code = true`.
- **Tests use the real SQLite engine**, not EF Core's in-memory fake: unit tests use an
  in-memory SQLite connection, integration tests a `lingo.db` in a temp folder. So they also
  prove the migrations really work against the same engine as production.

### On the React side

- **Spaced repetition** lives in the API (`Rose.Domain/Lingo/Srs.cs`, based on Anki's SM-2):
  *Again / Hard / Good / Easy* decides when you see a card next. The page only shows cards and
  sends the grade.
- **`key` resets a component.** `<ReviewSession key={ids}>` and `<Drill key={script + '-' + level}>`
  start fresh when their input changes, without a `useEffect` that copies props into state.
- **Keyboard shortcuts** (Space to reveal, 1-4 to grade) are one `keydown` listener added in
  `useEffect` and removed in its cleanup.
- **Text-to-speech** is the browser's free `speechSynthesis` (`lingo/lib/speech.ts`).
  `pickVoice` tries the exact tag (`zh-TW`), then any voice of the same language (`zh-*`).
  Missing a voice? Windows Settings > Time & language > Speech > *Add voices*.
- **One page, many states.** `QuizPage` is a tiny state machine: `start` (Take / Make /
  history) → `run` → `done`.
- **Show the fix, not just the error.** `TranslatePage` asks `GET /api/lingo/translator`
  first; when the model is missing it shows the install steps instead of a failing button.
- **`lang` attributes** (`<span lang="ja">`) make the browser pick the right font for kana,
  hangul and kanji.

### An offline translator in .NET (NLLB-200 + ONNX Runtime)

ROSE Lingo translates without the internet. The model is **NLLB-200 distilled 600M**
("No Language Left Behind", by Meta), exported to **ONNX**, a portable file format for
neural networks, and run by **Microsoft.ML.OnnxRuntime** inside the API.

| Piece | File (in project-rose-api) | Job |
| --- | --- | --- |
| Downloader | `setup-lingo.cmd` / `setup-lingo.ps1` | Fetches the model files once into `data/models/nllb-200-distilled-600M` (resumable, skips what exists) |
| Model files | `NllbModelFiles.cs` | Finds the files; "not installed" becomes a friendly 503 |
| Tokenizer | `NllbVocabulary.cs` | Text → numbers with the SentencePiece model (`Microsoft.ML.Tokenizers`) and back |
| Model | `OnnxTranslationModel.cs` | Runs the encoder once, then the decoder one token at a time |
| Decoding | `GreedyDecoder.cs` | Picks the most likely next token until end-of-sentence. Pure C#, unit tested with a fake model |
| Translator | `NllbTranslator.cs` | Splits text into sentences, loads the model on first use, one translation at a time (`SemaphoreSlim`) |

How a translation runs: `"Salamat po"` → tokens `[tgl_Latn, ▁Sal, amat, ▁po, </s>]` → the
encoder turns them into vectors → the decoder starts with `[</s>, eng_Latn]` (the language
code tells it to write English) and adds the best next token until `</s>` → `"Thank you"`.

Things worth knowing:

- **Tests do not need the 1 GB model.** `ITranslator` is an interface; integration tests use a
  fake, and the decoder is tested with a scripted `ITranslationModel`.
- **Readings are separate.** Romaji, Hangul romanization and pinyin come from small
  rule-based romanizers in `Rose.Domain/Lingo` (pinyin data from *pypinyin*, MIT).
- **Licence.** NLLB-200 is **CC-BY-NC 4.0**: fine for a personal project, not for selling.

---

## Exercises (easy → harder)

1. Change the hub greeting text in `ProjectsHubPage.tsx`.
2. Add a "Show token" eye toggle to the login field (`useState<boolean>`).
3. Add another theme with its own entrance scene (see section 10).
4. Write a test for `formatCompactMoney` edge cases (negative numbers, zero).
5. Add a search box to `PaymentsTable` using `useDebouncedValue`.
6. Build a tiny "Notes" project that stores notes in `localStorage` and plug it
   into the hub (section 13). Write one component test for it.
7. Keep the session in an httpOnly cookie instead of `localStorage` (section 12; the API
   needs a small change too).
8. Add a "yearly" repeat rule: first in the API's reminder rules (write the xUnit tests
   first), then in `REPEAT_RULES` / `describeRepeat` in `reminders/model.ts` and the form
   (section 14).
9. ROSE Lingo: add an `Example` sentence to cards. New property, a migration
   (section 15, step 8), the API contract and the card form.
10. Add a "Hardest cards" list (most `Lapses`) to the Cards page: a new repository query,
    an endpoint, and a `useAsync` call.
