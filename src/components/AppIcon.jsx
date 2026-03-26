import React, { useState, useEffect } from 'react';
import { fetchFlathubAppData } from '../lib/flathub.js';

export default function AppIcon({ appId, name, source = 'flatpak', className = '', containerClass = '' }) {
  const [iconUrl, setIconUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      // 1. Try Flathub first for flatpaks
      if (source === 'flatpak') {
        const data = await fetchFlathubAppData(appId);
        if (mounted && data?.icon) {
          if (data.icon.startsWith('http')) {
            setIconUrl(data.icon);
            return;
          } else {
            setIconUrl(`https://dl.flathub.org/media/${appId}/${data.icon}`);
            return;
          }
        }
      }

      // 2. Try local icon for AUR (or as fallback for flatpak if installed)
      try {
        const localIcon = await window.yay?.getLocalIcon(appId);
        if (mounted && localIcon?.ok && localIcon.data) {
          setIconUrl(localIcon.data);
          return;
        }
      } catch {}

      if (mounted) setError(true);
    }
    load();
    return () => { mounted = false; };
  }, [appId, source]);

  if (error || !iconUrl) {
    const isAur = source === 'aur';
    return (
      <div className={`flex items-center justify-center font-bold text-white shrink-0 ${containerClass} border shadow-inner transition-all duration-300
        ${isAur ? 'bg-gradient-to-br from-cyan-600 to-blue-700 border-cyan-400/30' : 'bg-surface-base border-border-base text-text-main'}`}>
        <span className={isAur ? 'drop-shadow-md' : ''}>
          {name?.[0]?.toUpperCase() || '?'}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center shrink-0 ${containerClass} overflow-hidden bg-surface-base/50`}>
      <img 
        src={iconUrl} 
        alt={name} 
        className={`object-contain ${className}`} 
        onError={() => setError(true)} 
      />
    </div>
  );
}
