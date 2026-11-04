import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { GsmtcBridge } from './gsmtc-bridge';
import { SpotiflySettings, SpotifyTokens, TrackState } from '../types/player';

const logFile = path.join(app.getPath('userData'), 'spotifly-debug.log');
function logDebug(msg: string) {
  try {
    fs.appendFileSync(logFile, `${new Date().toISOString()} ${msg}\n`);
  } catch {}
}

process.on('uncaughtException', (err) => {
  logDebug(`[UNCAUGHT] ${err.stack || err.message}`);
});

process.on('unhandledRejection', (reason) => {
  logDebug(`[UNHANDLED REJECTION] ${reason}`);
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  logDebug(`[LOCK] Failed to acquire lock, quitting. args=${JSON.stringify(process.argv)}`);
  app.quit();
} else {
  logDebug(`[LOCK] Acquired lock successfully. pid=${process.pid} args=${JSON.stringify(process.argv)}`);
}

// Native Electron protocol and startup registration
try {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('spoti-fly', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('spoti-fly');
  }
} catch (err: any) {
  logDebug(`[PROTOCOL] Protocol registration failed: ${err?.message}`);
}

try {
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
      args: ['--autostart'],
    });
  }
} catch (err: any) {
  logDebug(`[AUTOSTART] Login item registration failed: ${err?.message}`);
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let gsmtcBridge: GsmtcBridge | null = null;
let isAlwaysOnTop = true;
let isQuitting = false;
let targetHeight = 130;
let currentHeight = 130;
let heightAnimTimer: NodeJS.Timeout | null = null;
let animResolve: (() => void) | null = null;

const configPath = path.join(app.getPath('userData'), 'spotifly-settings.json');

const defaultSettings: SpotiflySettings = {
  mode: 'gsmtc',
  alwaysOnTop: true,
  showMarquee: true,
  minimalMode: false,
  opacity: 100,
};

function loadSettings(): SpotiflySettings {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...defaultSettings, ...data };
    }
  } catch {}
  return defaultSettings;
}

function saveSettings(settings: Partial<SpotiflySettings>) {
  try {
    const current = loadSettings();
    const updated = { ...current, ...settings };
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf8');
  } catch {}
}

const tokensPath = path.join(app.getPath('userData'), 'spotify-tokens.json');

function loadTokens(): SpotifyTokens | null {
  try {
    if (fs.existsSync(tokensPath)) {
      return JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    }
  } catch {}
  return null;
}

function saveTokens(tokens: SpotifyTokens) {
  try {
    fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2), 'utf8');
  } catch {}
}

function clearTokens() {
  try {
    if (fs.existsSync(tokensPath)) {
      fs.unlinkSync(tokensPath);
    }
  } catch {}
}

function getLogoPath(): string {
  const p1 = path.resolve(__dirname, 'logo.png');
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), 'public/logo.png');
  if (fs.existsSync(p2)) return p2;
  const p3 = path.resolve(process.cwd(), 'src/renderer/assets/logo.png');
  if (fs.existsSync(p3)) return p3;
  return p1;
}

function createAppIcon(): Electron.NativeImage {
  const logoPath = getLogoPath();
  if (fs.existsSync(logoPath)) {
    return nativeImage.createFromPath(logoPath);
  }
  return nativeImage.createEmpty();
}

function createTrayIcon(): Electron.NativeImage {
  const appIcon = createAppIcon();
  if (!appIcon.isEmpty()) {
    return appIcon.resize({ width: 16, height: 16 });
  }
  return nativeImage.createEmpty();
}

