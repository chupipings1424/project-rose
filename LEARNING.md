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

**Try it:** add a `hint` to one of the StatTiles on the Overview page.

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
  `PaymentTrackerApp.tsx`, which has its own `<Routes>` and its own layout
  (`TrackerLayout.tsx` with `<NavLink>`s).
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
| Typed env vars | `src/env.d.ts` | `import.meta.env.VITE_ROSE_TOKEN` is known to TS |

Tip: hover anything in VS Code to see its inferred type.

---

## 8. Talking to a backend

`src/projects/payment-tracker/api/client.ts` is the **only** place that knows URLs.
Components call `trackerApi.summary(title)` and get typed data back.

- A small `request<T>()` wrapper handles JSON, errors (`ApiError`), and the
  "backend offline" case.
- **Vite proxy** (`vite.config.ts`): the browser calls `/api/payment-tracker/...`
  on port 5180, and Vite forwards it to Flask at `PAYMENT_TRACKER_URL`. No CORS
  setup is needed, and the frontend never hard-codes the backend address.
- After a mutation, the API returns fresh data and the page calls `setData(...)`
  from `useAsync`, so there's no extra reload round-trip.
- **Version tolerance:** `newerEndpoint()` wraps endpoints that only exist after
  the backend patch (delete title / delete year). An older server answers with a
  plain 404 page, so the user gets "apply the patch" instead of a cryptic error.
  `ApiError.fromServer` tells a real "Title not found." apart from "no such route".
  See `api/client.test.ts`, which stubs `fetch` to test all three cases.

---

## 9. Patterns worth stealing

- **Reset state with `key`:** in `BudgetSectionTable.tsx` each editable cell's
  `key` includes its amount. When the server value changes, React throws the old
  cell away and creates a fresh one with fresh state. No effect is needed.
- **Mount only when open:** `Modal.tsx` renders children only while open, so
  forms inside start clean each time.
- **Theme-aware charts:** `ReportCharts.tsx` colours use `var(--c1)` etc., so
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

The three anime themes (`hunter`, `alchemist`, `deathnote`) show a few more tricks:

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
- `vi.stubEnv` swaps the token per test, and `vi.useFakeTimers` / a `now`
  parameter make time deterministic.

TDD loop (Kent Beck): write a failing test → make it pass → refactor.

---

## 12. Authentication: today and tomorrow

**Today:** `authService.login()` compares your input to `VITE_ROSE_TOKEN` and
stores a 12-hour session in `localStorage`. This keeps casual visitors out, but
the token is visible in the JS bundle. It is **not** real security.

**Changing the token:** edit `VITE_ROSE_TOKEN` in `.env`, then restart `npm start`.

**Upgrading later** (only `authService.ts` needs to change; `login` is already `async`):
1. Add a `POST /api/auth/login` endpoint on a server that holds the secret
   (hashed) and returns a signed, expiring token, ideally as an **httpOnly cookie**.
2. Make `login()` call it; make `loadSession()` ask `/api/auth/me`.
3. Have every backend API verify the token, because the server is the real gatekeeper.
4. Remove `VITE_ROSE_TOKEN` from `.env`.

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

## 14. Reminders: TypeScript on the server, Web Push and service workers

Project 02 adds a **backend you own**, written in the same language as the frontend.

**Node runs TypeScript directly.** `node --experimental-strip-types server/index.ts` deletes
the type annotations and runs what is left. No build step. The catch: only syntax that can
simply be *erased* is allowed (no `enum`, no `constructor(private x)` shorthand). That is what
`erasableSyntaxOnly` in `tsconfig.server.json` enforces, and why server imports end in `.ts`.

**Share code, not copies.** `shared/reminders.ts` holds the `Reminder` type and the rules
(`nextOccurrence`, `collectDue`, `parseReminderInput`). The worker uses them to decide what
rings; the React form uses the same types. Change a field once and `tsc` shows every place
on both sides that needs updating.

**Pure functions are easy to test.** `collectDue(reminders, now)` takes the time as an
argument instead of calling `new Date()` inside, so tests can ask "what rings at 09:00 on
31 January?" without waiting or mocking clocks.

**A framework-free HTTP server.** `server/reminders/app.ts` uses only `node:http`: parse the
URL, match method + path, call the service, send JSON. Errors become `{ error }` with a
status code. The tests start it on a random port and call it with `fetch`.

**Dependency injection without a framework.** `createHandler({ reminders, push, ... })` and
`new PushService(file, keys, contact, send)` receive what they need. Tests pass a fake `send`
instead of really calling Apple's servers.

**Web Push in four steps:**

1. The worker creates a **VAPID key pair** once (`server/data/vapid.json`). The public key
   identifies *your* server to Apple/Google.
2. The page calls `Notification.requestPermission()`, **directly inside the click handler**
   (iOS ignores it otherwise), then `pushManager.subscribe({ applicationServerKey })`.
3. The browser returns a **subscription** (a secret URL at Apple's push service plus
   encryption keys). The page POSTs it to the worker, which stores it.
4. When a reminder is due, `web-push` encrypts the message and POSTs it to that URL. Apple
   wakes the phone, which wakes **`public/sw.js`**, which calls `showNotification`.

**Service workers** are scripts the browser keeps *outside* your page. They can run when no
tab is open, which is the only way a closed app can react to a push. ROSE's worker does
nothing else (no offline caching), which keeps it simple and avoids stale-code surprises.

**PWA = a website that can be installed.** `manifest.webmanifest` (name, icons,
`display: standalone`) plus the `apple-touch-icon` lets Edge's *Install app* turn
ROSE into its own window with an icon. (On iPhone, push only works for installed apps
served over HTTPS, which is why ROSE does not offer phone push.)

---

## Exercises (easy → harder)

1. Change the hub greeting text in `ProjectsHubPage.tsx`.
2. Add a "Show token" eye toggle to the login field (`useState<boolean>`).
3. Add a 6th theme (see section 10).
4. Write a test for `formatCompactMoney` edge cases (negative numbers, zero).
5. Add a search box to `PaymentsTable` using `useDebouncedValue`.
6. Build a tiny "Notes" project that stores notes in `localStorage` and plug it
   into the hub (section 13). Write one component test for it.
7. Move the token check to a server (section 12).
8. Add a "yearly" repeat rule to `shared/reminders.ts`. Write the tests first, then make
   them pass, then add it to the form (section 14).
