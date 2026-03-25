import React from 'react';
import { useDownloads } from '../context/DownloadContext.jsx';
import AppIcon from '../components/AppIcon.jsx';
import { useNavigate } from 'react-router-dom';

const STATUS_COLOR = {
  pending: 'text-zinc-400',
  installing: 'text-violet-400',
  done: 'text-emerald-400',
  error: 'text-red-400',
};
const STATUS_LABEL = {
  pending: 'Queued',
  installing: 'Installing…',
  done: 'Installed',
  error: 'Failed',
};
const STATUS_ICON = {
  pending: '⏳',
  installing: null, // spinner
  done: '✅',
  error: '❌',
};

function ProgressBar({ value, status }) {
  const barColor =
    status === 'done' ? 'bg-emerald-500' :
    status === 'error' ? 'bg-red-500' :
    'bg-gradient-to-r from-violet-600 to-purple-400';

  return (
    <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden mt-2.5">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${barColor} ${status === 'installing' ? '' : ''}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function DownloadsPage() {
  const { queue, removeDownload, clearCompleted, activeCount } = useDownloads();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full relative z-10">
      <header className="px-10 py-6 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Downloads</h2>
          {activeCount > 0 && (
            <p className="text-sm text-violet-400 mt-1 font-medium animate-pulse">
              {activeCount} app{activeCount > 1 ? 's' : ''} currently installing…
            </p>
          )}
        </div>
        {queue.some(x => x.status === 'done' || x.status === 'error') && (
          <button
            onClick={clearCompleted}
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors px-4 py-2 border border-white/[0.08] rounded-xl hover:bg-white/[0.05]"
          >
            Clear Completed
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-10 pb-10">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-zinc-600 gap-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 opacity-20">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <p className="text-sm font-medium">No downloads yet</p>
            <button onClick={() => navigate('/')} className="text-sm text-violet-400 hover:text-violet-300 transition-colors mt-2">Browse Apps →</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {queue.map((item, i) => (
              <div
                key={item.id}
                className="animate-fade-up bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 flex gap-5 items-start"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* App Icon */}
                <AppIcon 
                  appId={item.appId} 
                  name={item.name} 
                  containerClass={`w-16 h-16 rounded-2xl border shrink-0 ${item.status === 'installing' ? 'border-violet-500/30 shadow-lg shadow-violet-500/10' : 'border-white/[0.06]'} bg-white/[0.03]`} 
                  className="w-10 h-10" 
                />

                {/* Info + Progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <h3 className="text-base font-bold truncate">{item.name}</h3>
                      <p className="text-xs text-zinc-500 truncate">{item.appId}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-bold ${STATUS_COLOR[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                      {item.status === 'installing' && (
                        <div className="w-4 h-4 border-2 border-zinc-700 border-t-violet-400 rounded-full animate-spin" />
                      )}
                      {(item.status === 'done' || item.status === 'error') && (
                        <button onClick={() => removeDownload(item.id)} className="text-zinc-600 hover:text-zinc-400 transition-colors p-1 rounded-lg hover:bg-white/[0.05]">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <ProgressBar value={item.progress} status={item.status} />
                  
                  <div className="flex justify-between items-center mt-1.5">
                    {item.status === 'installing' ? (
                      <p className="text-[0.7rem] text-zinc-500">Downloading & installing from Flathub…</p>
                    ) : item.status === 'done' ? (
                      <p className="text-[0.7rem] text-emerald-500">Installation complete</p>
                    ) : item.status === 'error' ? (
                      <p className="text-[0.7rem] text-red-400">Installation failed. Try again from the app page.</p>
                    ) : (
                      <p className="text-[0.7rem] text-zinc-600">Waiting in queue…</p>
                    )}
                    <span className="text-[0.7rem] font-bold text-zinc-500">{item.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
