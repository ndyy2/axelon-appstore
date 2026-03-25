import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchFlathubAppData } from '../lib/flathub.js';
import AppIcon from '../components/AppIcon.jsx';
import { useDownloads } from '../context/DownloadContext.jsx';
import Modal from '../components/Modal.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function AppDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { installApp } = useDownloads();
  const { mode } = useTheme();
  const [info, setInfo] = useState(null);
  const [richData, setRichData] = useState(null);
  const [sizeData, setSizeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showUninstallModal, setShowUninstallModal] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const scrollRef = React.useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const offset = dir === 'left' ? -clientWidth * 0.8 : clientWidth * 0.8;
      scrollRef.current.scrollTo({ left: scrollLeft + offset, behavior: 'smooth' });
    }
  };

  // Helper: parse bytes from flatpak info text (e.g. "Installed size: 123.4 MB")
  function parseSizeFromInfo(text) {
    if (!text) return null;
    const m = text.match(/Installed[\s\S]*?size:\s*([0-9.,]+\s*[A-Za-z]+)/i);
    return m ? m[1].trim() : null;
  }

  function bytesToHuman(bytes) {
    if (!bytes) return null;
    const b = Number(bytes);
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Check if installed
        if (window.flatpak) {
          const listRes = await window.flatpak.listInstalled();
          if (listRes.ok) setIsInstalled(listRes.data.includes(id));

          // 2. Local info (raw fallback)
          const infoRes = await window.flatpak.appInfo(id);
          if (infoRes.ok && infoRes.data) setInfo(infoRes.data);
        }

        // 3. Rich Flathub metadata
        const flathubRes = await fetchFlathubAppData(id);
        if (flathubRes) setRichData(flathubRes);

        // 4. Remote info for sizes (uninstalled apps)
        if (window.flatpak && window.flatpak.remoteInfo) {
          const remoteRes = await window.flatpak.remoteInfo(id);
          if (remoteRes.ok && remoteRes.data) {
            const dSize = remoteRes.data.match(/Download:\s*([0-9.,]+\s*[A-Za-z]+)/i)?.[1];
            const iSize = remoteRes.data.match(/Installed:\s*([0-9.,]+\s*[A-Za-z]+)/i)?.[1];
            if (dSize || iSize) {
              setSizeData({ download: dSize, installed: iSize });
            }
          }
        } else if (flathubRes) {
          // Fallback to releases metadata if remoteInfo is not available (browser context)
          const rel = flathubRes.releases?.[0];
          if (rel?.size_download || rel?.size_installed) {
            setSizeData({
              download: bytesToHuman(rel.size_download),
              installed: bytesToHuman(rel.size_installed),
            });
          }
        }

        // 5. Raw Metadata (Permissions)
        if (window.flatpak && window.flatpak.getMetadata) {
          const metaRes = await window.flatpak.getMetadata(id);
          if (metaRes.ok && metaRes.data) {
            setPermissions(parsePermissions(metaRes.data));
          }
        }

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  function parsePermissions(raw) {
    const p = { network: false, system: false, device: false, x11: false, wayland: false, filesystem: [] };
    if (!raw) return p;
    
    const contextMatch = raw.match(/\[Context\]([\s\S]*?)(?=\n\[|$)/);
    if (!contextMatch) return p;
    const context = contextMatch[1];

    if (context.includes('shared=network')) p.network = true;
    if (context.includes('devices=all') || context.includes('devices=shm')) p.device = true;
    if (context.includes('sockets=x11')) p.x11 = true;
    if (context.includes('sockets=wayland')) p.wayland = true;
    if (context.includes('sockets=pulseaudio')) p.audio = true;

    const fsMatch = context.match(/filesystems=(.*)/);
    if (fsMatch) {
      p.filesystem = fsMatch[1].split(';').filter(Boolean).map(f => f.trim());
    }
    
    return p;
  }

  const handleInstall = async () => {
    if (!window.flatpak) return;
    setInstalling(true);
    const appName = richData?.name || id.split('.').pop() || id;
    try {
      const ok = await installApp(id, appName);
      if (ok) setIsInstalled(true);
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async () => {
    if (!window.flatpak) return;
    setInstalling(true);
    try {
      const res = await window.flatpak.uninstall(id);
      if (res.ok) setIsInstalled(false);
    } finally {
      setInstalling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full relative z-10 text-text-dim">
        <div className="w-8 h-8 border-[3px] border-border-base border-t-accent rounded-full animate-spin mb-4" />
        Fetching app details...
      </div>
    );
  }

  const appName = richData?.name || id.split('.').pop() || id;
  const developer = richData?.developer_name || 'Unknown Developer';
  const summary = richData?.summary || '';
  const descriptionHtml = richData?.description || '';
  const fallbackInfo = info || 'No description available.';

  // Correctly extract all screenshots by picking the highest resolution image for each
  const screenshots = richData?.screenshots?.map(s => {
    const sorted = [...(s.sizes || [])].sort((a, b) => Number(b.width) - Number(a.width));
    return sorted[0]?.src;
  }).filter(Boolean) || [];

  return (
    <div className="flex flex-col h-full relative z-10">
      {/* Header bar */}
      <div className="px-8 pt-8 pb-4 shrink-0 bg-transparent relative z-20">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-text-dim hover:text-text-main transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-12">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 animate-fade-up">
          <AppIcon 
            appId={id} 
            name={appName} 
            containerClass="w-32 h-32 rounded-3xl bg-gradient-to-br from-accent/20 to-surface-base border border-border-base shadow-xl shadow-accent/5" 
            className="w-24 h-24" 
          />
          
          <div className="flex flex-col items-start flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-text-main mb-1 truncate w-full">{appName}</h1>
            <p className="text-[0.95rem] font-medium text-accent mb-1">{developer}</p>
            <p className="text-sm text-text-dim mb-4 truncate w-full">{summary || id}</p>

            <div className="flex items-center gap-4 mb-6">
              {sizeData?.download && (
                <div className="flex flex-col">
                  <span className="text-[0.65rem] font-bold text-text-dim uppercase tracking-wider">Download</span>
                  <span className="text-sm font-semibold text-text-main/80">{sizeData.download}</span>
                </div>
              )}
              {sizeData?.download && sizeData?.installed && <div className="w-px h-6 bg-border-base" />}
              {(parseSizeFromInfo(info) || sizeData?.installed) && (
                <div className="flex flex-col">
                  <span className="text-[0.65rem] font-bold text-text-dim uppercase tracking-wider">Size on Disk</span>
                  <span className="text-sm font-semibold text-text-main/80">{parseSizeFromInfo(info) || sizeData?.installed}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              {!isInstalled ? (
                <button 
                  onClick={handleInstall}
                  disabled={installing}
                  className={`px-8 py-2.5 rounded-full font-bold text-sm bg-gradient-to-r from-violet-600 to-purple-500 text-white shadow-lg shadow-violet-500/25 hover:scale-105 active:scale-95 transition-all ${installing ? 'opacity-70 pointer-events-none' : ''}`}
                >
                  {installing ? 'Installing...' : 'Get & Install'}
                </button>
              ) : (
                <>
                  <button className="px-8 py-2.5 rounded-full font-bold text-sm bg-white/10 text-emerald-400 border border-emerald-500/20 cursor-default">
                    Installed
                  </button>
                  <button 
                    onClick={() => setShowUninstallModal(true)}
                    disabled={installing}
                    className={`px-6 py-2.5 rounded-full font-bold text-sm bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all ${installing ? 'opacity-70 pointer-events-none' : ''}`}
                  >
                    {installing ? 'Removing...' : 'Uninstall'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Screenshots Gallery */}
        {screenshots.length > 0 && (
          <div className="mb-12 animate-fade-up relative group/gallery" style={{ animationDelay: '50ms' }}>
            {/* Navigation Buttons */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-4 z-30 opacity-0 group-hover/gallery:opacity-100 transition-opacity">
              <button 
                onClick={() => scroll('left')}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-violet-600 transition-all shadow-xl"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 -right-4 z-30 opacity-0 group-hover/gallery:opacity-100 transition-opacity">
              <button 
                onClick={() => scroll('right')}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-violet-600 transition-all shadow-xl"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            <div 
              ref={scrollRef}
              className="flex gap-5 overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar scroll-smooth"
            >
              {screenshots.map((src, idx) => (
                <div 
                  key={idx} 
                  className="snap-center shrink-0 w-[480px] md:w-[640px] aspect-video bg-surface-base rounded-2xl border border-border-base overflow-hidden shadow-2xl relative group"
                >
                  <img 
                    src={src} 
                    alt={`Screenshot ${idx + 1}`} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
            
            {/* Indicators / Hint */}
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 bg-accent rounded-full" />
                <div className="h-1 w-2 bg-border-base rounded-full" />
                <div className="h-1 w-2 bg-border-base rounded-full" />
                <span className="text-[0.65rem] font-bold text-text-dim uppercase tracking-widest ml-2">App Preview Gallery</span>
              </div>
              <span className="text-[0.65rem] font-bold text-text-dim/50 uppercase tracking-tighter">
                {screenshots.length} Screenshots available
              </span>
            </div>
          </div>
        )}

        {/* Description & Metadata grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 animate-fade-up" style={{ animationDelay: '100ms' }}>
          
          <div className="md:col-span-2 flex flex-col gap-10">
            {/* Changelog Section */}
            {richData?.releases?.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-violet-400"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                   <h2 className="text-xl font-bold">Version History</h2>
                </div>
                <div className="space-y-4">
                  {richData.releases.slice(0, 3).map((rel, idx) => (
                    <div key={idx} className="bg-surface-base border border-border-base rounded-2xl p-5 hover:bg-surface-hover transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-bold text-text-main bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">{rel.version}</span>
                        <span className="text-[0.7rem] text-text-dim font-medium">
                          {rel.version_date ? new Date(rel.version_date).toLocaleDateString() : ''}
                        </span>
                      </div>
                      {rel.description && (
                        <div 
                          className={`text-[0.85rem] text-text-dim/90 leading-relaxed prose prose-p:my-1 prose-ul:my-1 max-w-none ${mode === 'dark' ? 'prose-invert' : 'prose-slate'}`}
                          dangerouslySetInnerHTML={{ __html: rel.description }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold mb-4">Description</h2>
              {descriptionHtml ? (
                <div 
                  className={`prose prose-p:text-sm prose-p:text-text-dim prose-p:leading-relaxed prose-headings:text-text-main prose-a:text-accent max-w-none ${mode === 'dark' ? 'prose-invert' : 'prose-slate'}`}
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }} 
                />
              ) : (
                <div className="text-sm text-text-dim leading-relaxed whitespace-pre-wrap">
                  {fallbackInfo}
                </div>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-6">
            {/* Permissions Section */}
            {permissions && (
              <div className="bg-surface-base border border-border-base rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-16 h-16 text-text-main"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h3 className="text-xs font-bold text-text-dim uppercase tracking-widest mb-5 flex items-center gap-2">
                  <span className="w-1 h-3 bg-accent rounded-full" />
                  App Permissions
                </h3>
                <div className="flex flex-col gap-4">
                  <div className={`flex items-center gap-3 p-3 rounded-2xl border ${permissions.network ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500' : 'bg-surface-hover border-border-base text-text-dim'}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">Network Access</span>
                      <span className="text-[0.6rem] opacity-70">{permissions.network ? 'Full Internet Access' : 'No network access'}</span>
                    </div>
                  </div>

                  {(permissions.x11 || permissions.wayland) && (
                    <div className="flex items-center gap-3 p-3 rounded-2xl border bg-blue-500/5 border-blue-500/10 text-blue-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">Display System</span>
                        <span className="text-[0.6rem] opacity-70">{permissions.wayland ? 'Wayland' : 'X11 Window System'}</span>
                      </div>
                    </div>
                  )}

                  {permissions.device && (
                    <div className="flex items-center gap-3 p-3 rounded-2xl border bg-amber-500/5 border-amber-500/10 text-amber-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">Hardware Access</span>
                        <span className="text-[0.6rem] opacity-70">Devices, GPU, Input</span>
                      </div>
                    </div>
                  )}

                  {permissions.filesystem.length > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-2xl border bg-violet-500/5 border-violet-500/10 text-violet-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold">File System</span>
                        <span className="text-[0.6rem] opacity-70 truncate" title={permissions.filesystem.join(', ')}>
                          {permissions.filesystem[0]}{permissions.filesystem.length > 1 ? ` +${permissions.filesystem.length - 1} more` : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-surface-base border border-border-base rounded-2xl p-5">
              <h3 className="text-xs font-bold text-text-dim uppercase tracking-wider mb-3">Information</h3>
              
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-dim">App ID</span>
                    <span className="text-text-main/80 truncate max-w-[150px]" title={id}>{id}</span>
                  </div>
                  {/* Size info: prefer flatpak info parse, fallback to releases metadata */}
                  {(parseSizeFromInfo(info) || sizeData?.installed) && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-dim">Installed Size</span>
                      <span className="text-text-main/80">{parseSizeFromInfo(info) || sizeData?.installed}</span>
                    </div>
                  )}
                  {sizeData?.download && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-dim">Download Size</span>
                      <span className="text-text-main/80">{sizeData.download}</span>
                    </div>
                  )}
                  {richData?.bundle?.runtime && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-dim">Runtime</span>
                      <span className="text-text-main/80 truncate max-w-[150px]">{richData.bundle.runtime.split('/')[0]}</span>
                    </div>
                  )}
                  {richData?.urls?.homepage && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-dim">Website</span>
                      <a href={richData.urls.homepage} target="_blank" rel="noreferrer" className="text-accent hover:underline truncate max-w-[150px]">Visit</a>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-dim">License</span>
                    <span className="text-text-main/80 truncate max-w-[150px]" title={richData?.project_license}>{richData?.project_license || 'Unknown'}</span>
                  </div>
                </div>
            </div>

            {/* Offline metadata fallback info block */}
            {info && (
              <div className="bg-surface-base border border-border-base rounded-2xl p-5">
                <h3 className="text-xs font-bold text-text-dim uppercase tracking-wider mb-2">Local System Info</h3>
                <pre className="text-[0.7rem] text-text-dim overflow-x-auto whitespace-pre-wrap">{info}</pre>
              </div>
            )}
          </div>

        </div>
      </div>

      <Modal
        isOpen={showUninstallModal}
        onClose={() => setShowUninstallModal(false)}
        title="Uninstall Application"
        confirmLabel="Uninstall"
        onConfirm={handleUninstall}
        isDanger={true}
      >
        Are you sure you want to remove <span className="font-bold text-white">{appName}</span>? 
        This will delete the application and its local data.
      </Modal>
    </div>
  );
}
