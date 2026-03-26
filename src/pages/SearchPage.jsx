import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppIcon from '../components/AppIcon.jsx';
import { useDownloads } from '../context/DownloadContext.jsx';

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const { queue, installApp } = useDownloads();
  const [query, setQuery] = useState(initialQuery);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aurSupported, setAurSupported] = useState(false);

  useEffect(() => {
    window.yay?.isSupported().then(r => setAurSupported(r.supported));
  }, []);

  function parseYaySearch(raw) {
    if (!raw?.trim()) return [];
    const lines = raw.trim().split('\n');
    const results = [];
    for (let i = 0; i < lines.length; i += 2) {
      const header = lines[i];
      const desc = lines[i+1] || '';
      if (!header || !header.includes('/')) continue;
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
  
  // Default Catalog State
  const [catalog, setCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});
  const timer = useRef(null);

  const fetchCategoryApps = async (q, limit = 16) => {
    try {
      const r = await window.flatpak.search(q);
      if (r.ok && r.data) {
         return r.data.trim().split('\n').map(l => {
          const [appId, name, desc] = l.split('\t');
          if (!appId || appId.includes('.Platform') || appId.includes('.Sdk')) return null;
          return { appId: appId.trim(), name: name.trim(), desc: (desc || '').trim() };
        }).filter(Boolean).slice(0, limit);
      }
    } catch {}
    return [];
  };

  const loadCatalog = useCallback(async () => {
    if (!window.flatpak) return;
    setCatalogLoading(true);
    try {
      const [dev, media, games, sys] = await Promise.all([
        fetchCategoryApps('code'),
        fetchCategoryApps('video'),
        fetchCategoryApps('game'),
        fetchCategoryApps('system')
      ]);
      setCatalog({
        'Development Tools': dev,
        'Multimedia & Creator': media,
        'Games & Entertainment': games,
        'System & Utilities': sys
      });
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async (val) => {
    const q = val.trim();
    if (!q) {
      setApps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSearchParams({ q: val });
    try {
      const flatpakPromise = window.flatpak?.search(val) || Promise.resolve({ ok: false });
      const yayPromise = aurSupported ? (window.yay?.search(val) || Promise.resolve({ ok: false })) : Promise.resolve({ ok: false });
      
      const [fr, yr] = await Promise.all([flatpakPromise, yayPromise]);
      
      let allApps = [];
      if (fr.ok && fr.data) {
        allApps = fr.data.trim().split('\n').map(l => {
          const [appId, name, desc, ver] = l.split('\t');
          if (!appId || !name) return null;
          return { appId: appId.trim(), name: name.trim(), desc: (desc || '').trim(), ver: (ver||'').trim(), source: 'flatpak' };
        }).filter(Boolean).filter(a => !a.appId.includes('.Platform') && !a.appId.includes('.Sdk'));
      }
      
      if (yr.ok && yr.data) {
        allApps = [...allApps, ...parseYaySearch(yr.data)];
      }
      
      setApps(allApps.slice(0, 40));
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [setSearchParams, aurSupported]);

  // Initial load
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    } else {
      loadCatalog();
    }
  }, [initialQuery, loadCatalog, handleSearch]);

  // Debounced search for typing
  useEffect(() => {
    clearTimeout(timer.current);
    const q = query.trim();
    if (q.length >= 2) {
      timer.current = setTimeout(() => handleSearch(q), 500);
    } else if (q.length === 0) {
      setApps([]);
      setSearchParams({});
    }
    return () => clearTimeout(timer.current);
  }, [query, handleSearch, setSearchParams]);

  return (
    <div className="flex flex-col h-full relative z-10">
      <header className="px-10 py-6 shrink-0 transition-colors duration-500">
        <h2 className="text-2xl font-bold tracking-tight mb-6 text-text-main">Explore Catalog</h2>
        <div className="relative w-full max-w-2xl group">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-dim group-focus-within:text-accent transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            className="w-full pl-12 pr-4 py-3.5 bg-surface-base backdrop-blur-xl border border-border-base rounded-2xl text-[0.95rem] text-text-main placeholder:text-text-dim/50 outline-none focus:border-accent focus:bg-surface-hover focus:shadow-[0_0_0_4px_var(--color-accent-glow)] transition-all"
            placeholder={aurSupported ? "Search Flatpak & AUR apps..." : "Search thousand of Flatpak apps..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-10 pb-10">
        {!query.trim() ? (
          /* DEFAULT CATALOG VIEW */
          <div className="flex flex-col gap-10 animate-fade-up">
            {catalogLoading || !catalog ? (
               <div className="flex items-center gap-3 text-text-dim py-10">
                 <div className="w-5 h-5 border-[2px] border-border-base border-t-accent rounded-full animate-spin" />
                 <span>Loading categorized catalog...</span>
               </div>
            ) : Object.entries(catalog).map(([category, items]) => {
              const isExpanded = expandedCategories[category];
              const displayItems = isExpanded ? items : items.slice(0, 4);
              
              return (
                <section key={category}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold tracking-tight text-text-main/90">{category}</h3>
                    {items.length > 4 && (
                      <button 
                        onClick={() => setExpandedCategories(prev => ({...prev, [category]: !isExpanded}))}
                        className="text-sm font-medium text-accent hover:opacity-80 transition-colors"
                      >
                        {isExpanded ? 'Show Less' : 'Show More'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                    {displayItems.map((a, i) => (
                      <div 
                        key={a.appId}
                        onClick={() => navigate(`/app/${a.appId}?source=flatpak`)}
                        className="group bg-surface-base border border-border-base rounded-2xl p-4 flex gap-4 cursor-pointer hover:bg-surface-hover hover:border-accent/40 transition-all shadow-sm"
                      >
                        <AppIcon 
                          appId={a.appId} 
                          name={a.name} 
                          source="flatpak"
                          containerClass="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/20 to-surface-base shadow-md group-hover:scale-105 transition-transform" 
                          className="w-8 h-8" 
                        />
                        <div className="flex flex-col min-w-0 justify-center flex-1">
                        <h4 className="font-semibold text-sm truncate leading-tight text-text-main">{a.name}</h4>
                        <p className="text-[0.7rem] text-text-dim truncate mt-1">{a.appId}</p>
                      </div>
                      
                      {/* Quick Get Button */}
                       <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          installApp(a);
                        }}
                        className="self-center px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-bold hover:bg-accent hover:text-white transition-all shadow-lg active:scale-95"
                      >
                        Get
                      </button>
                    </div>
                  ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : loading ? (
          /* SEARCH LOADING */
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-text-dim">
            <div className="w-7 h-7 border-[3px] border-border-base border-t-accent rounded-full animate-spin" />
            <span className="text-sm">Searching Catalog...</span>
          </div>
        ) : apps.length === 0 ? (
          /* NO RESULTS */
          <div className="flex flex-col items-center justify-center py-20 text-text-dim gap-3">
            <p className="font-medium">No results found for "{query}"</p>
          </div>
        ) : (
          /* SEARCH RESULTS */
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {apps.map((a, i) => (
              <div 
                key={a.appId}
                onClick={() => navigate(`/app/${a.appId}?source=${a.source || 'flatpak'}`)}
                className="animate-fade-up group bg-surface-base border border-border-base rounded-2xl p-4 flex gap-4 cursor-pointer hover:bg-surface-hover hover:border-accent/40 transition-all shadow-sm"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <AppIcon 
                  appId={a.appId} 
                  name={a.name} 
                  source={a.source}
                  containerClass="w-16 h-16 rounded-xl bg-gradient-to-br from-accent to-accent-light shadow-md group-hover:scale-105 transition-transform" 
                  className="w-10 h-10" 
                />
                 <div className="flex flex-col min-w-0 justify-center flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-[0.95rem] truncate leading-tight text-text-main">{a.name}</h3>
                    {a.source === 'aur' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">AUR</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">Flatpak</span>
                    )}
                  </div>
                  <p className="text-xs text-text-dim truncate">{a.appId}</p>
                </div>

                {/* Search Result Get Button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    installApp(a);
                  }}
                  className="self-center px-5 py-2 rounded-full bg-accent/10 text-accent text-xs font-bold hover:bg-accent hover:text-white transition-all shadow-lg active:scale-95"
                >
                  Get
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
