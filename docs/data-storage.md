# Data Storage

Track Hours is **offline-first**. All data is stored locally on the user's machine — no cloud, no account, no telemetry.

---

## Electron Mode

Data is persisted as JSON files in the Electron `userData` directory, under a `track-hours-data` subfolder.

### File Locations

| Platform | Path |
|----------|------|
| Windows  | `%APPDATA%\track-hours\track-hours-data\` |
| macOS    | `~/Library/Application Support/track-hours/track-hours-data/` |
| Linux    | `~/.config/track-hours/track-hours-data/` |

> `%APPDATA%` typically expands to `C:\Users\<username>\AppData\Roaming`.

### Files

| File | Contents |
|------|----------|
| `projects.json` | All projects |
| `tasks.json` | All tasks |
| `time-entries.json` | All time entries |
| `settings.json` | App settings |

Each file is a JSON array (or object for settings) pretty-printed with 2-space indentation.

### How It Works

1. The renderer calls `window.electronAPI.readData(filename)` / `writeData(filename, data)`.
2. `preload.js` forwards the call via `ipcRenderer.invoke`.
3. `main.js` resolves the path with `getDataDir()` and reads/writes the file synchronously.
4. The directory is created on first access via `ensureDataDir()`.

---

## Browser Mode

When running outside Electron (e.g. `npm start`), data is stored in `localStorage`:

| Key | Contents |
|-----|----------|
| `th_projects` | All projects (JSON) |
| `th_tasks` | All tasks (JSON) |
| `th_time_entries` | All time entries (JSON) |
| `th_settings` | App settings (JSON) |

`StorageService` detects the environment and switches automatically:

```ts
private readonly isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
```

---

## Export

Exports are independent of the storage layer. `ExportService` generates:

- **CSV** — UTF-8 with BOM for Excel compatibility (via PapaParse).
- **PDF** — tabular layout (via jsPDF + jspdf-autotable).

In Electron, the save destination is chosen through a native file dialog (`export:save` IPC). In browser mode, the file is downloaded directly.
```