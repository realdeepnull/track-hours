const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const isDev = process.argv.includes('--dev');

// Only load electron-updater in packaged builds.  In dev mode
// app.getVersion() returns the Electron version (e.g. "43.4.1")
// which is not a valid semver for the updater and causes a crash.
let autoUpdater = null;
if (!isDev) {
  const { autoUpdater: updater } = require('electron-updater');
  autoUpdater = updater;
  // Enable updater logging to stderr so update issues are debuggable.
  autoUpdater.logger = console;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
}

// Cached update state so the renderer can query it even if it
// registers its IPC listeners after an event has already fired.
const updateState = {
  availableVersion: null,
  downloaded: false,
  error: null,
  downloadPercent: null,
};

app.setAppUserModelId('com.trackhours.app');

// ---------------------------------------------------------------------------
// Single-instance lock
// ---------------------------------------------------------------------------
// Ensure only one instance of the app is running.  Without this, clicking a
// Windows toast notification can launch a second instance (because Windows
// uses the AppUserModelID to activate the app), which opens a duplicate
// window and may trigger duplicate notifications.
//
// CRITICAL: Everything that creates windows, registers IPC handlers, or
// calls app.whenReady() must live inside the `else` branch.  If the lock
// fails (e.g. because the old process was killed by the NSIS updater and
// the lock hasn't been released yet), `app.quit()` is called — but
// `app.whenReady()` can still fire on some platforms, creating a window
// that shows a generic Electron page instead of the Angular app.  By keeping
// all initialization inside the `else` block we guarantee no window is
// created when the lock is not held.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance — focus the existing window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  // ---------------------------------------------------------------------------
  // Helper functions
  // ---------------------------------------------------------------------------

  function getDataDir() {
    return path.join(app.getPath('userData'), 'track-hours-data');
  }

  /**
   * Resolve the app icon path.
   *
   * In development the icon lives in the project's `public/` folder.
   * In a packaged build it is copied to `resources/icon.ico` via the
   * `extraResources` config in electron-builder.yml, so we use
   * `process.resourcesPath` there.  This ensures Windows shows the icon
   * in the taskbar, Alt-Tab, and system notifications.
   */
  function getIconPath() {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'icon.ico');
    }
    return path.join(__dirname, '..', 'public', 'icon.ico');
  }

  function ensureDataDir() {
    const dir = getDataDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      icon: getIconPath(),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
      backgroundColor: '#f4f5f7',
      show: false,
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, url) => {
      console.error('did-fail-load:', errorCode, errorDescription, url);
    });

    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('render-process-gone:', details);
    });

    mainWindow.webContents.on('crashed', () => {
      console.error('renderer crashed');
    });

    if (isDev) {
      mainWindow.loadURL('http://localhost:4200');
      mainWindow.webContents.openDevTools();
    } else {
      const indexPath = path.join(__dirname, '..', 'dist', 'track-hours', 'browser', 'index.html');
      console.log('Loading:', indexPath);
      // Handle loadFile rejection — without this the window shows a generic
      // Electron error page if the file is not yet available (e.g. during the
      // brief window after an NSIS auto-update when files are still being
      // flushed to disk).
      mainWindow.loadFile(indexPath).catch((err) => {
        console.error('Failed to load index.html:', err);
        // Retry once after a short delay to handle potential file-lock races
        // during the auto-update restart.
        setTimeout(() => {
          mainWindow.loadFile(indexPath).catch((err2) => {
            console.error('Retry failed:', err2);
          });
        }, 1000);
      });
    }

    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });

    Menu.setApplicationMenu(null);
  }

  // ---------------------------------------------------------------------------
  // IPC handlers
  // ---------------------------------------------------------------------------

  // IPC: Read a JSON data file
  ipcMain.handle('data:read', (event, filename) => {
    try {
      const dir = ensureDataDir();
      const filePath = path.join(dir, filename);
      if (!fs.existsSync(filePath)) return null;
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error('data:read error', e);
      return null;
    }
  });

  // IPC: Write a JSON data file
  ipcMain.handle('data:write', (event, filename, data) => {
    try {
      const dir = ensureDataDir();
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('data:write error', e);
      return false;
    }
  });

  // IPC: Get data directory path (for CSV import/export)
  ipcMain.handle('data:getDir', () => {
    return ensureDataDir();
  });

  // IPC: Save exported file
  ipcMain.handle('export:save', (event, filename, content) => {
    const { dialog } = require('electron');
    return dialog.showSaveDialog(mainWindow, {
      defaultPath: filename,
      filters: [
        { name: 'CSV', extensions: ['csv'] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    }).then((result) => {
      if (!result.canceled && result.filePath) {
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, typeof content === 'string' ? 'utf-8' : undefined);
        fs.writeFileSync(result.filePath, buffer);
        return { success: true, filePath: result.filePath };
      }
      return { success: false };
    });
  });

  // ---------------------------------------------------------------------------
  // Auto-updater
  // ---------------------------------------------------------------------------

  // Register all autoUpdater listeners BEFORE calling checkForUpdates()
  // to avoid a race condition where events fire before listeners are set.
  // Only register when autoUpdater is available (packaged builds).
  if (autoUpdater) {
    autoUpdater.on('update-available', (info) => {
      updateState.availableVersion = info.version;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update:available', info.version);
      }
    });

    autoUpdater.on('update-downloaded', () => {
      updateState.downloaded = true;
      updateState.downloadPercent = 100;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update:downloaded');
      }
    });

    autoUpdater.on('download-progress', (progress) => {
      updateState.downloadPercent = Math.round(progress.percent);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update:progress', updateState.downloadPercent);
      }
    });

    autoUpdater.on('error', (err) => {
      console.error('autoUpdater error', err);
      updateState.error = err.message;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update:error', err.message);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // App lifecycle
  // ---------------------------------------------------------------------------

  app.whenReady().then(() => {
    createWindow();

    if (autoUpdater) {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('checkForUpdates failed:', err);
      });
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  // IPC: Get current cached update state (allows late renderer to catch up)
  ipcMain.handle('update:status', () => {
    return { ...updateState };
  });

  ipcMain.handle('update:install', () => {
    if (autoUpdater) {
      // Silent install + force-run after install so the NSIS installer
      // runs without showing its wizard UI and the app restarts
      // automatically.
      autoUpdater.quitAndInstall(true, true);
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
