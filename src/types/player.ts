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

export interface SpotiflySettings {
  mode: 'gsmtc' | 'spotify' | 'demo';
  alwaysOnTop: boolean;
  showMarquee: boolean;
  minimalMode?: boolean;
  opacity?: number;
  spotifyClientId?: string;
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

  // Spotify Auth (PKCE)
  startSpotifyAuth: (clientId: string) => Promise<{ code: string; redirectUri: string; verifier: string } | { error: string }>;
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
}

declare global {
  interface Window {
    spotifly?: SpotiflyAPI;
  }
}
