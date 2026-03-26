import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDownloads } from '../context/DownloadContext.jsx';
import AppIcon from '../components/AppIcon.jsx';

function parseSearch(raw) {
  if (!raw?.trim()) return [];
  return raw.trim().split('\n').map((l) => {
    const [appId, name, desc, ver] = l.split('\t');
    if (!appId || !name) return null;
    return { appId: appId.trim(), name: name.trim(), desc: (desc||'').trim()||'No description', ver: (ver||'').trim() };
  }).filter(Boolean).filter(a => !a.appId.includes('.Platform') && !a.appId.includes('.Sdk'));
}

function parseYaySearch(raw) {
  if (!raw?.trim()) return [];
  const lines = raw.trim().split('\n');
  const results = [];
  for (let i = 0; i < lines.length; i += 2) {
    const header = lines[i];
    const desc = lines[i+1] || '';
    if (!header || !header.includes('/')) continue;
    
    // Header format: repo/name version (stats) (status)
    const match = header.match(/^([^\/]+)\/([^\s]+)\s+([^\s]+)/);
    if (match) {
      results.push({
        appId: match[2],
        name: match[2],
        desc: desc.trim(),
        ver: match[3],
        source: 'aur',
        isInstalled: header.includes('(Installed)')
      });
    }
  }
  return results;
}

export default function DiscoverPage({ query, onQueryChange }) {
  const { installApp, queue } = useDownloads();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [installedIds, setInstalledIds] = useState(new Set());
  const [aurSupported, setAurSupported] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    window.yay?.isSupported().then(r => setAurSupported(r.supported));
  }, []);

  const search = useCallback(async (q) => {
    setLoading(true);
    try {
      const flatpakPromise = window.flatpak?.search(q) || Promise.resolve({ ok: false });
      const yayPromise = aurSupported ? (window.yay?.search(q) || Promise.resolve({ ok: false })) : Promise.resolve({ ok: false });
      
      const [fr, yr] = await Promise.all([flatpakPromise, yayPromise]);
      
      let allApps = [];
      if (fr.ok) allApps = [...parseSearch(fr.data)];
      if (yr.ok) allApps = [...allApps, ...parseYaySearch(yr.data)];
      
      setApps(allApps.slice(0, 30));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [aurSupported]);

  useEffect(() => {
    clearTimeout(timer.current);
    const q = query.trim();
    if (q.length >= 2) timer.current = setTimeout(() => search(q), 400);
    else if (!q) search('popular');
    return () => clearTimeout(timer.current);
  }, [query, search]);

  const install = async (app) => {
    const success = await installApp(app);
    if (success) setInstalledIds(p => new Set(p).add(app.appId));
  };

  return (
    <>
      {/* Top bar */}
      <header className="h-[72px] min-h-[72px] flex items-center px-9 relative z-10">
        <div className="relative w-full max-w-md group">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-violet-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-full text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-violet-500/20 transition-all"
            placeholder={aurSupported ? "Search Flatpak & AUR apps..." : "Search flatpak apps..."}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            autoFocus
          />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-9 pb-9 relative z-[1]">
        <h2 className="text-2xl font-bold tracking-tight mb-6">
          {query.trim() ? `Results for "${query.trim()}"` : 'Discover'}
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-zinc-500">
            <div className="w-7 h-7 border-[3px] border-zinc-800 border-t-violet-500 rounded-full animate-spin" />
            Searching Catalog...
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <svg className="w-12 h-12 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>
            <p>No applications found</p>
            <span className="text-xs text-zinc-600">Try a different search term</span>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {apps.map((a, i) => {
              const busy = queue.some(x => x.appId === a.appId && x.status === 'installing');
              const done = installedIds.has(a.appId);
              return (
                <div
                  key={a.appId}
                  className="animate-fade-up bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3 backdrop-blur-md hover:bg-white/[0.07] hover:border-white/[0.12] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-200"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div 
                    onClick={() => window.location.hash = `#/app/${a.appId}?source=${a.source || 'flatpak'}`}
                    className="cursor-pointer contents"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <AppIcon 
                        appId={a.appId} 
                        name={a.name} 
                        source={a.source}
                        containerClass="w-12 h-12 rounded-xl shadow-md shrink-0" 
                        className="w-8 h-8" 
                      />
                      {done ? (
                        <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">✓ Installed</span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); install(a); }}
                          disabled={busy}
                          className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-150
                            bg-gradient-to-r from-violet-600 to-purple-500 text-white shadow-md shadow-violet-600/25 hover:scale-[1.04] hover:shadow-lg hover:shadow-violet-600/30 active:scale-[0.97]
                            ${busy ? 'opacity-60 pointer-events-none' : ''}`}
                        >
                          {busy ? 'Installing...' : 'Get'}
                        </button>
                      )}
                    </div>

                    {/* Body */}
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[0.95rem] leading-snug">{a.name}</h3>
                      {a.source === 'aur' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">AUR</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">Flatpak</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 flex-1">{a.desc}</p>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[0.7rem] text-zinc-600 mt-auto pt-1">
                      <span>{a.ver ? `v${a.ver}` : ''}</span>
                      <span className="truncate ml-2 max-w-[160px]">{a.appId}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
