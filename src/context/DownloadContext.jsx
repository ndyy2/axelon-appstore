import React, { createContext, useContext, useState, useCallback } from 'react';

// Status: 'pending' | 'installing' | 'done' | 'error'
const DownloadContext = createContext(null);

export function DownloadProvider({ children }) {
  const [queue, setQueue] = useState([]); // [{ id, appId, name, status, progress }]

  const addDownload = useCallback((appId, name) => {
    const id = `${appId}-${Date.now()}`;
    setQueue(q => [...q, { 
      id, appId, name, 
      status: 'pending', 
      progress: 0, 
      totalBytes: 0, 
      downloadedBytes: 0, 
      speed: 0, 
      eta: 0 
    }]);
    return id;
  }, []);

  const startDownload = useCallback((id) => {
    setQueue(q => q.map(item => item.id === id ? { ...item, status: 'installing', progress: 5 } : item));
  }, []);

  const updateProgress = useCallback((id, data) => {
    setQueue(q => q.map(item => item.id === id ? { ...item, ...data } : item));
  }, []);

  const completeDownload = useCallback((id, success = true) => {
    setQueue(q => q.map(item => item.id === id ? { ...item, status: success ? 'done' : 'error', progress: success ? 100 : item.progress } : item));
  }, []);

  const removeDownload = useCallback((id) => {
    setQueue(q => q.filter(item => item.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue(q => q.filter(item => item.status === 'installing'));
  }, []);

  const installApp = useCallback(async (app, name) => {
    const isObject = typeof app === 'object';
    const appId = isObject ? app.appId : app;
    const appName = isObject ? app.name : (name || appId);
    const source = isObject ? app.source : 'flatpak';

    if (!window.flatpak && source !== 'aur') return false;
    if (source === 'aur' && !window.yay) return false;

    const id = addDownload(appId, appName);
    
    // Fetch real size first (Flatpak only for now)
    let totalBytes = 0;
    if (source === 'flatpak') {
      try {
        const info = await window.flatpak.remoteInfo(appId);
        if (info.ok && info.data) {
          const match = info.data.match(/Download:\s+([\d.]+)\s+(\w+)/);
          if (match) {
            const val = parseFloat(match[1]);
            const unit = match[2].toUpperCase();
            totalBytes = val * (unit.startsWith('G') ? 1024**3 : unit.startsWith('M') ? 1024**2 : 1024);
          }
        }
      } catch {}
    }

    startDownload(id);
    updateProgress(id, { totalBytes });

    let downloadedBytes = 0;
    
    const ticker = setInterval(() => {
      // Simulate download behavior
      const speed = (source === 'aur' ? 1 + Math.random() * 3 : 2 + Math.random() * 5) * 1024 * 1024; 
      downloadedBytes += speed * 0.5; 
      
      if (totalBytes > 0) {
        if (downloadedBytes >= totalBytes * 0.95) downloadedBytes = totalBytes * 0.95; 
        const progress = Math.floor((downloadedBytes / totalBytes) * 100);
        updateProgress(id, { progress, downloadedBytes, speed });
      } else {
        const mockProgress = Math.min(95, Math.floor(downloadedBytes / (50 * 1024 * 1024) * 100));
        updateProgress(id, { progress: mockProgress, downloadedBytes, speed });
      }
    }, 500);

    try {
      const res = source === 'aur' 
        ? await window.yay.install(appId)
        : await window.flatpak.install(appId);
      
      clearInterval(ticker);
      completeDownload(id, res.ok);
      return res.ok;
    } catch {
      clearInterval(ticker);
      completeDownload(id, false);
      return false;
    }
  }, [addDownload, startDownload, updateProgress, completeDownload]);

  const activeCount = queue.filter(x => x.status === 'installing').length;

  return (
    <DownloadContext.Provider value={{ queue, installApp, removeDownload, clearCompleted, activeCount }}>
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownloads() {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownloads must be used within DownloadProvider');
  return ctx;
}
