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
  performUpdate: (asset) => ipcRenderer.invoke('app:perform-update', asset),
  openFolder: (path) => ipcRenderer.invoke('app:open-folder', path),
  onUpdateProgress: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('app:update-progress', listener);
    return () => ipcRenderer.removeListener('app:update-progress', listener);
  }
});

contextBridge.exposeInMainWorld('yay', {
  isSupported: () => ipcRenderer.invoke('yay:is-supported'),
  search: (query) => ipcRenderer.invoke('yay:search', query),
  listInstalled: () => ipcRenderer.invoke('yay:list-installed'),
  install: (pkgName) => ipcRenderer.invoke('yay:install', pkgName),
  uninstall: (pkgName) => ipcRenderer.invoke('yay:uninstall', pkgName),
  checkUpdates: () => ipcRenderer.invoke('yay:check-updates'),
  updateAll: () => ipcRenderer.invoke('yay:update-all'),
  getLocalIcon: (pkgName) => ipcRenderer.invoke('yay:get-local-icon', pkgName),
});
