# Getting Started

This guide walks you through installing, running, and building **Track Hours** on your machine.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Node.js](https://nodejs.org/) | v18+ | v20 LTS recommended |
| npm | v9+ | bundled with Node.js |
| Git | latest | for cloning and contributing |

Electron and native dependencies are downloaded automatically during `npm install`.

---

## Installation

```bash
git clone <repo-url>
cd track-hours
npm install
```

---

## Running the App

### Browser (Angular Dev Server)

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200). Hot reload is enabled.

> In browser mode, data is stored in `localStorage`. Electron-only features (desktop notifications, auto-update, file dialogs) are unavailable.

### Desktop (Angular + Electron)

```bash
npm run electron:dev
```

This starts the Angular dev server and launches Electron simultaneously. DevTools open automatically.

---

## Build for Production

### Desktop Installer

```bash
npm run electron:build
```

Produces a packaged desktop app in the `release/` folder using `electron-builder`. Targets:

| Platform | Output |
|----------|--------|
| Windows  | NSIS installer (`.exe`) |
| macOS    | DMG |
| Linux    | AppImage |

### Angular Bundle Only

```bash
npm run build
```

Outputs to `dist/track-hours/browser/`. Useful for deploying the web version.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Angular dev server on port 4200 |
| `npm run build` | Production Angular build |
| `npm run watch` | Development build with watch mode |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint for TypeScript and templates |
| `npm run electron:dev` | Angular + Electron dev mode |
| `npm run electron:build` | Production desktop build + packaging |
| `npm run electron:run` | Build then run Electron directly |

---

## Troubleshooting

- **Port 4200 already in use** — start with a custom port: `ng serve --port 4201`.
- **Electron opens blank window** — ensure the Angular dev server is reachable at `http://localhost:4200` before Electron launches. `wait-on` handles this automatically.
- **Build budget errors** — component styles are capped at 8 kB. Reduce inline styles or move them to external files.
```