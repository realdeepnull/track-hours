# Track Hours

A modern, offline-first desktop application for tracking time across projects and tasks — built with Angular and Electron.

Whether you are a freelancer, developer, or anyone who needs to keep track of how their time is spent, **Track Hours** gives you a clean and distraction-free environment to log, review, and export your work hours — without any cloud dependency.

---

## Features

- **Projects & Tasks** — Create, edit, and archive projects and tasks with custom colors and categories (Development, Design, Meeting, Testing, Management, Research, and more)
- **Live Timer** — Start/stop real-time tracking with desktop notifications
- **Manual Entries** — Add or edit time entries retroactively with start time, end time, and notes
- **Day / Week / Month View** — Browse entries with filters by project, category, and full-text search
- **Reports** — Visual breakdowns of tracked time per project and category with bar charts
- **Export** — Export to CSV (UTF-8 BOM for Excel compatibility) or PDF
- **Reminders** — Configurable desktop notifications reminding you to log your time
- **Offline-first** — All data is stored locally; no account or internet connection required
- **Themes & i18n** — Dark/light theme, English and German interface

---

## Screenshots

| Dashboard | Timer |
|-----------|-------|
| ![Dashboard](public/Track%20Hours%20Dashboard.png) | ![Timer](public/Track%20Hours%20Timer.png) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm (v9 or later)

### Install dependencies

```bash
npm install
```

### Run in the browser (Angular Dev Server)

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200) in your browser.

### Run as a desktop app (Angular + Electron)

```bash
npm run electron:dev
```

This starts the Angular dev server and launches Electron simultaneously.

### Build for production

```bash
npm run electron:build
```

Produces a packaged desktop app in the `release/` folder.

---

## Data Storage

In Electron mode, all data is persisted as JSON files in the OS user data directory:

| Platform | Path |
|----------|------|
| Windows  | `%APPDATA%\track-hours\track-hours-data\` |
| macOS    | `~/Library/Application Support/track-hours/track-hours-data/` |
| Linux    | `~/.config/track-hours/track-hours-data/` |

In browser mode, data is stored in `localStorage`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 21, TypeScript, Tailwind CSS |
| Desktop shell | Electron 41 |
| Translations | @ngx-translate |
| Date utilities | date-fns |
| PDF export | jsPDF + jspdf-autotable |
| CSV export | PapaParse |
| Packaging | electron-builder |

---

## Project Structure

```
src/app/
  models/           # Data models: Project, Task, TimeEntry, AppSettings
  services/         # StorageService, ProjectService, TimeEntryService, TimerService, ExportService
  shared/           # DurationPipe
  components/       # Sidebar
  pages/            # Dashboard, Timer, Projects, Entries, Reports, Settings
electron/
  main.js           # Electron main process
  preload.js        # Context Bridge (IPC)
public/
  i18n/             # Translation files (de.json, en.json)
```

---

## Contributing

Contributions, issues and feature requests are welcome. Feel free to open an issue or submit a pull request.

---

## License

This project is private and not yet licensed for public distribution.
