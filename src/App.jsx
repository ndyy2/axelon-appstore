import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract base path for sidebar highlighting
  const activePath = location.pathname.split('/')[1] || 'home';

  const handleNavigate = (dest) => {
    if (dest === 'home') navigate('/');
    else navigate(`/${dest}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base text-text-main transition-colors duration-500 font-sans">
      <Sidebar active={activePath} onNavigate={handleNavigate} />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="pointer-events-none absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl z-0" />
        <div key={location.pathname} className="flex-1 flex flex-col h-full overflow-hidden relative z-10 animate-page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
