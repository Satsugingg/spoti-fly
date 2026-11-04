import { contextBridge, ipcRenderer } from 'electron';
import { SpotiflyAPI, SpotiflySettings, SpotifyTokens, TrackState } from '../types/player';

const spotiflyAPI: SpotiflyAPI = {
  closeWindow: () => ipcRenderer.invoke('window:close'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
  getAlwaysOnTop: () => ipcRenderer.invoke('window:get-always-on-top'),
  setWindowSize: (width: number, height: number) => ipcRenderer.invoke('window:set-size', width, height),
  animateWindowHeight: (height: number) => ipcRenderer.invoke('window:animate-height', height),
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

  startSpotifyAuth: (clientId: string) => ipcRenderer.invoke('spotify:start-auth', clientId),
  getSpotifyTokens: () => ipcRenderer.invoke('spotify:get-tokens'),
  saveSpotifyTokens: (tokens: SpotifyTokens) => ipcRenderer.invoke('spotify:save-tokens', tokens),
  clearSpotifyTokens: () => ipcRenderer.invoke('spotify:clear-tokens'),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<SpotiflySettings>) => ipcRenderer.invoke('settings:save', settings),
};

contextBridge.exposeInMainWorld('spotifly', spotiflyAPI);
