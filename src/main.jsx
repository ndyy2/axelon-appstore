import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './App.jsx';
import HomePage from './pages/HomePage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import AppDetailPage from './pages/AppDetailPage.jsx';
import InstalledPage from './pages/InstalledPage.jsx';
import UpdatesPage from './pages/UpdatesPage.jsx';
import DownloadsPage from './pages/DownloadsPage.jsx';
import { DownloadProvider } from './context/DownloadContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import DownloadPanel from './components/DownloadPanel.jsx';
import './index.css';

if (!window.flatpak) {
  console.warn("Running in standard browser. Flatpak API mocked.");
  window.flatpak = {
    search: async () => ({
      ok: true,
      data: 'org.mock.App1\tMock Browser App\tA mock app to test UI in browser\t1.0\norg.mock.App2\tMock Studio\tAnother mock app for testing\t2024.1'
    }),
    listInstalled: async () => ({
      ok: true,
      data: 'org.mock.App1\tMock Browser App\t1.0\tflathub\norg.mock.Installed2\tInstalled Mock\t1.0\tflathub'
    }),
    install: async () => new Promise(r => setTimeout(() => r({ ok: true }), 1000)),
    uninstall: async () => new Promise(r => setTimeout(() => r({ ok: true }), 1000)),
    updateAll: async () => new Promise(r => setTimeout(() => r({ ok: true, msg: 'Mock updated' }), 1500)),
    appInfo: async (id) => new Promise(r => setTimeout(() => r({
      ok: true,
      data: `Application: ${id}\nVersion: 1.0\nArch: x86_64\nOrigin: flathub\nMight be a mock installed app with some text block.`
    }))),
    remoteInfo: async (id) => ({ ok: true, data: `ID: ${id}\nDownload: 45 MB\nInstalled: 120 MB` }),
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <DownloadProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="app/:id" element={<AppDetailPage />} />
              <Route path="installed" element={<InstalledPage />} />
              <Route path="updates" element={<UpdatesPage />} />
              <Route path="downloads" element={<DownloadsPage />} />
            </Route>
          </Routes>
          <DownloadPanel />
        </HashRouter>
      </DownloadProvider>
    </ThemeProvider>
  </React.StrictMode>
);
