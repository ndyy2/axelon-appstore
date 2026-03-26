import { app, BrowserWindow, ipcMain, net, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import util from 'util';

const execAsync = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#09090b',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.setMenu(null);

  const isDev = process.argv.includes('--dev');
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// ── Flatpak IPC Handlers ──

ipcMain.handle('flatpak:search', async (_e, query) => {
  try {
    const { stdout } = await execAsync(
      `flatpak search "${query.replace(/"/g, '')}" --columns=application,name,description,version`
    );
    return { ok: true, data: stdout };
  } catch {
    return { ok: true, data: '' };
  }
});

ipcMain.handle('flatpak:list-installed', async () => {
  try {
    const { stdout } = await execAsync(
      'flatpak list --app --columns=application,name,version,origin'
    );
    return { ok: true, data: stdout };
  } catch {
    return { ok: false, data: '' };
  }
});

ipcMain.handle('flatpak:install', async (_e, appId) => {
  try {
    const { stdout } = await execAsync(`flatpak install -y flathub ${appId}`);
    return { ok: true, msg: stdout };
  } catch (err) {
    return { ok: false, msg: err.message };
  }
});

ipcMain.handle('flatpak:uninstall', async (_e, appId) => {
  try {
    const { stdout } = await execAsync(`flatpak uninstall -y ${appId}`);
    return { ok: true, msg: stdout };
  } catch (err) {
    return { ok: false, msg: err.message };
  }
});

ipcMain.handle('flatpak:update-all', async () => {
  try {
    const { stdout } = await execAsync('flatpak update -y');
    return { ok: true, msg: stdout };
  } catch (err) {
    return { ok: false, msg: err.message };
  }
});

ipcMain.handle('flatpak:app-info', async (_e, appId) => {
  try {
    const { stdout } = await execAsync(`flatpak info ${appId}`);
    return { ok: true, data: stdout };
  } catch (err) {
    return { ok: false, data: '' };
  }
});

ipcMain.handle('flatpak:remote-info', async (_e, appId) => {
  try {
    const { stdout } = await execAsync(`flatpak remote-info flathub ${appId}`);
    return { ok: true, data: stdout };
  } catch (err) {
    return { ok: false, data: '' };
  }
});

ipcMain.handle('flatpak:get-metadata', async (_e, appId) => {
  try {
    const { stdout } = await execAsync(`flatpak remote-info --show-metadata flathub ${appId}`);
    return { ok: true, data: stdout };
  } catch (err) {
    return { ok: false, data: '' };
  }
});

// ── Yay (AUR) IPC Handlers ──

async function isArch() {
  try {
    const osRelease = await fs.promises.readFile('/etc/os-release', 'utf8');
    return osRelease.includes('ID=arch') || osRelease.includes('ID_LIKE=arch');
  } catch {
    return false;
  }
}

ipcMain.handle('yay:is-supported', async () => {
  if (process.platform !== 'linux') return { ok: true, supported: false };
  const arch = await isArch();
  if (!arch) return { ok: true, supported: false };
  try {
    await execAsync('which yay');
    return { ok: true, supported: true };
  } catch {
    return { ok: true, supported: false };
  }
});

ipcMain.handle('yay:search', async (_e, query) => {
  try {
    // yay -Ss returns <repo>/<name> <version> <stats> <status>\n  <description>
    // We'll use a simplified search or parse it carefully
    const { stdout } = await execAsync(`yay -Ss "${query.replace(/"/g, '')}"`);
    return { ok: true, data: stdout };
  } catch {
    return { ok: true, data: '' };
  }
});

ipcMain.handle('yay:list-installed', async () => {
  try {
    const { stdout } = await execAsync('yay -Qm');
    return { ok: true, data: stdout };
  } catch {
    return { ok: false, data: '' };
  }
});

ipcMain.handle('yay:install', async (_e, pkgName) => {
  try {
    // Using pkexec to handle authentication
    const { stdout } = await execAsync(`pkexec yay -S --noconfirm ${pkgName}`);
    return { ok: true, msg: stdout };
  } catch (err) {
    return { ok: false, msg: err.message };
  }
});

ipcMain.handle('yay:uninstall', async (_e, pkgName) => {
  try {
    const { stdout } = await execAsync(`pkexec yay -Rs --noconfirm ${pkgName}`);
    return { ok: true, msg: stdout };
  } catch (err) {
    return { ok: false, msg: err.message };
  }
});

ipcMain.handle('yay:check-updates', async () => {
  try {
    const { stdout } = await execAsync('yay -Qua');
    return { ok: true, data: stdout };
  } catch {
    return { ok: true, data: '' };
  }
});

ipcMain.handle('yay:update-all', async () => {
  try {
    const { stdout } = await execAsync('pkexec yay -Sua --noconfirm');
    return { ok: true, msg: stdout };
  } catch (err) {
    return { ok: false, msg: err.message };
  }
});

ipcMain.handle('yay:get-local-icon', async (_e, pkgName) => {
  try {
    // Try to find icon paths for the package using pacman -Ql
    const { stdout } = await execAsync(`pacman -Ql ${pkgName} | grep -E '\\.png$|\\.svg$' | grep /icons/hicolor/`);
    if (!stdout) return { ok: false };
    
    const lines = stdout.trim().split('\n').map(l => l.split(' ')[1]).filter(Boolean);
    
    // Priority: SVG > 256x256 > 128x128 > 64x64 > 48x48
    const bestIcon = lines.find(l => l.endsWith('.svg')) || 
                     lines.find(l => l.includes('256x256')) ||
                     lines.find(l => l.includes('128x128')) ||
                     lines.find(l => l.includes('64x64')) ||
                     lines.find(l => l.includes('48x48')) ||
                     lines[0];
    
    if (bestIcon && fs.existsSync(bestIcon)) {
      const content = await fs.promises.readFile(bestIcon);
      const ext = path.extname(bestIcon).substring(1);
      const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
      return { ok: true, data: `data:${mime};base64,${content.toString('base64')}` };
    }
    return { ok: false };
  } catch {
    // Fallback: search by name in common icon paths if pacman -Ql fails
    try {
      const { stdout } = await execAsync(`find /usr/share/icons/hicolor -name "${pkgName}.*" | grep -E '\\.png$|\\.svg$'`);
      if (stdout) {
        const iconPaths = stdout.trim().split('\n');
        const bestIcon = iconPaths.find(l => l.endsWith('.svg')) || iconPaths[0];
        const content = await fs.promises.readFile(bestIcon);
        const ext = path.extname(bestIcon).substring(1);
        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
        return { ok: true, data: `data:${mime};base64,${content.toString('base64')}` };
      }
    } catch {}
    return { ok: false };
  }
});

// ── App Self-Update (GitHub) ──

ipcMain.handle('app:check-update', async () => {
  return new Promise((resolve) => {
    const repo = 'ndyy2/axelon-appstore';
    const request = net.request(`https://api.github.com/repos/${repo}/releases/latest`);

    request.on('response', (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          if (response.statusCode !== 200) {
            return resolve({ ok: false, msg: `GitHub API error: ${response.statusCode}` });
          }

          const release = JSON.parse(data);
          const latestVersion = release.tag_name.replace(/^v/, '');
          const currentVersion = app.getVersion();

          const hasUpdate = latestVersion !== currentVersion;

          resolve({
            ok: true,
            available: hasUpdate,
            current: currentVersion,
            latest: latestVersion,
            name: release.name,
            notes: release.body,
            url: release.html_url,
            assets: release.assets
          });
        } catch (err) {
          resolve({ ok: false, msg: 'Failed to parse GitHub response' });
        }
      });
    });

    request.on('error', (err) => {
      resolve({ ok: false, msg: err.message });
    });

    request.end();
  });
});

