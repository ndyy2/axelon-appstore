import React, { useState, useEffect, useCallback } from 'react';
import AppIcon from '../components/AppIcon.jsx';
import Modal from '../components/Modal.jsx';

function parseList(raw) {
  if (!raw?.trim()) return [];
  return raw.trim().split('\n').map((l) => {
    const [appId, name, ver, origin] = l.split('\t');
    if (!appId || !name) return null;
    return { appId: appId.trim(), name: name.trim(), ver: (ver||'').trim(), origin: (origin||'').trim() };
  }).filter(Boolean);
}

export default function InstalledPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState({});
  const [appToUninstall, setAppToUninstall] = useState(null);

  const load = useCallback(async () => {
    if (!window.flatpak) return;
    setLoading(true);
    try {
      const r = await window.flatpak.listInstalled();
      if (r.ok) {
        const list = parseList(r.data);
        list.sort((a, b) => a.name.localeCompare(b.name));
        setApps(list);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const uninstall = async (id) => {
    if (!window.flatpak) return;
    setRemoving(p => ({ ...p, [id]: true }));
    try {
      const r = await window.flatpak.uninstall(id);
      if (r.ok) setApps(p => p.filter(a => a.appId !== id));
    } catch {}
    finally { setRemoving(p => { const n = { ...p }; delete n[id]; return n; }); }
  };

  return (
    <>
      <header className="h-[72px] min-h-[72px] flex items-center px-9 gap-3 relative z-10 transition-colors duration-500">
        <h2 className="text-base font-semibold text-text-main">Installed Applications</h2>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-base border border-border-base text-text-dim hover:bg-surface-hover hover:text-text-main transition-all cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-9 pb-9 relative z-[1]">
        <h2 className="text-2xl font-bold tracking-tight mb-1 text-text-main">Installed</h2>
        {!loading && <p className="text-sm text-text-dim mb-6">{apps.length} apps installed via Flatpak</p>}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-text-dim">
            <div className="w-7 h-7 border-[3px] border-border-base border-t-accent rounded-full animate-spin" />
            Loading installed apps...
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-dim">
            <svg className="w-12 h-12 text-border-base" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            <p>No Flatpak apps installed</p>
            <span className="text-xs text-text-dim/60">Head to Discover to install some!</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {apps.map((a, i) => (
              <div
                key={a.appId}
                className="animate-fade-up flex items-center justify-between p-4 bg-surface-base border border-border-base rounded-xl hover:bg-surface-hover hover:border-accent/20 transition-all duration-200 shadow-sm"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <AppIcon 
                    appId={a.appId} 
                    name={a.name} 
                    containerClass="w-10 h-10 rounded-lg bg-surface-hover text-accent" 
                    className="w-6 h-6" 
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm truncate text-text-main">{a.name}</span>
                    <span className="text-xs text-text-dim truncate">{a.appId}{a.ver ? ` • v${a.ver}` : ''}{a.origin ? ` • ${a.origin}` : ''}</span>
                  </div>
                </div>
                <button
                  onClick={() => setAppToUninstall(a)}
                  disabled={removing[a.appId]}
                  className={`shrink-0 ml-4 px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all
                    bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20
                    ${removing[a.appId] ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {removing[a.appId] ? 'Removing...' : 'Uninstall'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <Modal
        isOpen={!!appToUninstall}
        onClose={() => setAppToUninstall(null)}
        title="Uninstall Application"
        confirmLabel="Uninstall"
        onConfirm={() => uninstall(appToUninstall.appId)}
        isDanger={true}
      >
        Are you sure you want to remove <span className="font-bold text-white">{appToUninstall?.name}</span>? 
        This will delete the application and its local data.
      </Modal>
    </>
  );
}
