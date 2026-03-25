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

  const installApp = useCallback(async (appId, name) => {
    if (!window.flatpak) return false;
    const id = addDownload(appId, name);
    
    // Fetch real size first
    let totalBytes = 0;
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

    startDownload(id);
    updateProgress(id, { totalBytes });

    let downloadedBytes = 0;
    let startTime = Date.now();
    
    const ticker = setInterval(() => {
      // Simulate download behavior
      const speed = (2 + Math.random() * 5) * 1024 * 1024; // 2-7 MB/s
      downloadedBytes += speed * 0.5; // Ticker runs every 500ms
      
      if (totalBytes > 0) {
        if (downloadedBytes >= totalBytes * 0.95) downloadedBytes = totalBytes * 0.95; // Don't finish early
        const progress = Math.floor((downloadedBytes / totalBytes) * 100);
        const eta = Math.ceil((totalBytes - downloadedBytes) / speed);
        updateProgress(id, { progress, downloadedBytes, speed, eta });
      } else {
        // Fallback progress if size unknown
        downloadedBytes += speed * 0.5;
        const mockProgress = Math.min(95, Math.floor(downloadedBytes / (50 * 1024 * 1024) * 100));
        updateProgress(id, { progress: mockProgress, downloadedBytes, speed, eta: 0 });
      }
    }, 500);

    try {
      const res = await window.flatpak.install(appId);
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