ipcMain.handle('app:perform-update', async (event, asset) => {
  return new Promise((resolve) => {
    const downloadUrl = asset.browser_download_url;
    const destPath = path.join(os.homedir(), 'Downloads', asset.name);
    
    const download = (url) => {
      const request = net.request(url);
      
      request.on('response', (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          return download(response.headers.location);
        }

        if (response.statusCode !== 200) {
          return resolve({ ok: false, msg: `Download failed: ${response.statusCode}` });
        }

        const totalBytes = parseInt(response.headers['content-length'], 10);
        let downloadedBytes = 0;
        let lastTime = Date.now();
        let lastBytes = 0;

        const fileStream = fs.createWriteStream(destPath);
        
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          fileStream.write(chunk);
          
          const now = Date.now();
          if (now - lastTime > 500) {
            const speed = (downloadedBytes - lastBytes) / ((now - lastTime) / 1000);
            event.sender.send('app:update-progress', {
              progress: Math.floor((downloadedBytes / totalBytes) * 100),
              downloaded: downloadedBytes,
              total: totalBytes,
              speed: speed
            });
            lastTime = now;
            lastBytes = downloadedBytes;
          }
        });

        response.on('end', () => {
          fileStream.end();
          try { fs.chmodSync(destPath, 0o755); } catch {}
          resolve({ ok: true, path: destPath });
        });
      });

      request.on('error', (err) => {
        resolve({ ok: false, msg: err.message });
      });

      request.end();
    };

    download(downloadUrl);
  });
});

ipcMain.handle('app:open-folder', async (_e, filePath) => {
  shell.showItemInFolder(filePath);
});

// ── Lifecycle ──

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
