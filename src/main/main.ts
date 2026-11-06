import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, screen, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { execFile } from 'child_process';
import { GsmtcBridge } from './gsmtc-bridge';
import { SpotiflySettings, SpotifyTokens, TrackState, HotkeyConfig } from '../types/player';

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
    const initialSettings = loadSettings();
    applyStartOnBoot(initialSettings.startOnBoot !== false, Boolean(initialSettings.startMinimized));

    const desktopPath = app.getPath('desktop');
    const shortcutPath = path.join(desktopPath, 'Spoti-Fly.lnk');
    if (!fs.existsSync(shortcutPath)) {
      shell.writeShortcutLink(shortcutPath, 'create', {
        target: process.execPath,
        cwd: path.dirname(process.execPath),
        description: 'Spoti-Fly - Spotify Mini-Player',
        appUserModelId: 'com.satsugingg.spotifly',
      });
      logDebug(`[SHORTCUT] Auto-created desktop shortcut: ${shortcutPath}`);
    }
  }
} catch (err: any) {
  logDebug(`[AUTOSTART] Registration error: ${err?.message}`);
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let gsmtcBridge: GsmtcBridge | null = null;
let isAlwaysOnTop = true;
let isQuitting = false;
let targetHeight = 130;
let currentHeight = 130;
let bottomExpansionShiftY = 0;
let heightAnimTimer: NodeJS.Timeout | null = null;
let animResolve: (() => void) | null = null;

const configPath = path.join(app.getPath('userData'), 'spotifly-settings.json');

const DEFAULT_HOTKEYS: Required<HotkeyConfig> = {
  playPause: 'CommandOrControl+Alt+Space',
  nextTrack: 'CommandOrControl+Alt+Right',
  prevTrack: 'CommandOrControl+Alt+Left',
  volumeUp: 'CommandOrControl+Alt+Up',
  volumeDown: 'CommandOrControl+Alt+Down',
  toggleWindow: 'CommandOrControl+Alt+H',
};

const defaultSettings: SpotiflySettings = {
  mode: 'gsmtc',
  alwaysOnTop: true,
  showMarquee: true,
  minimalMode: false,
  opacity: 100,
  startOnBoot: true,
  startMinimized: false,
  volumeTarget: 'spotify',
  globalHotkeysEnabled: true,
  hotkeys: { ...DEFAULT_HOTKEYS },
  enableEdgeSnapping: true,
  showUpNextPreview: true,
  showLyrics: false,
  showKaraokeButton: true,
};

function applyStartOnBoot(enabled: boolean, startMinimized: boolean = false) {
  try {
    if (app.isPackaged) {
      const args = enabled
        ? (startMinimized ? ['--autostart', '--minimized'] : ['--autostart'])
        : [];
      app.setLoginItemSettings({
        openAtLogin: enabled,
        path: process.execPath,
        args: args,
      });
      logDebug(`[AUTOSTART] Applied openAtLogin: ${enabled}, args: ${JSON.stringify(args)}`);
    }
  } catch (err: any) {
    logDebug(`[AUTOSTART] Login item update error: ${err?.message}`);
  }
}

function loadSettings(): SpotiflySettings {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return {
        ...defaultSettings,
        ...data,
        hotkeys: {
          ...defaultSettings.hotkeys,
          ...(data.hotkeys || {}),
        },
      };
    }
  } catch {}
  return defaultSettings;
}

