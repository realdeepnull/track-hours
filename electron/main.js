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
  // Disable the built-in "install on quit" — we defer the install to the
  // next launch instead (see below) to avoid a race condition where the
  // NSIS uninstaller runs while the old process is still shutting down
  // and leaves the installation directory in a broken state, which causes
  // a generic Electron window to appear after the restart.
  autoUpdater.autoInstallOnAppQuit = false;
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
  // "Install on next launch" support
  // ---------------------------------------------------------------------------
  // electron-updater 6.x doesn't have autoInstallEvent = "onNextLaunch", so
  // we implement it manually.  When the user clicks "Restart & Update", we
  // DON'T call quitAndInstall() (which spawns the NSIS installer while this
  // process is still quitting — a race that can leave the installation
  // directory in a broken state and cause a generic Electron window after
  // restart).  Instead, we set a flag file and quit.  On the next launch,
  // we check for a pending update installer and run it BEFORE creating any
  // window, when no files are locked.

  const pendingUpdateFile = 'pending-update.json';

  function getPendingUpdatePath() {
    return path.join(getDataDir(), pendingUpdateFile);
  }

  // Maximum number of times we'll attempt to run a pending update installer
  // before giving up and launching the app normally.  Without this limit a
  // failing installer (e.g. one that writes to the wrong directory due to a
  // corrupted NSIS `--updated` context) causes an infinite startup loop:
  // launch → read pending → spawn installer → quit → installer fails →
  // launch → read pending → …  The app never reaches createWindow().
  const MAX_PENDING_UPDATE_ATTEMPTS = 3;
  // Discard a pending update if it is older than this (ms) — the installer
  // file may have been cleaned up by the updater or the OS since then.
  const PENDING_UPDATE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Check whether a pending update was left over from a previous session
   * and, if so, run the NSIS installer silently and quit.  The installer
   * will replace the app files (no locks held now) and re-launch the app
   * via --force-run.
   *
   * CRITICAL: The pending-update.json flag file is ALWAYS deleted after
   * spawning the installer (or on any error).  The installer is detached
   * so we cannot know whether it succeeded.  If we left the flag file in
   * place and the installer failed, the next launch would read the same
   * file and try again — creating an infinite loop that prevents the app
   * from ever starting.  Instead we track the attempt count in the file
   * and bail out after MAX_PENDING_UPDATE_ATTEMPTS tries.
   *
   * Returns true if a pending install was started (app will quit).
   */
  function installPendingUpdate() {
    const pendingPath = getPendingUpdatePath();
    if (!fs.existsSync(pendingPath)) {
      return false;
    }

    let pending;
    try {
      pending = JSON.parse(fs.readFileSync(pendingPath, 'utf-8'));
    } catch (e) {
      console.error('Failed to read pending update file:', e);
      try { fs.unlinkSync(pendingPath); } catch (_) { /* ignore */ }
      return false;
    }

    // --- Guard: attempt count — prevent infinite startup loop -----------
    const attempts = (pending.attempts || 0) + 1;
    if (attempts > MAX_PENDING_UPDATE_ATTEMPTS) {
      console.error(
        `Pending update has been attempted ${attempts - 1} times already, ` +
        'giving up to avoid a startup loop.  Removing flag file.'
      );
      try { fs.unlinkSync(pendingPath); } catch (_) { /* ignore */ }
      return false;
    }

    // --- Guard: age — discard stale pending updates --------------------
    if (pending.timestamp && (Date.now() - pending.timestamp) > PENDING_UPDATE_MAX_AGE_MS) {
      console.log('Pending update is older than 24h, discarding.');
      try { fs.unlinkSync(pendingPath); } catch (_) { /* ignore */ }
      return false;
    }

    const installerPath = pending.installerPath;
    if (!installerPath || !fs.existsSync(installerPath)) {
      console.log('Pending update installer not found, removing flag file');
      try { fs.unlinkSync(pendingPath); } catch (_) { /* ignore */ }
      return false;
    }

    console.log(`Installing pending update from: ${installerPath} (attempt ${attempts}/${MAX_PENDING_UPDATE_ATTEMPTS})`);

    // Build NSIS installer arguments, mirroring what electron-updater
    // would pass: --updated (skip wizard pages) /S (silent) --force-run
    // (restart app after install).
    const args = ['--updated', '/S', '--force-run'];
    if (pending.packageFile && fs.existsSync(pending.packageFile)) {
      args.push(`--package-file=${pending.packageFile}`);
    }

    // Pass the /D parameter so NSIS extracts to the current install
    // directory rather than falling back to a default path.  Without
    // this, the NSIS oneClick installer may install to the wrong
    // directory (e.g. a build output folder if the registry
    // InstallLocation is empty and the uninstaller path points to a
    // stale location).  /D must be the LAST parameter and the path
    // must not contain quotes.
    const installDir = path.dirname(app.getPath('exe'));
    args.push(`/D=${installDir}`);

    // ALWAYS delete the flag file BEFORE spawning the installer.  The
    // installer is detached so we can't observe its exit code.  If it
    // fails we do NOT want the next launch to retry indefinitely.
    try { fs.unlinkSync(pendingPath); } catch (e) {
      console.error('Failed to remove pending update flag file:', e);
    }

    try {
      const { spawn } = require('child_process');
      const child = spawn(installerPath, args, {
        detached: true,
        stdio: 'ignore',
      });
      child.on('error', (err) => {
        console.error('Failed to spawn update installer:', err);
      });
      child.unref();
    } catch (e) {
      console.error('Failed to start update installer:', e);
      // The flag file is already deleted above, so the app will start
      // normally on the next launch instead of looping.
      return false;
    }

    // Quit immediately — the detached installer will replace files and
    // re-launch the app.
    app.quit();
    return true;
  }

  // ---------------------------------------------------------------------------
  // App lifecycle
  // ---------------------------------------------------------------------------

  app.whenReady().then(async () => {
    // If an update was downloaded in a previous session, install it now
    // (before creating any window).  This is the "install on next launch"
    // pattern: instead of running the NSIS installer while the old process
    // is still quitting (which can race with file locks and leave the
    // installation directory in a broken state), we defer the install to
    // the next clean launch where no files are locked.
    if (!isDev && installPendingUpdate()) {
      return;
    }

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
      // Don't call quitAndInstall() — that spawns the NSIS installer while
      // this process is still quitting, which can race with file locks and
      // leave the installation in a broken state (showing a generic
      // Electron window after restart).  Instead, write a flag file with
      // the installer path and quit.  On the next launch, the app will
      // detect the pending update and run the installer before any window
      // is created, when no files are locked.
      const installerPath = autoUpdater.installerPath;
      if (!installerPath) {
        console.error('No installer path available');
        return;
      }

      const pendingData = {
        installerPath,
        packageFile: autoUpdater.downloadedUpdateHelper?.packageFile || undefined,
        timestamp: Date.now(),
      };

      try {
        ensureDataDir();
        fs.writeFileSync(getPendingUpdatePath(), JSON.stringify(pendingData, null, 2), 'utf-8');
        console.log('Pending update written, quitting app');
      } catch (e) {
        console.error('Failed to write pending update file:', e);
      }

      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
