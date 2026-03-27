const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readData: (filename) => ipcRenderer.invoke('data:read', filename),
  writeData: (filename, data) => ipcRenderer.invoke('data:write', filename, data),
  getDataDir: () => ipcRenderer.invoke('data:getDir'),
  notify: (title, body) => ipcRenderer.invoke('notify', title, body),
  exportSave: (filename, content) => ipcRenderer.invoke('export:save', filename, content),
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (_event, version) => callback(version)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', () => callback()),
  onUpdateError: (callback) => ipcRenderer.on('update:error', (_event, message) => callback(message)),
  onUpdateProgress: (callback) => ipcRenderer.on('update:progress', (_event, percent) => callback(percent)),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  isElectron: true,
});