function saveSettings(settings: Partial<SpotiflySettings>) {
  try {
    const current = loadSettings();
    const updated: SpotiflySettings = {
      ...current,
      ...settings,
      hotkeys: settings.hotkeys
        ? { ...(current.hotkeys || defaultSettings.hotkeys), ...settings.hotkeys }
        : current.hotkeys,
    };
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf8');

    if (typeof settings.startOnBoot === 'boolean' || typeof settings.startMinimized === 'boolean') {
      applyStartOnBoot(updated.startOnBoot !== false, Boolean(updated.startMinimized));
    }
    if (typeof settings.globalHotkeysEnabled === 'boolean' || settings.hotkeys) {
      registerGlobalHotkeys();
    }
  } catch (err) {
    logDebug(`[CONFIG] Failed to save settings: ${err}`);
  }
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

let savePosTimer: NodeJS.Timeout | null = null;

function saveWindowPosition(x: number, y: number) {
  if (savePosTimer) clearTimeout(savePosTimer);
  savePosTimer = setTimeout(() => {
    saveSettings({ windowX: Math.round(x), windowY: Math.round(y) });
    logDebug(`[POSITION] Saved window position: ${Math.round(x)}, ${Math.round(y)}`);
  }, 250);
}

function flushWindowPosition() {
  if (savePosTimer) {
    clearTimeout(savePosTimer);
    savePosTimer = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    const [x, y] = mainWindow.getPosition();
    saveSettings({ windowX: Math.round(x), windowY: Math.round(y) });
    logDebug(`[POSITION] Flushed window position: ${Math.round(x)}, ${Math.round(y)}`);
  }
}

function getSavedOrInitialPosition(
  savedX?: number,
  savedY?: number,
  width: number = 320,
  height: number = 130
): { x: number; y: number } {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
  const defaultX = Math.max(20, screenW - 360);
  const defaultY = Math.max(20, screenH - height - 80);

  if (typeof savedX !== 'number' || typeof savedY !== 'number') {
    return { x: defaultX, y: defaultY };
  }

  // Ensure position is visible within the work area of at least one connected display
  const allDisplays = screen.getAllDisplays();
  const isVisible = allDisplays.some((display) => {
    const { x, y, width: dW, height: dH } = display.workArea;
    return (
      savedX + width > x + 40 &&
      savedX < x + dW - 40 &&
      savedY + height > y + 40 &&
      savedY < y + dH - 40
    );
  });

  if (isVisible) {
    return { x: Math.round(savedX), y: Math.round(savedY) };
  }

  return { x: defaultX, y: defaultY };
}

function createWindow() {
  const settings = loadSettings();
  isAlwaysOnTop = true; // Always default to true so it stays visible on top of Spotify
  const appIcon = createAppIcon();
  const initialHeight = settings.minimalMode ? 72 : 130;
  targetHeight = initialHeight;
  currentHeight = initialHeight;

  const { x: initialX, y: initialY } = getSavedOrInitialPosition(
    settings.windowX,
    settings.windowY,
    320,
    initialHeight
  );

  currentX = initialX;
  currentY = initialY;
  targetX = initialX;
  targetY = initialY;

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
    const isAutostart = process.argv.includes('--autostart');
    const isExplicitMinimized = process.argv.includes('--minimized') || process.argv.includes('--hidden');
    const s = loadSettings();
    const shouldStartMinimized = isExplicitMinimized || (isAutostart && s.startMinimized === true);

    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!isAutostart || !shouldStartMinimized) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.moveTop();
      } else {
        logDebug('[APP] Started in background/minimized mode on Windows boot. Window remains hidden until summoned.');
      }
    }
  });

  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription) => {
    logDebug(`[RENDERER] did-fail-load: ${errorCode} ${errorDescription}`);
  });

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    logDebug(`[RENDERER] render-process-gone: ${JSON.stringify(details)}`);
  });

  // Save position when moved
  mainWindow.on('moved', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const [x, y] = mainWindow.getPosition();
      saveWindowPosition(x, y);
    }
  });

  // Intercept close event: hide window to tray instead of quitting
  mainWindow.on('close', (event) => {
    flushWindowPosition();
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
// Physics-Based Smooth Drag Engine with Magnetic Screen Edge Snapping & Tactile Breakaway Weight
let isSmoothDragging = false;
let smoothDragTimer: NodeJS.Timeout | null = null;
let currentX = 0;
let currentY = 0;
let targetX = 0;
let targetY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Magnetic snapping physics state
let isSnappedLeft = false;
let isSnappedRight = false;
let isSnappedTop = false;
let isSnappedBottom = false;

let bounceImpulseX = 0;
let bounceImpulseY = 0;

const SNAP_MARGIN = 16;          // Inset padding from screen edge for floating aesthetic
const SNAP_THRESHOLD = 26;       // Threshold in px to trigger magnetic snap
const BREAKAWAY_THRESHOLD = 38;  // Distance cursor must move to break magnetic pull
const BOUNCE_AMOUNT = 7;         // Visual bounce amplitude on edge contact
const LERP_FACTOR = 0.32;        // Fluid dampening factor

function startSmoothDragLoop() {
  if (smoothDragTimer) return;
  smoothDragTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      stopSmoothDragLoop();
      return;
    }

    if (isSmoothDragging) {
      const cursor = screen.getCursorScreenPoint();
      const rawX = cursor.x - dragOffsetX;
      const rawY = cursor.y - dragOffsetY;

      const currentSettings = loadSettings();
      if (currentSettings.enableEdgeSnapping !== false) {
        const display = screen.getDisplayNearestPoint(cursor);
        const { x: workX, y: workY, width: workW, height: workH } = display.workArea;
        const [winW, winH] = mainWindow.getSize();
        const minX = workX + SNAP_MARGIN;
        const maxX = workX + workW - winW - SNAP_MARGIN;
        const minY = workY + SNAP_MARGIN;
        const maxY = workY + workH - winH - SNAP_MARGIN;

        // --- HORIZONTAL MAGNETIC SNAPPING ---
        if (!isSnappedLeft && !isSnappedRight) {
          if (rawX >= workX - 20 && rawX <= minX + SNAP_THRESHOLD) {
            isSnappedLeft = true;
            bounceImpulseX = BOUNCE_AMOUNT;
            targetX = minX;
          } else if (rawX >= maxX - SNAP_THRESHOLD && rawX <= workX + workW - winW + 20) {
            isSnappedRight = true;
            bounceImpulseX = -BOUNCE_AMOUNT;
            targetX = maxX;
          } else {
            targetX = rawX;
          }
        } else if (isSnappedLeft) {
          const pullDelta = rawX - minX;
          if (pullDelta < 0) {
            targetX = minX;
          } else if (pullDelta < BREAKAWAY_THRESHOLD) {
            targetX = minX + pullDelta * 0.12;
          } else {
            isSnappedLeft = false;
            targetX = rawX;
          }
        } else if (isSnappedRight) {
          const pullDelta = maxX - rawX;
          if (pullDelta < 0) {
            targetX = maxX;
          } else if (pullDelta < BREAKAWAY_THRESHOLD) {
            targetX = maxX - pullDelta * 0.12;
          } else {
            isSnappedRight = false;
            targetX = rawX;
          }
        }

        // --- VERTICAL MAGNETIC SNAPPING ---
        if (!isSnappedTop && !isSnappedBottom) {
          if (rawY >= workY - 20 && rawY <= minY + SNAP_THRESHOLD) {
            isSnappedTop = true;
            bounceImpulseY = BOUNCE_AMOUNT;
            targetY = minY;
          } else if (rawY >= maxY - SNAP_THRESHOLD && rawY <= workY + workH - winH + 20) {
            isSnappedBottom = true;
            bounceImpulseY = -BOUNCE_AMOUNT;
            targetY = maxY;
          } else {
            targetY = rawY;
          }
        } else if (isSnappedTop) {
          const pullDelta = rawY - minY;
          if (pullDelta < 0) {
            targetY = minY;
          } else if (pullDelta < BREAKAWAY_THRESHOLD) {
            targetY = minY + pullDelta * 0.12;
          } else {
            isSnappedTop = false;
            targetY = rawY;
          }
        } else if (isSnappedBottom) {
          const pullDelta = maxY - rawY;
          if (pullDelta < 0) {
            targetY = maxY;
          } else if (pullDelta < BREAKAWAY_THRESHOLD) {
            targetY = maxY - pullDelta * 0.12;
          } else {
            isSnappedBottom = false;
            targetY = rawY;
          }
        }
      } else {
        targetX = rawX;
        targetY = rawY;
      }
    }

    // Spring bounce dampening
    if (Math.abs(bounceImpulseX) > 0.15) {
      bounceImpulseX *= 0.72;
    } else {
      bounceImpulseX = 0;
    }
    if (Math.abs(bounceImpulseY) > 0.15) {
      bounceImpulseY *= 0.72;
    } else {
      bounceImpulseY = 0;
    }

    const renderTargetX = targetX + bounceImpulseX;
    const renderTargetY = targetY + bounceImpulseY;

    const dx = renderTargetX - currentX;
    const dy = renderTargetY - currentY;

    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      currentX += dx * LERP_FACTOR;
      currentY += dy * LERP_FACTOR;
      mainWindow.setPosition(Math.round(currentX), Math.round(currentY));
    } else {
      currentX = renderTargetX;
      currentY = renderTargetY;
      mainWindow.setPosition(Math.round(currentX), Math.round(currentY));
      if (!isSmoothDragging && bounceImpulseX === 0 && bounceImpulseY === 0) {
        stopSmoothDragLoop();
      }
    }
  }, 10);
}

