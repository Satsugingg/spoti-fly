export interface TrackState {
  title: string;
  artist: string;
  album: string;
  artworkUrl: string | null;
  isPlaying: boolean;
  position: number;      // Current playback time in seconds
  duration: number;      // Total track duration in seconds
  isShuffle: boolean;
  repeatMode: 'off' | 'track' | 'context';
  source: 'gsmtc' | 'spotify' | 'demo';
  hasMedia: boolean;
  timestamp: number;     // Epoch timestamp of last position update
}

export type PlaybackCommand = 'play' | 'pause' | 'toggle' | 'next' | 'prev' | 'seek';

export interface HotkeyConfig {
  playPause?: string;
  nextTrack?: string;
  prevTrack?: string;
  volumeUp?: string;
  volumeDown?: string;
  toggleWindow?: string;
}

export interface SpotiflySettings {
  mode: 'gsmtc' | 'spotify' | 'demo';
  alwaysOnTop: boolean;
  showMarquee: boolean;
  minimalMode?: boolean;
  compactMode?: boolean;
  opacity?: number;
  spotifyClientId?: string;
  spotifyRedirectUri?: string;
  isPinned?: boolean;
  startOnBoot?: boolean;
  startMinimized?: boolean;
  windowX?: number;
  windowY?: number;
  volumeTarget?: 'spotify' | 'system';
  globalHotkeysEnabled?: boolean;
  hotkeys?: HotkeyConfig;
  enableEdgeSnapping?: boolean;
  showUpNextPreview?: boolean;
  showLyrics?: boolean;
  showKaraokeButton?: boolean;
}

export interface SpotifyTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface SpotiflyAPI {
  // Window controls
  closeWindow: () => Promise<void>;
  minimizeWindow: () => Promise<void>;
  toggleAlwaysOnTop: () => Promise<boolean>;
  getAlwaysOnTop: () => Promise<boolean>;
  setWindowSize: (width: number, height: number) => Promise<void>;
  animateWindowHeight: (height: number) => Promise<void>;
  startInertialDrag: (clientX: number, clientY: number) => void;
  stopInertialDrag: () => void;

  // Playback controls
  getCurrentTrack: () => Promise<TrackState | null>;
  togglePlayPause: () => Promise<boolean>;
  skipNext: () => Promise<boolean>;
  skipPrevious: () => Promise<boolean>;
  seek: (seconds: number) => Promise<boolean>;
  setShuffle: (active: boolean) => Promise<boolean>;
  setRepeat: (mode: 'off' | 'track' | 'context') => Promise<boolean>;

  // Event listener
  onMediaUpdate: (callback: (track: TrackState) => void) => () => void;
  onAlwaysOnTopChange: (callback: (isPinned: boolean) => void) => () => void;
  onVolumeChanged?: (callback: (data: { percent: number; target: 'spotify' | 'system' }) => void) => () => void;
  onHotkeyTrigger?: (callback: (action: string) => void) => () => void;

  // Volume & Audio controls
  adjustVolume: (deltaPercent: number, target?: 'spotify' | 'system') => Promise<number>;
  getVolume: (target?: 'spotify' | 'system') => Promise<number>;
  setVolume: (percent: number, target?: 'spotify' | 'system') => Promise<number>;

  // Queue
  getQueueNext?: () => Promise<{ title: string; artist: string; artworkUrl?: string | null } | null>;

  // Spotify Auth (PKCE)
  startSpotifyAuth: (clientId: string, redirectUri?: string) => Promise<{ code: string; redirectUri: string; verifier: string } | { error: string }>;
  getSpotifyTokens: () => Promise<SpotifyTokens | null>;
  saveSpotifyTokens: (tokens: SpotifyTokens) => Promise<void>;
  clearSpotifyTokens: () => Promise<void>;

  // Settings
  getSettings: () => Promise<SpotiflySettings>;
  saveSettings: (settings: Partial<SpotiflySettings>) => Promise<void>;

  // System & Shortcuts
  createDesktopShortcut: () => Promise<boolean>;
  hasDesktopShortcut: () => Promise<boolean>;
  removeDesktopShortcut: () => Promise<boolean>;
  getStartOnBoot: () => Promise<boolean>;
  setStartOnBoot: (enabled: boolean) => Promise<boolean>;
  openExternalUrl?: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    spotifly?: SpotiflyAPI;
  }
}
