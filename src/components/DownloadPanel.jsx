import React, { useState } from 'react';
import { useDownloads } from '../context/DownloadContext.jsx';
import AppIcon from './AppIcon.jsx';

const STATUS_COLOR = {
  pending: 'text-text-dim',
  installing: 'text-accent',
  done: 'text-emerald-500',
  error: 'text-red-500',
};
const STATUS_LABEL = {
  pending: 'Queued',
  installing: 'Installing…',
  done: 'Installed',
  error: 'Failed',
};

const formatBytes = (b) => {
  if (!b || b === 0) return '0 B';
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(1) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
};

const formatTime = (s) => {
  if (!s || s <= 0) return '';
  if (s < 60) return `${s}s left`;
  const m = Math.floor(s / 60);
  return `${m}m left`;
};

function ProgressBar({ value, status }) {
  const barColor =
    status === 'done' ? 'bg-emerald-500' :
    status === 'error' ? 'bg-red-500' :
    'bg-gradient-to-r from-violet-600 to-purple-400';

  return (
    <div className="h-1.5 w-full bg-border-base/20 rounded-full overflow-hidden mt-2">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${barColor} ${status === 'installing' ? 'animate-pulse' : ''}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function DownloadPanel() {
  const { queue, removeDownload, clearCompleted, activeCount } = useDownloads();
  const [open, setOpen] = useState(false);

  if (queue.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center gap-2.5 px-4 py-2.5 bg-bg-base/90 backdrop-blur-xl border border-border-base rounded-2xl shadow-2xl shadow-black/20 hover:bg-surface-hover transition-all group"
      >
        {activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent text-white text-[0.6rem] font-bold rounded-full flex items-center justify-center animate-pulse">
            {activeCount}
          </span>
        )}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-accent group-hover:scale-110 transition-transform">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span className="text-sm font-semibold text-text-main">Downloads</span>
        <span className="text-xs text-text-dim">({queue.length})</span>
      </button>

      {/* Download drawer panel */}
      {open && (
        <div className="w-[380px] bg-bg-base/95 backdrop-blur-2xl border border-border-base rounded-2xl shadow-2xl shadow-black/30 overflow-hidden animate-fade-up">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-base/50">
            <span className="text-sm font-bold text-text-main">Download Manager</span>
            <div className="flex gap-2 items-center">
              {queue.some(x => x.status === 'done' || x.status === 'error') && (
                <button onClick={clearCompleted} className="text-[0.7rem] text-text-dim hover:text-text-main transition-colors">
                  Clear Completed
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-text-dim hover:text-text-main transition-colors p-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <div className="flex flex-col max-h-[400px] overflow-y-auto">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-text-dim/50">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mb-3 opacity-30"><circle cx="12" cy="12" r="10"/><path d="M8 12l4 4 4-4M12 8v8"/></svg>
                <p className="text-xs">No downloads</p>
              </div>
            ) : (
              queue.map((item) => (
                <div key={item.id} className="px-5 py-4 border-b border-border-base/30 last:border-none hover:bg-surface-hover transition-colors">
                  <div className="flex items-center gap-3">
                    <AppIcon
                      appId={item.appId}
                      name={item.name}
                      containerClass="w-10 h-10 rounded-xl bg-surface-hover shrink-0"
                      className="w-6 h-6"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-sm font-semibold truncate text-text-main">{item.name}</h4>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className={`text-[0.7rem] font-semibold ${STATUS_COLOR[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                          {(item.status === 'done' || item.status === 'error') && (
                            <button onClick={() => removeDownload(item.id)} className="text-text-dim hover:text-text-main transition-colors">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <ProgressBar value={item.progress} status={item.status} />
                      {item.status === 'installing' && (
                        <div className="flex justify-between items-center mt-2.5">
                          <div className="flex flex-col">
                            <span className="text-[0.65rem] text-text-dim font-medium">
                              {item.totalBytes > 0 ? `${formatBytes(item.downloadedBytes)} / ${formatBytes(item.totalBytes)}` : formatBytes(item.downloadedBytes)}
                            </span>
                            <span className="text-[0.6rem] text-text-dim font-bold uppercase tracking-tight">
                              {item.speed > 0 ? `${formatBytes(item.speed)}/s` : 'Initializing...'}
                            </span>
                          </div>
                          <span className="text-[0.7rem] text-accent font-bold bg-accent/5 px-2 py-0.5 rounded-md">
                            {formatTime(item.eta)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
