const { app, BrowserWindow, ipcMain, Notification, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const isDev = process.argv.includes('--dev');

app.setAppUserModelId('com.trackhours.app');

function getDataDir() {
  return path.join(app.getPath('userData'), 'track-hours-data');
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
    icon: path.join(__dirname, '../public/favicon256.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0f172a',
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
    mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  Menu.setApplicationMenu(null);
}

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

// IPC: Show system notification
ipcMain.handle('notify', (event, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
