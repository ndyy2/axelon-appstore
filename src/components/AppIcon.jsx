import React, { useState, useEffect } from 'react';
import { fetchFlathubAppData } from '../lib/flathub.js';

export default function AppIcon({ appId, name, className = '', containerClass = '' }) {
  const [iconUrl, setIconUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const data = await fetchFlathubAppData(appId);
      if (mounted && data?.icon) {
        // Fallback to desktop URL format if icon is a local reference or the API formats it differently
        if (data.icon.startsWith('http')) {
          setIconUrl(data.icon);
        } else {
           // Heuristic for missing domain
          setIconUrl(`https://dl.flathub.org/media/${appId}/${data.icon}`);
        }
      } else if (mounted) {
        setError(true);
      }
    }
    load();
    return () => { mounted = false; };
  }, [appId]);

  if (error || !iconUrl) {
    return (
      <div className={`flex items-center justify-center font-bold text-text-main shrink-0 ${containerClass} bg-surface-base border border-border-base`}>
        {name?.[0]?.toUpperCase() || '?'}
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
