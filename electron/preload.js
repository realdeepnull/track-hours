const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readData: (filename) => ipcRenderer.invoke('data:read', filename),
  writeData: (filename, data) => ipcRenderer.invoke('data:write', filename, data),
  getDataDir: () => ipcRenderer.invoke('data:getDir'),
  exportSave: (filename, content) => ipcRenderer.invoke('export:save', filename, content),
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (_event, version) => callback(version)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', (_event, version) => callback(version)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update:not-available', (_event, version) => callback(version)),
  onCheckingForUpdate: (callback) => ipcRenderer.on('update:checking', () => callback()),
  onUpdateError: (callback) => ipcRenderer.on('update:error', (_event, message) => callback(message)),
  onUpdateProgress: (callback) => ipcRenderer.on('update:progress', (_event, percent) => callback(percent)),
  getUpdateStatus: () => ipcRenderer.invoke('update:status'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  isElectron: true,
});
