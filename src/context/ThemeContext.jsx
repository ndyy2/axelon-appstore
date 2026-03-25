import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ACCENTS = {
  violet: { label: 'Violet', color: '#7c3aed', glow: 'rgba(124, 58, 237, 0.3)' },
  emerald: { label: 'Emerald', color: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' },
  blue: { label: 'Blue', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.3)' },
  amber: { label: 'Amber', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
  rose: { label: 'Rose', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.3)' },
};

export function ThemeProvider({ children }) {
  const [accent, setAccent] = useState(() => {
    return localStorage.getItem('axelon-accent') || 'violet';
  });

  const [mode, setMode] = useState(() => {
    return localStorage.getItem('axelon-mode') || 'dark';
  });

  const toggleMode = () => setMode(m => m === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    localStorage.setItem('axelon-accent', accent);
    localStorage.setItem('axelon-mode', mode);
    
    const root = document.documentElement;
    const theme = ACCENTS[accent] || ACCENTS.violet;
    
    // Update CSS variables for Tailwind v4 theme compatibility
    root.style.setProperty('--color-accent', theme.color);
    root.style.setProperty('--color-accent-glow', theme.glow);
    
    // Set theme class on body/root
    root.classList.remove('light', 'dark');
    root.classList.add(mode);
  }, [accent, mode]);

  return (
    <ThemeContext.Provider value={{ accent, setAccent, accents: ACCENTS, mode, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
