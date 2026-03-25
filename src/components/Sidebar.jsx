import React from 'react';
import { useDownloads } from '../context/DownloadContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import AppIcon from './AppIcon.jsx';

const NAV = [
  {
    id: 'home', label: 'Home',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  },
  {
    id: 'search', label: 'Search',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  },
  {
    id: 'installed', label: 'Installed',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  },
  {
    id: 'updates', label: 'Updates',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  },
  {
    id: 'downloads', label: 'Downloads',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  },
];

const formatBytes = (b) => {
  if (!b) return '0 B';
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(1) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
};

const formatTime = (s) => {
  if (!s || s <= 0) return '';
  if (s < 60) return `${s}s left`;
  const m = Math.floor(s / 60);
  return `${m}m left`;
};

export default function Sidebar({ active, onNavigate }) {
  const { queue, activeCount } = useDownloads();
  const { accent, setAccent, accents, mode, toggleMode } = useTheme();
  
  const activeDownloads = queue.filter(x => x.status === 'installing');
  return (
    <nav className="w-60 min-w-60 bg-surface-base backdrop-blur-xl border-r border-border-base flex flex-col p-5 gap-1 relative transition-colors duration-500">
      {/* Accent edge line */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent/20 to-transparent" />

      {/* Brand */}
      <div className="flex items-center gap-3 px-3 mb-8 select-none">
        <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-violet-600/30 shrink-0">
          <img src="icon.png" alt="Axelon Store" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-[1.05rem] font-bold tracking-tight">App Store</h1>
      </div>

      {/* Nav items */}
      {NAV.map((n) => (
        <button
          key={n.id}
          onClick={() => onNavigate(n.id)}
          className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border border-transparent
            ${active === n.id
              ? 'bg-accent/10 text-text-main border-accent/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
              : 'text-text-dim hover:bg-surface-hover hover:text-text-main'
            }`}
        >
          <span className={active === n.id ? 'text-accent' : ''}>{n.icon}</span>
          {n.label}
          {/* Active download badge */}
          {n.id === 'downloads' && queue.length > 0 && (
            <span className={`ml-auto text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${ activeCount > 0 ? 'bg-violet-500/20 text-violet-300 animate-pulse' : 'bg-white/[0.06] text-zinc-400' }`}>
              {queue.length}
            </span>
          )}
        </button>
      ))}

      {/* Active Installs */}
      {activeDownloads.length > 0 && (
        <div className="mt-6 flex flex-col gap-2 animate-fade-in">
          <span className="px-3 text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest">Installing</span>
          {activeDownloads.map(dl => (
            <div key={dl.id} className="mx-2 px-2.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <AppIcon
                  appId={dl.appId}
                  name={dl.name}
                  containerClass="w-5 h-5 rounded-md shrink-0 shadow-lg shadow-black/40"
                  className="w-3.5 h-3.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-[0.65rem] mb-0.5">
                    <span className="font-bold text-white truncate">{dl.name}</span>
                    <span className="text-violet-400 font-mono italic">{dl.progress}%</span>
                  </div>
                  <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 transition-all duration-700" style={{ width: `${dl.progress}%` }} />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center px-0.5">
                <div className="flex flex-col">
                  <span className="text-[0.6rem] text-zinc-400 font-medium">
                    {dl.totalBytes > 0 ? `${formatBytes(dl.downloadedBytes)} / ${formatBytes(dl.totalBytes)}` : formatBytes(dl.downloadedBytes)}
                  </span>
                  <span className="text-[0.55rem] text-zinc-600 uppercase font-bold tracking-tighter">
                    {dl.speed > 0 ? `${formatBytes(dl.speed)}/s` : 'Connecting...'}
                  </span>
                </div>
                <span className="text-[0.6rem] text-violet-400/80 font-bold">
                  {formatTime(dl.eta)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Multi-Theme Controls */}
      <div className="mt-8 px-3 flex flex-col gap-6">
        {/* Mode Toggle */}
        <div>
          <span className="text-[0.65rem] font-bold text-text-dim uppercase tracking-widest block mb-3">Appearance</span>
          <button 
            onClick={toggleMode}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-surface-hover border border-border-base text-text-main hover:border-accent/40 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                {mode === 'dark' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                )}
              </div>
              <span className="text-xs font-bold capitalize">{mode} Mode</span>
            </div>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${mode === 'dark' ? 'bg-accent/40' : 'bg-zinc-300'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${mode === 'dark' ? 'right-0.5' : 'left-0.5'}`} />
            </div>
          </button>
        </div>

        {/* Accent Selector */}
        <div>
          <span className="text-[0.65rem] font-bold text-text-dim uppercase tracking-widest block mb-3">Accent Color</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(accents).map(([id, info]) => (
              <button
                key={id}
                onClick={() => setAccent(id)}
                className={`w-5 h-5 rounded-full border-2 transition-all active:scale-90 ${accent === id ? 'border-text-main scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                style={{ backgroundColor: info.color, boxShadow: accent === id ? `0 0 12px ${info.color}66` : 'none' }}
                title={info.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-white/[0.06] text-center text-[0.7rem] text-zinc-600 select-none">
        Flatpak Only • Arch Linux
      </div>
    </nav>
  );
}
