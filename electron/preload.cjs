const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flatpak', {
  search: (query) => ipcRenderer.invoke('flatpak:search', query),
  listInstalled: () => ipcRenderer.invoke('flatpak:list-installed'),
  install: (appId) => ipcRenderer.invoke('flatpak:install', appId),
  uninstall: (appId) => ipcRenderer.invoke('flatpak:uninstall', appId),
  updateAll: () => ipcRenderer.invoke('flatpak:update-all'),
  appInfo: (appId) => ipcRenderer.invoke('flatpak:app-info', appId),
  remoteInfo: (appId) => ipcRenderer.invoke('flatpak:remote-info', appId),
  getMetadata: (appId) => ipcRenderer.invoke('flatpak:get-metadata', appId),
  checkAppUpdate: () => ipcRenderer.invoke('app:check-update'),
});
