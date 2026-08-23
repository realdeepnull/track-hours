# Development Guide

A deep dive into the architecture, conventions, and internals of Track Hours — for contributors who want to extend or modify the codebase.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 22, TypeScript 6, Tailwind CSS 4 |
| Desktop shell | Electron 43 |
| State | Angular Signals |
| Translations | @ngx-translate 18 |
| Date utilities | date-fns 4 |
| PDF export | jsPDF 4 + jspdf-autotable 5 |
| CSV export | PapaParse 5 |
| Packaging | electron-builder 26 |
| Testing | Vitest 4 |
| Linting | ESLint + angular-eslint |

---

## Project Structure

```
src/
  index.html
  main.ts                    # Bootstrap entry
  styles.css                 # Global Tailwind + theme styles
  app/
    app.config.ts             # Application providers (router, http, translate)
    app.ts                    # Root component
    app.html                  # Root template
    app.routes.ts             # Lazy-loaded routes
    app.css
    models/
      models.ts              # Project, Task, TimeEntry, AppSettings
    services/
      storage.service.ts     # Persistence (Electron IPC / localStorage)
      project.service.ts     # Project & task CRUD
      time-entry.service.ts   # Time entry CRUD
      timer.service.ts       # Live timer state
      export.service.ts      # CSV / PDF export
      update.service.ts      # Auto-update bridge
    shared/
      duration.pipe.ts       # Formats seconds → hh:mm:ss
      icon.component.ts      # SVG icon wrapper
    components/
      sidebar/               # Navigation
      update-banner/         # Update notification banner
    pages/
      dashboard/             # Overview & stats
      timer/                 # Live tracking
      projects/              # Project & task management
      entries/               # Day/week/month entry view
      reports/               # Charts & breakdowns
      settings/              # Preferences
electron/
  main.js                    # Main process (window, IPC, auto-updater)
  preload.js                 # Context bridge (secure IPC API)
public/
  i18n/                      # de.json, en.json
```

---

## Routing & Lazy Loading

All routes are lazy-loaded via `loadComponent` in `app.routes.ts`:

```ts
{
  path: 'dashboard',
  loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
}
```

The default route redirects to `/dashboard`; unknown routes fall back to `/dashboard`.

---

## State Management

The app uses **Angular Signals** exclusively — no NgRx, no RxJS subjects for state.

| Service | Signal | Purpose |
|---------|--------|---------|
| `StorageService` | `settings` | Current app settings |
| `ProjectService` | `projects`, `tasks` | Project & task collections |
| `TimeEntryService` | `entries` | All time entries |
| `TimerService` | `running`, `elapsed` | Live timer state |
| `UpdateService` | `availableVersion`, `downloadReady`, `downloadPercent` | Update lifecycle |

### Conventions

- Use `signal()`, `computed()`, and `linkedSignal()` for reactive state.
- Use `update()` or `set()` — never `mutate()`.
- Services are singleton (`providedIn: 'root'`) using `inject()` for DI.

---

## Data Models

Defined in `src/app/models/models.ts`:

- **`Project`** — id, name, description, color, createdAt, archived
- **`Task`** — id, projectId, name, category, description, createdAt, archived
- **`TimeEntry`** — id, projectId, taskId, startTime, endTime (null = running), durationSeconds, note, createdAt
- **`AppSettings`** — reminderEnabled, reminderIntervalMinutes, autoSuggestLastUsed, theme, language

`TaskCategory` is a union: `development | design | meeting | testing | management | research | other`.

---

## Persistence Layer

`StorageService` (`src/app/services/storage.service.ts`) abstracts storage across environments:

| Mode | Storage | Keys |
|------|---------|------|
| Electron | JSON files in user data dir | `projects.json`, `tasks.json`, `time-entries.json`, `settings.json` |
| Browser | `localStorage` | `th_projects`, `th_tasks`, `th_time_entries`, `th_settings` |

Detection:

```ts
private readonly isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
```

See [Data Storage](data-storage.md) for file locations per platform.

---

## Electron IPC

### Main Process (`electron/main.js`)

Handles:

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `data:read` | invoke | Read a JSON data file |
| `data:write` | invoke | Write a JSON data file |
| `data:getDir` | invoke | Get the data directory path |
| `notify` | invoke | Show a desktop notification |
| `export:save` | invoke | Save file dialog + write |
| `update:available` | send | New version detected |
| `update:downloaded` | send | Update ready to install |
| `update:progress` | send | Download percentage |
| `update:error` | send | Update failed |
| `update:install` | invoke | Quit and install update |

Security:

- `contextIsolation: true` — the renderer cannot access Node directly.
- `nodeIntegration: false` — no Node APIs in the renderer.
- `Menu.setApplicationMenu(null)` — default menu removed.

### Preload (`electron/preload.js`)

Exposes a minimal, typed API via `contextBridge.exposeInMainWorld('electronAPI', …)`. The renderer accesses it through the `Window.electronAPI` declaration in `storage.service.ts`.

---

## Auto-Update

- Uses `electron-updater` with GitHub as the publish provider (`ynnckrkn/track-hours`).
- `autoUpdater.autoDownload = true` — updates download automatically once detected.
- Checks run only in production (skipped with `--dev`).
- `UpdateService` bridges IPC events to Angular signals consumed by the `UpdateBannerComponent`.

---

## Internationalization

- Translation files live in `public/i18n/de.json` and `public/i18n/en.json`.
- Loaded via `@ngx-translate/http-loader` at startup.
- Language is stored in `AppSettings.language` and applied through `translateService.use()`.

---

## Styling

- **Tailwind CSS 4** via `@tailwindcss/postcss`.
- Global styles in `src/styles.css`.
- Component styles are inline or co-located `.css` files.
- Style budgets: 4 kB warning / 8 kB error per component style.

---

## Testing

```bash
npm test
```

Uses **Vitest** with the Angular `@angular/build:unit-test` builder. Tests live alongside components (`.spec.ts`).

---

## Linting

```bash
npm run lint
```

ESLint configuration in `eslint.config.js` applies:

- `@eslint/js` recommended
- `typescript-eslint` recommended + stylistic
- `angular-eslint` TS recommended
- Inline template processing via `angular.processInlineTemplates`

Selector rules enforce the `app` prefix (`app-` for components, `app` attribute for directives).
```