function stopSmoothDragLoop() {
  isSnappedLeft = false;
  isSnappedRight = false;
  isSnappedTop = false;
  isSnappedBottom = false;
  bounceImpulseX = 0;
  bounceImpulseY = 0;
  if (smoothDragTimer) {
    clearInterval(smoothDragTimer);
    smoothDragTimer = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    const [x, y] = mainWindow.getPosition();
    saveWindowPosition(x, y);
  }
}

ipcMain.on('window:start-inertial-drag', (_event, clientX: number, clientY: number) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (heightAnimTimer) {
    clearInterval(heightAnimTimer);
    heightAnimTimer = null;
  }
  if (animResolve) {
    const prev = animResolve;
    animResolve = null;
    prev();
  }
  bottomExpansionShiftY = 0;
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

    const bounds = mainWindow.getBounds();
    const startH = bounds.height;
    const startY = bounds.y;
    const winX = bounds.x;
    const winW = bounds.width;

    let targetY = startY;

    try {
      const display = screen.getDisplayMatching(bounds);
      const workArea = display.workArea;
      const maxBottom = workArea.y + workArea.height - SNAP_MARGIN;
      const minTop = workArea.y + SNAP_MARGIN;

      if (targetHeight > startH) {
        // Expanding (e.g. Opening lyrics or settings)
        if (startY + targetHeight > maxBottom) {
          // Window would expand off-screen past the bottom / taskbar
          const overflow = (startY + targetHeight) - maxBottom;
          targetY = Math.max(minTop, startY - overflow);
          bottomExpansionShiftY = startY - targetY;
        } else {
          bottomExpansionShiftY = 0;
        }
      } else if (targetHeight < startH) {
        // Collapsing / Shrinking
        if (bottomExpansionShiftY > 0) {
          targetY = Math.min(maxBottom - targetHeight, startY + bottomExpansionShiftY);
          bottomExpansionShiftY = 0;
        } else if (startY + targetHeight > maxBottom) {
          targetY = Math.max(minTop, maxBottom - targetHeight);
        }
      }
    } catch (e) {
      logDebug(`[ANIMATE] Display match error: ${e}`);
    }

    if (Math.abs(targetHeight - startH) <= 1 && Math.abs(targetY - startY) <= 1) {
      mainWindow.setBounds({ x: winX, y: Math.round(targetY), width: winW, height: targetHeight });
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

    let animH = startH;
    let animY = startY;

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

      const dh = targetHeight - animH;
      const dy = targetY - animY;

      const isDoneH = Math.abs(dh) <= 1;
      const isDoneY = Math.abs(dy) <= 1;

      if (!isDoneH || !isDoneY) {
        if (!isDoneH) {
          const stepH = dh * 0.28;
          animH += Math.abs(stepH) < 1 ? Math.sign(dh) : stepH;
        } else {
          animH = targetHeight;
        }

        if (!isDoneY) {
          const stepY = dy * 0.28;
          animY += Math.abs(stepY) < 1 ? Math.sign(dy) : stepY;
        } else {
          animY = targetY;
        }

        currentHeight = animH;
        mainWindow.setBounds({
          x: winX,
          y: Math.round(animY),
          width: winW,
          height: Math.round(animH),
        });
      } else {
        currentHeight = targetHeight;
        mainWindow.setBounds({
          x: winX,
          y: Math.round(targetY),
          width: winW,
          height: targetHeight,
        });
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
    return (
      fs.existsSync(path.join(desktopPath, 'Spoti-Fly.lnk')) ||
      fs.existsSync(path.join(desktopPath, 'Spotifly.lnk'))
    );
  } catch {
    return false;
  }
});