function createWindow() {
  const settings = loadSettings();
  isAlwaysOnTop = true; // Always default to true so it stays visible on top of Spotify
  const appIcon = createAppIcon();
  const initialHeight = settings.minimalMode ? 72 : 130;
  targetHeight = initialHeight;
  currentHeight = initialHeight;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
  const initialX = Math.max(20, screenW - 360);
  const initialY = Math.max(20, screenH - initialHeight - 80);

  mainWindow = new BrowserWindow({
    title: 'Spoti-Fly',
    icon: !appIcon.isEmpty() ? appIcon : undefined,
    width: 320,
    height: initialHeight,
    x: initialX,
    y: initialY,
    resizable: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
  });

  // Windows-specific high always-on-top level so Spotify fullscreen does not occlude it
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true);

  // Load renderer
  const indexPath = path.join(__dirname, '../renderer/index.html');
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      if (fs.existsSync(indexPath)) {
        mainWindow?.loadFile(indexPath);
      }
    });
  } else {
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    logDebug(`[CONSOLE ${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    logDebug(`[RENDERER] did-finish-load successfully at bounds: ${JSON.stringify(mainWindow?.getBounds())}`);
    const isAutostart = process.argv.includes('--autostart') || process.argv.includes('--minimized') || process.argv.includes('--hidden');
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!isAutostart) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.moveTop();
      } else {
        logDebug('[APP] Started in background/autostart mode. Window remains hidden until summoned.');
      }
    }
  });

  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription) => {
    logDebug(`[RENDERER] did-fail-load: ${errorCode} ${errorDescription}`);
  });

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    logDebug(`[RENDERER] render-process-gone: ${JSON.stringify(details)}`);
  });

  // Intercept close event: hide window to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      logDebug(`[WINDOW] mainWindow hidden instead of closed`);
      return false;
    }
    logDebug(`[WINDOW] mainWindow closing permanently`);
  });

  mainWindow.on('closed', () => {
    logDebug(`[WINDOW] mainWindow closed event`);
    mainWindow = null;
  });

  // Setup System Tray
  setupTray();

  // Initialize GSMTC bridge
  gsmtcBridge = new GsmtcBridge((track: TrackState) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('media:update', track);
    }
  });
}

function setupTray() {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Spoti-Fly - Spotify Mini-Player');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show / Hide Spoti-Fly',
      click: () => {
        if (!mainWindow) return;
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          showAndFocusWindow();
        }
      },
    },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click: (item) => {
        isAlwaysOnTop = item.checked;
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(isAlwaysOnTop, 'screen-saver');
          mainWindow.webContents.send('window:always-on-top-changed', isAlwaysOnTop);
        }
        saveSettings({ alwaysOnTop: isAlwaysOnTop });
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Spoti-Fly',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      showAndFocusWindow();
    }
  });
}

function showAndFocusWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.moveTop();
  mainWindow.focus();
  mainWindow.flashFrame(false);
}

// IPC Handlers
// Smooth Weighted Drag Engine (Monotonic Lerp - ZERO bounce, pure fluid motion)
let isSmoothDragging = false;
let smoothDragTimer: NodeJS.Timeout | null = null;
let currentX = 0;
let currentY = 0;
let targetX = 0;
let targetY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;

// LERP_FACTOR: 0.32 provides a responsive, buttery-smooth follow with weighted dampening
// Strictly monotonic: mathematically impossible to bounce, rubber-band, or overshoot!
const LERP_FACTOR = 0.32;

function startSmoothDragLoop() {
  if (smoothDragTimer) return;
  smoothDragTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      stopSmoothDragLoop();
      return;
    }

    if (isSmoothDragging) {
      const cursor = screen.getCursorScreenPoint();
      targetX = cursor.x - dragOffsetX;
      targetY = cursor.y - dragOffsetY;
    }

    const dx = targetX - currentX;
    const dy = targetY - currentY;

    // Smoothly close the distance without ever overshooting
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      currentX += dx * LERP_FACTOR;
      currentY += dy * LERP_FACTOR;
      mainWindow.setPosition(Math.round(currentX), Math.round(currentY));
    } else {
      currentX = targetX;
      currentY = targetY;
      mainWindow.setPosition(Math.round(currentX), Math.round(currentY));
      if (!isSmoothDragging) {
        stopSmoothDragLoop();
      }
    }
  }, 10);
}

function stopSmoothDragLoop() {
  if (smoothDragTimer) {
    clearInterval(smoothDragTimer);
    smoothDragTimer = null;
  }
}

ipcMain.on('window:start-inertial-drag', (_event, clientX: number, clientY: number) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const [winX, winY] = mainWindow.getPosition();
  currentX = winX;
  currentY = winY;
  dragOffsetX = clientX;
  dragOffsetY = clientY;
  isSmoothDragging = true;
  startSmoothDragLoop();
});

ipcMain.on('window:stop-inertial-drag', () => {
  isSmoothDragging = false;
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

function animateToHeight(newHeight: number): Promise<void> {
  return new Promise((resolve) => {
    targetHeight = Math.round(newHeight);
    if (!mainWindow || mainWindow.isDestroyed()) {
      resolve();
      return;
    }

    const [w, h] = mainWindow.getSize();
    currentHeight = h;

    if (Math.abs(targetHeight - currentHeight) <= 1) {
      mainWindow.setSize(w, targetHeight);
      currentHeight = targetHeight;
      if (heightAnimTimer) {
        clearInterval(heightAnimTimer);
        heightAnimTimer = null;
      }
      if (animResolve) {
        const prev = animResolve;
        animResolve = null;
        prev();
      }
      resolve();
      return;
    }

    if (animResolve) {
      const prev = animResolve;
      animResolve = null;
      prev();
    }
    animResolve = resolve;

    if (heightAnimTimer) {
      clearInterval(heightAnimTimer);
      heightAnimTimer = null;
    }

    heightAnimTimer = setInterval(() => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        if (heightAnimTimer) {
          clearInterval(heightAnimTimer);
          heightAnimTimer = null;
        }
        if (animResolve) {
          const prev = animResolve;
          animResolve = null;
          prev();
        }
        return;
      }

      const [winW, winH] = mainWindow.getSize();
      currentHeight = winH;
      const dh = targetHeight - currentHeight;

      if (Math.abs(dh) > 1) {
        const step = dh * 0.24;
        const delta = Math.abs(step) < 1 ? Math.sign(dh) : step;
        currentHeight += delta;
        mainWindow.setSize(winW, Math.round(currentHeight));
      } else {
        mainWindow.setSize(winW, targetHeight);
        currentHeight = targetHeight;
        if (heightAnimTimer) {
          clearInterval(heightAnimTimer);
          heightAnimTimer = null;
        }
        if (animResolve) {
          const prev = animResolve;
          animResolve = null;
          prev();
        }
      }
    }, 12);
  });
}

ipcMain.handle('window:animate-height', async (_event, height: number) => {
  await animateToHeight(height);
  return true;
});

ipcMain.handle('window:set-size', (_event, width: number, height: number) => {
  if (heightAnimTimer) {
    clearInterval(heightAnimTimer);
    heightAnimTimer = null;
  }
  if (animResolve) {
    const prev = animResolve;
    animResolve = null;
    prev();
  }
  targetHeight = Math.round(height);
  currentHeight = targetHeight;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setSize(width, targetHeight);
  }
  return true;
});

ipcMain.handle('window:toggle-always-on-top', () => {
  if (!mainWindow) return isAlwaysOnTop;
  isAlwaysOnTop = !isAlwaysOnTop;
  mainWindow.setAlwaysOnTop(isAlwaysOnTop, 'screen-saver', 1);
  if (isAlwaysOnTop) {
    mainWindow.moveTop();
  }
  saveSettings({ alwaysOnTop: isAlwaysOnTop });
  mainWindow.webContents.send('window:always-on-top-changed', isAlwaysOnTop);
  return isAlwaysOnTop;
});

ipcMain.handle('window:get-always-on-top', () => {
  return isAlwaysOnTop;
});

ipcMain.handle('media:get-current', () => {
  return gsmtcBridge?.getCurrentTrack() || null;
});

ipcMain.handle('media:set-shuffle', (_event, active: boolean) => {
  if (gsmtcBridge) {
    gsmtcBridge.setShuffle(active);
    return true;
  }
  return false;
});

ipcMain.handle('media:set-repeat', (_event, mode: 'off' | 'track' | 'context') => {
  if (gsmtcBridge) {
    gsmtcBridge.setRepeat(mode);
    return true;
  }
  return false;
});

ipcMain.handle('media:toggle-play', () => {
  if (gsmtcBridge) {
    gsmtcBridge.sendCommand('toggle');
    return true;
  }
  return false;
});

ipcMain.handle('media:next', () => {
  if (gsmtcBridge) {
    gsmtcBridge.sendCommand('next');
    return true;
  }
  return false;
});

ipcMain.handle('media:previous', () => {
  if (gsmtcBridge) {
    gsmtcBridge.sendCommand('prev');
    return true;
  }
  return false;
});

ipcMain.handle('media:seek', (_event, seconds: number) => {
  if (gsmtcBridge) {
    gsmtcBridge.sendCommand('seek', { position: seconds });
    return true;
  }
  return false;
});

// Spotify PKCE Auth Server
let authServer: http.Server | null = null;

ipcMain.handle('spotify:start-auth', async (_event, clientId: string) => {
  return new Promise((resolve) => {
    try {
      if (authServer) {
        authServer.close();
        authServer = null;
      }

      // Generate random verifier
      const crypto = require('crypto');
      const verifier = crypto.randomBytes(32).toString('base64url');
      const challenge = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');

      const redirectUri = 'http://localhost:8888/callback';
      const scope = encodeURIComponent(
        'user-read-playback-state user-modify-playback-state user-read-currently-playing'
      );

      const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&code_challenge_method=S256&code_challenge=${challenge}&scope=${scope}`;

      authServer = http.createServer((req, res) => {
        const reqUrl = new URL(req.url || '', `http://${req.headers.host}`);
        if (reqUrl.pathname === '/callback') {
          const code = reqUrl.searchParams.get('code');
          const error = reqUrl.searchParams.get('error');

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head><title>Spoti-Fly Authorized</title></head>
              <body style="font-family: sans-serif; background: #121212; color: #fff; text-align: center; padding: 50px;">
                <h1 style="color: #1DB954;">Spoti-Fly Connected!</h1>
                <p>You may close this tab and return to Spoti-Fly.</p>
                <script>setTimeout(() => window.close(), 1500);</script>
              </body>
            </html>
          `);

          if (authServer) {
            authServer.close();
            authServer = null;
          }

          if (code) {
            resolve({ code, redirectUri, verifier });
          } else {
            resolve({ error: error || 'Authorization cancelled' });
          }
        }
      });

      authServer.listen(8888, () => {
        shell.openExternal(authUrl);
      });

      // Auto close after 2 minutes
      setTimeout(() => {
        if (authServer) {
          authServer.close();
          authServer = null;
          resolve({ error: 'Authorization timed out' });
        }
      }, 120000);
    } catch (e: any) {
      resolve({ error: e?.message || 'Failed to start auth' });
    }
  });
});

ipcMain.handle('spotify:get-tokens', () => {
  return loadTokens();
});

ipcMain.handle('spotify:save-tokens', (_event, tokens: SpotifyTokens) => {
  saveTokens(tokens);
});

ipcMain.handle('spotify:clear-tokens', () => {
  clearTokens();
});

ipcMain.handle('settings:get', () => {
  return loadSettings();
});

ipcMain.handle('settings:save', (_event, settings: Partial<SpotiflySettings>) => {
  saveSettings(settings);
});

ipcMain.handle('shortcut:create-desktop', () => {
  try {
    const desktopPath = app.getPath('desktop');
    const shortcutPath = path.join(desktopPath, 'Spoti-Fly.lnk');
    const success = shell.writeShortcutLink(shortcutPath, 'create', {
      target: process.execPath,
      cwd: path.dirname(process.execPath),
      description: 'Spoti-Fly - Spotify Mini-Player',
      appUserModelId: 'com.satsugingg.spotifly',
    });
    return success;
  } catch (err) {
    logDebug(`[SHORTCUT] Create failed: ${err}`);
    return false;
  }
});

ipcMain.handle('shortcut:check-desktop', () => {
  try {
    const desktopPath = app.getPath('desktop');
    const shortcutPath = path.join(desktopPath, 'Spoti-Fly.lnk');
    return fs.existsSync(shortcutPath);
  } catch {
    return false;
  }
});

ipcMain.handle('shortcut:remove-desktop', () => {
  try {
    const desktopPath = app.getPath('desktop');
    const shortcutPath = path.join(desktopPath, 'Spoti-Fly.lnk');
    if (fs.existsSync(shortcutPath)) {
      fs.unlinkSync(shortcutPath);
    }
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('app:get-start-on-boot', () => {
  try {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  } catch {
    return false;
  }
});

ipcMain.handle('app:set-start-on-boot', (_event, enabled: boolean) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
      args: ['--autostart'],
    });
    return enabled;
  } catch (err) {
    logDebug(`[AUTOSTART] setLoginItemSettings error: ${err}`);
    return false;
  }
});

function startLocalHttpBridge() {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.url === '/show' || req.url === '/open') {
      logDebug(`[HTTP] Received /show or /open request`);
      showAndFocusWindow();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, status: 'shown' }));
      return;
    }
    if (req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, running: true }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.on('error', (err) => {
    logDebug(`[HTTP] Server error: ${err.message}`);
  });

  try {
    server.listen(45454, '127.0.0.1', () => {
      logDebug(`[HTTP] Server listening on 127.0.0.1:45454`);
    });
  } catch (err: any) {
    logDebug(`[HTTP] Server listen failed: ${err?.message}`);
  }
}

app.whenReady().then(() => {
  logDebug(`[APP] app.whenReady fired`);
  createWindow();
  startLocalHttpBridge();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('second-instance', (_event, commandLine) => {
  logDebug(`[APP] second-instance fired with args: ${JSON.stringify(commandLine)}`);
  showAndFocusWindow();
});

app.on('will-quit', () => {
  logDebug(`[APP] app will-quit fired`);
  if (gsmtcBridge) {
    gsmtcBridge.destroy();
    gsmtcBridge = null;
  }
  if (authServer) {
    authServer.close();
    authServer = null;
  }
});

// Intercept window-all-closed so the HTTP daemon stays listening on port 45454
app.on('window-all-closed', () => {
  logDebug(`[APP] window-all-closed fired - keeping HTTP daemon alive`);
});

app.on('quit', (_event, exitCode) => {
  logDebug(`[APP] app quit with exitCode=${exitCode}`);
});
