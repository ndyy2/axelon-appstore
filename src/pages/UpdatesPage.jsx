import React, { useState, useEffect } from 'react';

export default function UpdatesPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [appUpdate, setAppUpdate] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [updatingApp, setUpdatingApp] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(null);
  const [updateResult, setUpdateResult] = useState(null);

  useEffect(() => {
    if (!window.flatpak?.onUpdateProgress) return;
    const cleanup = window.flatpak.onUpdateProgress((data) => {
      setUpdateProgress(data);
    });
    return cleanup;
  }, []);

  useEffect(() => {
    async function checkApp() {
      if (!window.flatpak?.checkAppUpdate) return;
      setAppLoading(true);
      try {
        const res = await window.flatpak.checkAppUpdate();
        if (res.ok) setAppUpdate(res);
      } catch (err) {
        console.error('App update check failed:', err);
      } finally {
        setAppLoading(false);
      }
    }
    checkApp();
  }, []);

  const handleUpdateApp = async () => {
    if (!appUpdate?.assets || !window.flatpak?.performUpdate) return;
    
    // Find first AppImage
    const asset = appUpdate.assets.find(a => a.name.endsWith('.AppImage')) || appUpdate.assets[0];
    if (!asset) return;

    setUpdatingApp(true);
    setUpdateResult(null);
    try {
      const res = await window.flatpak.performUpdate(asset);
      if (res.ok) {
        setUpdateResult({ type: 'ok', path: res.path });
      } else {
        setUpdateResult({ type: 'err', msg: res.msg });
      }
    } catch {
       setUpdateResult({ type: 'err', msg: 'System update failed unexpectedly.' });
    } finally {
      setUpdatingApp(false);
    }
  };

  const update = async () => {
    if (!window.flatpak) return;
    setLoading(true);
    setStatus(null);
    try {
      const r = await window.flatpak.updateAll();
      setStatus(r.ok
        ? { type: 'ok', msg: 'All flatpak apps are up to date!' }
        : { type: 'err', msg: r.msg || 'Update failed.' }
      );
    } catch {
      setStatus({ type: 'err', msg: 'An error occurred while updating.' });
    }
    finally { setLoading(false); }
  };

  return (
    <>
      <header className="h-[72px] min-h-[72px]" />

      <div className="flex-1 overflow-y-auto px-9 pb-9 relative z-[1]">
        <h2 className="text-2xl font-bold tracking-tight mb-8 text-text-main font-sans">Updates</h2>

        {/* Axelon Store System Update */}
        <section className="mb-12 animate-fade-up">
           <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <h3 className="text-xs font-bold text-text-dim uppercase tracking-widest">System Update</h3>
           </div>
           
           <div className="bg-surface-base border border-border-base rounded-2xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-24 h-24 text-text-main"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${appUpdate?.available || updatingApp ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      {(appUpdate?.available || updatingApp) ? <circle cx="12" cy="12" r="3" fill="currentColor" className={updatingApp ? 'animate-pulse' : ''}/> : <path d="m9 12 2 2 4-4"/>}
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <h4 className="font-bold text-text-main text-lg mb-0.5">
                      {appLoading ? 'Checking system status...' : 
                       updatingApp ? 'Downloading System Update...' :
                       updateResult?.type === 'ok' ? 'System Ready to Update' :
                       (appUpdate?.available ? 'Update Available' : 'System Up to Date')}
                    </h4>
                    <p className="text-sm text-text-dim">
                      {appLoading ? 'Connecting to GitHub...' : 
                       updatingApp ? `Fetching v${appUpdate?.latest}...` :
                       updateResult?.type === 'ok' ? 'New version downloaded to your Downloads folder.' :
                       (appUpdate?.available ? `New version v${appUpdate.latest} is ready` : `You are running the latest version (v${appUpdate?.current || '1.0.0'})`)}
                    </p>
                  </div>
                </div>

                {!appLoading && !updatingApp && !updateResult && appUpdate?.available && (
                   <div className="flex items-center gap-3">
                      <button 
                        onClick={() => window.open(appUpdate.url, '_blank')}
                        className="px-4 py-2 rounded-xl text-text-dim hover:text-text-main hover:bg-surface-hover font-bold text-sm transition-all"
                      >
                        Changelog
                      </button>
                      <button 
                        onClick={handleUpdateApp}
                        className="px-6 py-2.5 rounded-xl bg-accent text-white font-bold text-sm shadow-lg shadow-accent/20 hover:scale-[1.03] active:scale-95 transition-all"
                      >
                        Update Now
                      </button>
                   </div>
                )}

                {updatingApp && updateProgress && (
                  <div className="flex flex-col items-end min-w-[120px]">
                    <span className="text-lg font-black text-accent">{updateProgress.progress}%</span>
                    <span className="text-[0.6rem] text-text-dim font-bold uppercase tracking-tight">
                      {Math.floor(updateProgress.speed / 1024 / 1024 * 10) / 10} MB/s
                    </span>
                  </div>
                )}

                {updateResult?.type === 'ok' && (
                  <button 
                    onClick={() => window.flatpak.openFolder(updateResult.path)}
                    className="px-6 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 font-bold text-sm hover:bg-emerald-500 hover:text-white transition-all"
                  >
                    Open Folder
                  </button>
                )}
              </div>

              {updatingApp && updateProgress && (
                <div className="mt-6 h-1 w-full bg-border-base/20 rounded-full overflow-hidden">
                   <div 
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${updateProgress.progress}%` }}
                   />
                </div>
              )}

              {!updatingApp && appUpdate?.available && appUpdate.notes && !updateResult && (
                <div className="mt-6 pt-6 border-t border-border-base/50">
                  <span className="text-[0.65rem] font-bold text-text-dim uppercase tracking-widest mb-2 block">Release Notes</span>
                  <div className="text-xs text-text-dim/80 leading-relaxed line-clamp-2 italic">
                    "{appUpdate.notes.split('\n')[0]}..."
                  </div>
                </div>
              )}

              {updateResult?.type === 'err' && (
                <div className="mt-4 text-xs text-red-500 font-medium">
                   Fail: {updateResult.msg}
                </div>
              )}
           </div>
        </section>

        <div className="flex flex-col items-center justify-center py-12 gap-5 text-center">
          <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-bold text-text-dim uppercase tracking-widest">Application Updates</h3>
           </div>
          {/* Icon */}
          <div className="w-16 h-16 rounded-3xl bg-surface-base border border-border-base flex items-center justify-center text-accent shadow-xl">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21 8-9-4-9 4V16l9 4 9-4V8z"/><path d="m3 8 9 4 9-4"/><path d="M12 12v8"/>
            </svg>
          </div>

          <p className="text-sm text-text-dim max-w-sm leading-relaxed">
            Check for available updates for all your installed Flatpak applications.
            This will update every app to the latest version from Flathub.
          </p>

          <button
            onClick={update}
            disabled={loading}
            className={`mt-2 px-8 py-3 rounded-2xl font-bold text-sm cursor-pointer transition-all duration-300
              bg-accent text-white shadow-lg shadow-accent/20
              hover:scale-[1.05] hover:shadow-xl hover:shadow-accent/30 active:scale-[0.95]
              ${loading ? 'opacity-60 pointer-events-none outline-none' : ''}`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating...
              </span>
            ) : 'Check for Updates'}
          </button>

          {status && (
            <div className={`animate-fade-up mt-2 px-5 py-3 rounded-xl text-sm font-medium
              ${status.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {status.msg}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