ipcMain.handle('shortcut:remove-desktop', () => {
  try {
    const desktopPath = app.getPath('desktop');
    const p1 = path.join(desktopPath, 'Spoti-Fly.lnk');
    const p2 = path.join(desktopPath, 'Spotifly.lnk');
    if (fs.existsSync(p1)) fs.unlinkSync(p1);
    if (fs.existsSync(p2)) fs.unlinkSync(p2);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('app:get-start-on-boot', () => {
  const settings = loadSettings();
  if (typeof settings.startOnBoot === 'boolean') {
    return settings.startOnBoot;
  }
  try {
    if (app.isPackaged) {
      const login = app.getLoginItemSettings({
        path: process.execPath,
        args: ['--autostart'],
      });
      return login.openAtLogin;
    }
    return true;
  } catch {
    return true;
  }
});

ipcMain.handle('app:set-start-on-boot', (_event, enabled: boolean, startMinimized?: boolean) => {
  const payload: Partial<SpotiflySettings> = { startOnBoot: enabled };
  if (typeof startMinimized === 'boolean') {
    payload.startMinimized = startMinimized;
  }
  saveSettings(payload);
  return enabled;
});

// Volume & Audio Tool Integration (Native Windows Master & App Volume via spotifly_vol.exe)
function getVolToolPath(): string {
  const p1 = path.resolve(__dirname, 'spotifly_vol.exe');
  const unpacked = p1.replace('app.asar', 'app.asar.unpacked');
  if (fs.existsSync(unpacked)) return unpacked;
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), 'dist/main/spotifly_vol.exe');
  if (fs.existsSync(p2)) return p2;
  const p3 = path.resolve(process.cwd(), 'src/main/spotifly_vol.exe');
  if (fs.existsSync(p3)) return p3;
  return p1;
}

let cachedMasterVolume = 100;

function execVolTool(cmd: string, val?: number | string): Promise<number> {
  return new Promise((resolve) => {
    const exePath = getVolToolPath();
    if (!fs.existsSync(exePath)) {
      resolve(cachedMasterVolume);
      return;
    }
    const args = [cmd];
    if (val !== undefined) args.push(String(val));
    execFile(exePath, args, { windowsHide: true }, (err, stdout) => {
      if (!err && stdout) {
        const parsed = parseInt(stdout.trim(), 10);
        if (!isNaN(parsed)) {
          cachedMasterVolume = parsed;
          resolve(parsed);
          return;
        }
      }
      resolve(cachedMasterVolume);
    });
  });
}

// Global Hotkeys Engine
function registerGlobalHotkeys() {
  unregisterGlobalHotkeys();
  const settings = loadSettings();
  if (settings.globalHotkeysEnabled === false) return;

  const hotkeysConfig = settings.hotkeys || {};
  const playPauseKey = hotkeysConfig.playPause !== undefined ? hotkeysConfig.playPause : DEFAULT_HOTKEYS.playPause;
  const nextTrackKey = hotkeysConfig.nextTrack !== undefined ? hotkeysConfig.nextTrack : DEFAULT_HOTKEYS.nextTrack;
  const prevTrackKey = hotkeysConfig.prevTrack !== undefined ? hotkeysConfig.prevTrack : DEFAULT_HOTKEYS.prevTrack;
  const volumeUpKey = hotkeysConfig.volumeUp !== undefined ? hotkeysConfig.volumeUp : DEFAULT_HOTKEYS.volumeUp;
  const volumeDownKey = hotkeysConfig.volumeDown !== undefined ? hotkeysConfig.volumeDown : DEFAULT_HOTKEYS.volumeDown;
  const toggleWindowKey = hotkeysConfig.toggleWindow !== undefined ? hotkeysConfig.toggleWindow : DEFAULT_HOTKEYS.toggleWindow;

  const hotkeys: { key?: string; name: string; action: () => void }[] = [
    {
      key: playPauseKey,
      name: 'Play/Pause',
      action: () => {
        logDebug('[HOTKEY] Play/Pause triggered');
        if (gsmtcBridge) gsmtcBridge.sendCommand('toggle');
        mainWindow?.webContents.send('hotkey:trigger', 'playpause');
      },
    },
    {
      key: nextTrackKey,
      name: 'Next Track',
      action: () => {
        logDebug('[HOTKEY] Next track triggered');
        if (gsmtcBridge) gsmtcBridge.sendCommand('next');
        mainWindow?.webContents.send('hotkey:trigger', 'next');
      },
    },
    {
      key: prevTrackKey,
      name: 'Previous Track',
      action: () => {
        logDebug('[HOTKEY] Prev track triggered');
        if (gsmtcBridge) gsmtcBridge.sendCommand('prev');
        mainWindow?.webContents.send('hotkey:trigger', 'prev');
      },
    },
    {
      key: volumeUpKey,
      name: 'Volume Up',
      action: () => {
        logDebug('[HOTKEY] Volume Up triggered');
        const s = loadSettings();
        if (s.volumeTarget === 'system') {
          execVolTool('change-master', 5).then((vol) => {
            mainWindow?.webContents.send('volume:changed', { percent: vol, target: 'system' });
          });
        } else {
          mainWindow?.webContents.send('hotkey:trigger', 'volume_up');
        }
      },
    },
    {
      key: volumeDownKey,
      name: 'Volume Down',
      action: () => {
        logDebug('[HOTKEY] Volume Down triggered');
        const s = loadSettings();
        if (s.volumeTarget === 'system') {
          execVolTool('change-master', -5).then((vol) => {
            mainWindow?.webContents.send('volume:changed', { percent: vol, target: 'system' });
          });
        } else {
          mainWindow?.webContents.send('hotkey:trigger', 'volume_down');
        }
      },
    },
    {
      key: toggleWindowKey,
      name: 'Toggle Visibility',
      action: () => {
        logDebug('[HOTKEY] Toggle visibility triggered');
        if (!mainWindow || mainWindow.isDestroyed()) {
          createWindow();
          return;
        }
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          showAndFocusWindow();
        }
      },
    },
  ];

  for (const h of hotkeys) {
    if (!h.key || h.key.trim() === '') continue;
    try {
      const ok = globalShortcut.register(h.key, h.action);
      if (!ok) {
        logDebug(`[HOTKEY] Failed to register: ${h.key} (${h.name})`);
      } else {
        logDebug(`[HOTKEY] Registered successfully: ${h.key} (${h.name})`);
      }
    } catch (err: any) {
      logDebug(`[HOTKEY] Registration error for ${h.key}: ${err?.message}`);
    }
  }
}

