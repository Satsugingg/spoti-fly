import { contextBridge, ipcRenderer } from 'electron';
import { SpotiflyAPI, SpotiflySettings, SpotifyTokens, TrackState } from '../types/player';

const spotiflyAPI: SpotiflyAPI = {
  closeWindow: () => ipcRenderer.invoke('window:close'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
  getAlwaysOnTop: () => ipcRenderer.invoke('window:get-always-on-top'),
  setWindowSize: (width: number, height: number) => ipcRenderer.invoke('window:set-size', width, height),
  animateWindowHeight: (height: number) => ipcRenderer.invoke('window:animate-height', height),
  setPlayerScale: (scalePercent: number) => ipcRenderer.invoke('window:set-scale', scalePercent),
  startInertialDrag: (clientX: number, clientY: number) => ipcRenderer.send('window:start-inertial-drag', clientX, clientY),
  stopInertialDrag: () => ipcRenderer.send('window:stop-inertial-drag'),

  getCurrentTrack: () => ipcRenderer.invoke('media:get-current'),
  togglePlayPause: () => ipcRenderer.invoke('media:toggle-play'),
  skipNext: () => ipcRenderer.invoke('media:next'),
  skipPrevious: () => ipcRenderer.invoke('media:previous'),
  seek: (seconds: number) => ipcRenderer.invoke('media:seek', seconds),
  setShuffle: (active: boolean) => ipcRenderer.invoke('media:set-shuffle', active),
  setRepeat: (mode: 'off' | 'track' | 'context') => ipcRenderer.invoke('media:set-repeat', mode),

  onMediaUpdate: (callback: (track: TrackState) => void) => {
    const handler = (_event: any, track: TrackState) => callback(track);
    ipcRenderer.on('media:update', handler);
    return () => {
      ipcRenderer.removeListener('media:update', handler);
    };
  },

  onAlwaysOnTopChange: (callback: (isPinned: boolean) => void) => {
    const handler = (_event: any, isPinned: boolean) => callback(isPinned);
    ipcRenderer.on('window:always-on-top-changed', handler);
    return () => {
      ipcRenderer.removeListener('window:always-on-top-changed', handler);
    };
  },

  onVolumeChanged: (callback: (data: { percent: number; target: 'spotify' | 'system' }) => void) => {
    const handler = (_event: any, data: { percent: number; target: 'spotify' | 'system' }) => callback(data);
    ipcRenderer.on('volume:changed', handler);
    return () => {
      ipcRenderer.removeListener('volume:changed', handler);
    };
  },

  onHotkeyTrigger: (callback: (action: string) => void) => {
    const handler = (_event: any, action: string) => callback(action);
    ipcRenderer.on('hotkey:trigger', handler);
    return () => {
      ipcRenderer.removeListener('hotkey:trigger', handler);
    };
  },

  adjustVolume: (deltaPercent: number, target: 'spotify' | 'system' = 'spotify') =>
    ipcRenderer.invoke('volume:adjust', deltaPercent, target),
  getVolume: (target: 'spotify' | 'system' = 'spotify') =>
    ipcRenderer.invoke('volume:get', target),
  setVolume: (percent: number, target: 'spotify' | 'system' = 'spotify') =>
    ipcRenderer.invoke('volume:set', percent, target),

  getQueueNext: () => ipcRenderer.invoke('spotify:get-queue-next'),

  startSpotifyAuth: (clientId: string, redirectUri?: string) => ipcRenderer.invoke('spotify:start-auth', clientId, redirectUri),
  getSpotifyTokens: () => ipcRenderer.invoke('spotify:get-tokens'),
  saveSpotifyTokens: (tokens: SpotifyTokens) => ipcRenderer.invoke('spotify:save-tokens', tokens),
  clearSpotifyTokens: () => ipcRenderer.invoke('spotify:clear-tokens'),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<SpotiflySettings>) => ipcRenderer.invoke('settings:save', settings),

  createDesktopShortcut: () => ipcRenderer.invoke('shortcut:create-desktop'),
  hasDesktopShortcut: () => ipcRenderer.invoke('shortcut:check-desktop'),
  removeDesktopShortcut: () => ipcRenderer.invoke('shortcut:remove-desktop'),
  getStartOnBoot: () => ipcRenderer.invoke('app:get-start-on-boot'),
  setStartOnBoot: (enabled: boolean) => ipcRenderer.invoke('app:set-start-on-boot', enabled),
  openExternalUrl: (url: string) => ipcRenderer.invoke('app:open-external', url),
};

contextBridge.exposeInMainWorld('spotifly', spotiflyAPI);
