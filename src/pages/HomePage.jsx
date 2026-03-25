import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppIcon from '../components/AppIcon.jsx';
import { useDownloads } from '../context/DownloadContext.jsx';

const CATEGORIES = [
  { id: 'AudioVideo', name: 'Multimedia', icon: '🎵', bg: 'bg-rose-500/10', text: 'text-rose-400' },
  { id: 'Development', name: 'Development', icon: '💻', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  { id: 'Game', name: 'Games', icon: '👾', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  { id: 'Graphics', name: 'Productivity', icon: '🎨', bg: 'bg-amber-500/10', text: 'text-amber-400' }
];

export default function HomePage() {
  const navigate = useNavigate();
  const { installApp } = useDownloads();
  const [featured, setFeatured] = useState(null);
  const [sections, setSections] = useState({
    trending: [],
    multimedia: [],
    development: [],
    games: []
  });
  const [loading, setLoading] = useState(true);

  const fetchSection = async (q, limit = 6) => {
    try {
      const r = await window.flatpak.search(q);
      if (r.ok && r.data) {
        return r.data.trim().split('\n').map(l => {
          const [appId, name, desc] = l.split('\t');
          if(!appId || appId.includes('.Platform') || appId.includes('.Sdk')) return null;
          return { appId, name, desc: (desc || '').trim() };
        }).filter(Boolean).slice(0, limit);
      }
    } catch {}
    return [];
  };

  useEffect(() => {
    async function loadAll() {
      if (!window.flatpak) return setLoading(false);
      try {
        const [trending, multimedia, development, games] = await Promise.all([
          fetchSection('popular', 8),
          fetchSection('video', 6),
          fetchSection('code', 6),
          fetchSection('game', 6)
        ]);
        
        setSections({ trending, multimedia, development, games });
        if (trending.length > 0) setFeatured(trending[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto relative z-10 pb-12 transition-colors duration-500">
      {/* Hero Banner */}
      <div className="relative h-[320px] w-full flex flex-col justify-end p-10 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-bg-base/90 to-bg-base z-0" />
        <div className="absolute top-0 right-0 w-2/3 h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent opacity-60 z-0" />
        
        {featured && !loading && (
          <div className="absolute top-1/2 -translate-y-1/2 right-20 w-64 h-64 bg-violet-600/10 rounded-[4rem] blur-[80px] animate-pulse" />
        )}

        <div className="relative z-10 flex items-center gap-10">
          <div className="flex-1">
            <span className="inline-block px-3 py-1 bg-violet-500/10 backdrop-blur-md rounded-full text-[0.65rem] font-bold tracking-widest text-violet-400 mb-4 border border-violet-500/20 shadow-lg uppercase">Featured Spotlight</span>
            <h1 className="text-[2.8rem] font-extrabold tracking-tight leading-none mb-3 text-text-main">
              {featured ? featured.name : 'Discover new apps.'}
            </h1>
            <p className="text-text-dim max-w-lg text-[1rem] leading-relaxed mb-6">
              {featured ? featured.desc : 'The elegant, production-ready flatpak center for your Arch Linux workflow.'}
            </p>
            {featured && (
              <button 
                onClick={() => navigate(`/app/${featured.appId}`)}
                className="px-8 py-3 rounded-2xl bg-text-main text-bg-base font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-text-main/10"
              >
                Learn More
              </button>
            )}
          </div>
          
          {featured && (
            <div className="hidden lg:block shrink-0 animate-fade-in">
              <AppIcon 
                appId={featured.appId} 
                name={featured.name} 
                containerClass="w-40 h-40 rounded-[2.5rem] bg-gradient-to-br from-text-main/10 to-transparent border border-border-base shadow-2xl backdrop-blur-md"
                className="w-24 h-24"
              />
            </div>
          )}
        </div>
      </div>

      <div className="px-10 mt-8">
        {/* Categories */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold tracking-tight">Browse Categories</h2>
            <button className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">See All</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map(c => (
              <div 
                key={c.id} 
                onClick={() => navigate(`/search?q=${c.id === 'AudioVideo' ? 'video' : c.id === 'Graphics' ? 'productivity' : c.id.toLowerCase()}`)}
                className={`${c.bg} border ${c.bg.replace('10', '20')} rounded-2xl p-5 flex flex-col items-start gap-4 cursor-pointer hover:-translate-y-1 hover:border-accent/40 transition-all group`}
              >
                <div className="w-10 h-10 rounded-xl bg-surface-hover flex items-center justify-center text-2xl drop-shadow-md group-hover:scale-110 transition-transform">{c.icon}</div>
                <span className={`font-bold text-sm ${c.text}`}>{c.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Apps */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold tracking-tight">Trending Now</h2>
            <button onClick={() => navigate('/search')} className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">Search More</button>
          </div>

          {loading ? (
             <div className="flex gap-4 overflow-hidden">
                {[1,2,3].map(i => <div key={i} className="w-[300px] h-[120px] bg-surface-base rounded-2xl animate-pulse shrink-0" />)}
             </div>
          ) : (
            <div className="flex flex-col gap-16">
              {/* Trending Grid */}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
                {sections.trending.map((app, i) => (
                  <AppRowCard key={app.appId} app={app} index={i} installApp={installApp} navigate={navigate} />
                ))}
              </div>

              {/* Categorized Rows */}
              <AppSection title="Multimedia Creator" apps={sections.multimedia} navigate={navigate} installApp={installApp} />
              <AppSection title="Developer Tools" apps={sections.development} navigate={navigate} installApp={installApp} />
              <AppSection title="Games & Fun" apps={sections.games} navigate={navigate} installApp={installApp} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AppSection({ title, apps, navigate, installApp }) {
  if (apps.length === 0) return null;
  return (
    <div className="animate-fade-up">
       <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold tracking-tight text-text-main/80">{title}</h2>
          <button className="text-xs font-bold text-text-dim hover:text-text-main transition-colors uppercase tracking-widest">See More</button>
       </div>
       <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {apps.map((app, i) => (
            <div 
              key={app.appId}
              onClick={() => navigate(`/app/${app.appId}`)}
              className="bg-surface-base border border-border-base rounded-xl p-3 flex items-center gap-3 hover:bg-surface-hover hover:border-accent/20 transition-all cursor-pointer group"
            >
               <AppIcon 
                  appId={app.appId} 
                  name={app.name}                   containerClass="w-11 h-11 rounded-lg bg-surface-hover shrink-0 group-hover:scale-105 transition-transform" 
                  className="w-7 h-7" 
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs truncate text-text-main/90">{app.name}</h4>
                  <p className="text-[0.65rem] text-text-dim truncate mt-0.5">{app.appId}</p>
                </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      installApp(app.appId, app.name);
                    }}
                    className="p-2 rounded-lg bg-accent/5 text-text-dim hover:bg-accent hover:text-white transition-all shadow-lg active:scale-95"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
            </div>
          ))}
       </div>
    </div>
  );
}

function AppRowCard({ app, index, installApp, navigate }) {
  return (
    <div 
      onClick={() => navigate(`/app/${app.appId}`)}
      className="animate-fade-up bg-surface-base border border-border-base rounded-2xl p-5 flex items-start gap-5 hover:bg-surface-hover hover:border-accent/40 cursor-pointer transition-all shadow-xl shadow-black/5"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <AppIcon 
          appId={app.appId} 
          name={app.name} 
          containerClass="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-surface-base shadow-lg group-hover:scale-105 transition-transform" 
          className="w-10 h-10" 
      />
      <div className="flex flex-col flex-1 min-w-0">
        <h3 className="font-bold text-[1rem] truncate text-text-main">{app.name}</h3>
        <p className="text-[0.75rem] text-text-dim line-clamp-2 mt-1.5 leading-relaxed mb-4">{app.desc}</p>
        
        <div className="mt-auto">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              installApp(app.appId, app.name);
            }}
            className="px-5 py-2 rounded-xl bg-accent/10 text-accent text-xs font-extrabold hover:bg-accent hover:text-white transition-all shadow-lg active:scale-95 border border-accent/20"
          >
            Get Now
          </button>
        </div>
      </div>
    </div>
  );
}