function unregisterGlobalHotkeys() {
  try {
    globalShortcut.unregisterAll();
    logDebug('[HOTKEY] Unregistered all global shortcuts');
  } catch {}
}

ipcMain.handle('volume:adjust', async (_event, deltaPercent: number, target: 'spotify' | 'system' = 'spotify') => {
  if (target === 'system') {
    const newVol = await execVolTool('change-master', deltaPercent);
    mainWindow?.webContents.send('volume:changed', { percent: newVol, target: 'system' });
    return newVol;
  }
  const newVol = await execVolTool('change-master', deltaPercent);
  mainWindow?.webContents.send('volume:changed', { percent: newVol, target: 'spotify' });
  return newVol;
});

ipcMain.handle('volume:get', async (_event, _target: 'spotify' | 'system' = 'spotify') => {
  const vol = await execVolTool('get-master');
  return vol;
});

ipcMain.handle('volume:set', async (_event, percent: number, target: 'spotify' | 'system' = 'spotify') => {
  const vol = await execVolTool('set-master', percent);
  mainWindow?.webContents.send('volume:changed', { percent: vol, target });
  return vol;
});

ipcMain.handle('spotify:get-queue-next', async () => {
  const tokens = loadTokens();
  if (!tokens || !tokens.accessToken) return null;
  try {
    const https = require('https');
    return new Promise((resolve) => {
      const req = https.get(
        'https://api.spotify.com/v1/me/player/queue',
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        },
        (res: any) => {
          let data = '';
          res.on('data', (chunk: any) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(data);
                if (parsed.queue && parsed.queue.length > 0) {
                  const first = parsed.queue[0];
                  const artworkUrl = first.album?.images?.[0]?.url || null;
                  const artist = first.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist';
                  resolve({
                    title: first.name || 'Unknown Track',
                    artist,
                    artworkUrl,
                  });
                  return;
                }
              } catch {}
            }
            resolve(null);
          });
        }
      );
      req.on('error', () => resolve(null));
      req.setTimeout(2500, () => {
        req.destroy();
        resolve(null);
      });
    });
  } catch {
    return null;
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
  registerGlobalHotkeys();
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

app.on('before-quit', () => {
  isQuitting = true;
  flushWindowPosition();
});

app.on('will-quit', () => {
  logDebug(`[APP] app will-quit fired`);
  flushWindowPosition();
  unregisterGlobalHotkeys();
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
