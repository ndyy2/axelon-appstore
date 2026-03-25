import React, { useState, useEffect, useRef, useCallback } from 'react';

function parseSearch(raw) {
  if (!raw?.trim()) return [];
  return raw.trim().split('\n').map((l) => {
    const [appId, name, desc, ver] = l.split('\t');
    if (!appId || !name) return null;
    return { appId: appId.trim(), name: name.trim(), desc: (desc||'').trim()||'No description', ver: (ver||'').trim() };
  }).filter(Boolean).filter(a => !a.appId.includes('.Platform') && !a.appId.includes('.Sdk'));
}

export default function DiscoverPage({ query, onQueryChange }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [installingIds, setInstallingIds] = useState({});
  const [installedIds, setInstalledIds] = useState(new Set());
  const timer = useRef(null);

  const search = useCallback(async (q) => {
    if (!window.flatpak) return;
    setLoading(true);
    try {
      const r = await window.flatpak.search(q);
      if (r.ok) setApps(parseSearch(r.data).slice(0, 18));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    const q = query.trim();
    if (q.length >= 2) timer.current = setTimeout(() => search(q), 400);
    else if (!q) search('popular');
    return () => clearTimeout(timer.current);
  }, [query, search]);

  const install = async (id) => {
    if (!window.flatpak) return;
    setInstallingIds(p => ({ ...p, [id]: true }));
    try {
      const r = await window.flatpak.install(id);
      if (r.ok) setInstalledIds(p => new Set(p).add(id));
    } catch {}
    finally { setInstallingIds(p => { const n = { ...p }; delete n[id]; return n; }); }
  };

  return (
    <>
      {/* Top bar */}
      <header className="h-[72px] min-h-[72px] flex items-center px-9 relative z-10">
        <div className="relative w-full max-w-md group">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-violet-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-full text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-violet-500/20 transition-all"
            placeholder="Search flatpak apps..."
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
            Searching Flathub...
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
              const busy = installingIds[a.appId];
              const done = installedIds.has(a.appId);
              return (
                <div
                  key={a.appId}
                  className="animate-fade-up bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3 backdrop-blur-md hover:bg-white/[0.07] hover:border-white/[0.12] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-200"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center text-lg font-bold text-white shadow-md shadow-violet-600/25 shrink-0">
                      {a.name[0]}
                    </div>
                    {done ? (
                      <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">✓ Installed</span>
                    ) : (
                      <button
                        onClick={() => install(a.appId)}
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
                  <h3 className="font-semibold text-[0.95rem] leading-snug">{a.name}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 flex-1">{a.desc}</p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-[0.7rem] text-zinc-600 mt-auto pt-1">
                    <span>{a.ver ? `v${a.ver}` : ''}</span>
                    <span className="truncate ml-2 max-w-[160px]">{a.appId}</span>
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
