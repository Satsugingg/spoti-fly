import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TopBar } from './components/TopBar';
import { PlayerCard } from './components/PlayerCard';
import { SettingsModal, DEFAULT_HOTKEYS } from './components/SettingsModal';
import { LyricsDrawer } from './components/LyricsDrawer';
import { VolumeHud } from './components/VolumeHud';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TrackState, SpotiflySettings } from '../types/player';
import { spotifyApi } from './services/spotifyPkce';

// Default initial loading track (Clean state before media connects)
const INITIAL_LOADING_TRACK: TrackState = {
  title: 'Waiting for Spotify...',
  artist: 'Start playback on Spotify',
  album: '',
  artworkUrl: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  isShuffle: false,
  repeatMode: 'off',
  source: 'gsmtc',
  hasMedia: false,
  timestamp: Date.now(),
};

const SETTINGS_HEIGHT = 490;
const LYRICS_HEIGHT = 340;

export const App: React.FC = () => {
  const [isPinned, setIsPinned] = useState(false);
  const [isShrunk, setIsShrunk] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsClosing, setIsSettingsClosing] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [volumeHud, setVolumeHud] = useState<{
    visible: boolean;
    percent: number;
    target: 'spotify' | 'system';
  }>({
    visible: false,
    percent: 100,
    target: 'spotify',
  });

  const isHoveredRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isSettingsOpenRef = useRef(false);
  const isSettingsClosingRef = useRef(false);
  const isLyricsOpenRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeHudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpotifyVolRef = useRef<number>(100);

  const [settings, setSettings] = useState<SpotiflySettings>({
    mode: 'gsmtc',
    alwaysOnTop: true,
    showMarquee: true,
    minimalMode: false,
    startOnBoot: true,
    startMinimized: false,
    volumeTarget: 'spotify',
    globalHotkeysEnabled: true,
    hotkeys: { ...DEFAULT_HOTKEYS },
    enableEdgeSnapping: true,
    showUpNextPreview: true,
    showLyrics: false,
    showKaraokeButton: true,
  });

  const [track, setTrack] = useState<TrackState>(INITIAL_LOADING_TRACK);
  const [isSpotifyAuth, setIsSpotifyAuth] = useState(false);
  const settingsRef = useRef(settings);

  const getFullHeight = useCallback(
    (minimal: boolean = Boolean(settingsRef.current.minimalMode)) => (minimal ? 72 : 130),
    []
  );

  const getShrunkHeight = useCallback(
    (minimal: boolean = Boolean(settingsRef.current.minimalMode)) => (minimal ? 48 : 86),
    []
  );

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const expandWindow = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    setIsShrunk(false);
    if (!isSettingsOpenRef.current && !isLyricsOpenRef.current && window.spotifly) {
      window.spotifly.animateWindowHeight(getFullHeight());
    }
  }, [getFullHeight]);

  const scheduleShrink = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      if (
        !isHoveredRef.current &&
        !isSettingsOpenRef.current &&
        !isDraggingRef.current &&
        !isLyricsOpenRef.current
      ) {
        setIsShrunk(true);
        if (window.spotifly) {
          window.spotifly.animateWindowHeight(getShrunkHeight());
        }
      }
    }, 2000);
  }, [getShrunkHeight]);

  const showVolumeHud = useCallback((percent: number, target: 'spotify' | 'system') => {
    if (volumeHudTimerRef.current) {
      clearTimeout(volumeHudTimerRef.current);
    }
    setVolumeHud({ visible: true, percent, target });
    volumeHudTimerRef.current = setTimeout(() => {
      setVolumeHud((prev) => (prev ? { ...prev, visible: false } : prev));
    }, 1400);
  }, []);

  const triggerVolumeChange = useCallback(
    (delta: number) => {
      const currentTarget = settingsRef.current.volumeTarget || 'spotify';
      if (currentTarget === 'spotify' && isSpotifyAuth && spotifyApi.isAuthenticated()) {
        const nextVol = Math.max(0, Math.min(100, lastSpotifyVolRef.current + delta));
        lastSpotifyVolRef.current = nextVol;
        spotifyApi.setVolume(nextVol);
        showVolumeHud(nextVol, 'spotify');
        return;
      }

      if (window.spotifly?.adjustVolume) {
        window.spotifly.adjustVolume(delta, currentTarget).then((newVol) => {
          showVolumeHud(newVol, currentTarget);
        });
      }
    },
    [isSpotifyAuth, showVolumeHud]
  );

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.scrollable-area') || isSettingsOpenRef.current) return;

    e.preventDefault();
    const delta = e.deltaY < 0 ? 5 : -5;
    triggerVolumeChange(delta);
  };

  const handleToggleLyrics = useCallback(async () => {
    if (isSettingsOpenRef.current) return;
    const nextOpen = !isLyricsOpenRef.current;

    if (nextOpen) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      setIsShrunk(false);
      setIsLyricsOpen(true);
      isLyricsOpenRef.current = true;

      if (window.spotifly) {
        await window.spotifly.animateWindowHeight(LYRICS_HEIGHT);
      }
    } else {
      isLyricsOpenRef.current = false;
      setIsShrunk(false);

      if (window.spotifly) {
        const fullH = getFullHeight(settingsRef.current.minimalMode);
        await window.spotifly.animateWindowHeight(fullH);
      }

      setIsLyricsOpen(false);

      if (!isHoveredRef.current) {
        scheduleShrink();
      }
    }
  }, [getFullHeight, scheduleShrink]);

  const handleFetchUpNext = useCallback(async () => {
    if (isSpotifyAuth && spotifyApi.isAuthenticated()) {
      const queue = await spotifyApi.fetchQueueNext();
      if (queue) return queue;
    }
    if (window.spotifly?.getQueueNext) {
      return await window.spotifly.getQueueNext();
    }
    return null;
  }, [isSpotifyAuth]);

  // Initial 2s idle shrink timer on launch
  useEffect(() => {
    scheduleShrink();
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [scheduleShrink]);

  // Initialize and load settings
  useEffect(() => {
    if (window.spotifly) {
      window.spotifly.getSettings().then((s) => {
        if (s) {
          setSettings(s);
          settingsRef.current = s;
          if (typeof s.isPinned === 'boolean') {
            setIsPinned(s.isPinned);
          }
        }
      });

      // Initial track check from GSMTC
      window.spotifly.getCurrentTrack().then((current) => {
        if (current && current.hasMedia) {
          setTrack(current);
        }
      });

      // Real-time Media listener
      const unsubMedia = window.spotifly.onMediaUpdate((mediaTrack) => {
        if (settingsRef.current.mode === 'gsmtc' && mediaTrack && mediaTrack.hasMedia) {
          setTrack(mediaTrack);
        }
      });

      // Check Spotify tokens
      window.spotifly.getSpotifyTokens().then((tokens) => {
        if (tokens) {
          spotifyApi.setTokens(tokens);
          setIsSpotifyAuth(true);
        }
      });

      return () => {
        unsubMedia();
      };
    }
  }, []);

  // Spotify Web API polling when mode is 'spotify'
  useEffect(() => {
    if (settings.mode !== 'spotify' || !isSpotifyAuth) return;

    let mounted = true;
    const pollPlayback = async () => {
      const state = await spotifyApi.fetchCurrentPlayback();
      if (mounted && state && state.hasMedia) {
        setTrack(state);
      }
    };

    pollPlayback();
    const interval = setInterval(pollPlayback, 1200);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [settings.mode, isSpotifyAuth]);

  // Window actions: Pin locks position to prevent accidental dragging while window ALWAYS stays on top
  const handleTogglePin = useCallback(() => {
    setIsPinned((prev) => {
      const next = !prev;
      handleUpdateSettings({ isPinned: next });
      return next;
    });
  }, []);

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    expandWindow();
  };

  const handleMouseMove = () => {
    isHoveredRef.current = true;
    if (isShrunk) {
      expandWindow();
    } else if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    if (!isDraggingRef.current && !isSettingsOpenRef.current && !isLyricsOpenRef.current) {
      scheduleShrink();
    }
  };

  const handleMinimize = useCallback(() => {
    if (window.spotifly) {
      window.spotifly.minimizeWindow();
    }
  }, []);

  const handleClose = useCallback(() => {
    if (window.spotifly) {
      window.spotifly.closeWindow();
    } else {
      window.close();
    }
  }, []);

  // Playback control handlers
  const handleTogglePlay = useCallback(async () => {
    if (settings.mode === 'gsmtc' && window.spotifly) {
      await window.spotifly.togglePlayPause();
      setTrack((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    } else if (settings.mode === 'spotify' && isSpotifyAuth) {
      await spotifyApi.togglePlayPause(track.isPlaying);
      setTrack((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    } else {
      setTrack((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    }
  }, [settings.mode, isSpotifyAuth, track.isPlaying]);

  const handleNext = useCallback(async () => {
    if (settings.mode === 'gsmtc' && window.spotifly) {
      await window.spotifly.skipNext();
    } else if (settings.mode === 'spotify' && isSpotifyAuth) {
      await spotifyApi.next();
    }
  }, [settings.mode, isSpotifyAuth]);

  const handlePrevious = useCallback(async () => {
    if (settings.mode === 'gsmtc' && window.spotifly) {
      await window.spotifly.skipPrevious();
    } else if (settings.mode === 'spotify' && isSpotifyAuth) {
      await spotifyApi.previous();
    }
  }, [settings.mode, isSpotifyAuth]);

  const handleSeek = useCallback(
    async (seconds: number) => {
      if (settings.mode === 'gsmtc' && window.spotifly) {
        await window.spotifly.seek(seconds);
      } else if (settings.mode === 'spotify' && isSpotifyAuth) {
        await spotifyApi.seek(seconds);
      }
      setTrack((prev) => ({ ...prev, position: seconds }));
    },
    [settings.mode, isSpotifyAuth]
  );

  const handleToggleShuffle = useCallback(async () => {
    const nextShuffle = !track.isShuffle;
    if (settings.mode === 'gsmtc' && window.spotifly) {
      await window.spotifly.setShuffle(nextShuffle);
    } else if (settings.mode === 'spotify' && isSpotifyAuth) {
      await spotifyApi.setShuffle(nextShuffle);
    }
    setTrack((prev) => ({ ...prev, isShuffle: nextShuffle }));
  }, [settings.mode, isSpotifyAuth, track.isShuffle]);

  const handleToggleRepeat = useCallback(async () => {
    const nextRepeat: 'off' | 'context' | 'track' =
      track.repeatMode === 'off'
        ? 'context'
        : track.repeatMode === 'context'
        ? 'track'
        : 'off';

    if (settings.mode === 'gsmtc' && window.spotifly) {
      await window.spotifly.setRepeat(nextRepeat);
    } else if (settings.mode === 'spotify' && isSpotifyAuth) {
      await spotifyApi.setRepeat(nextRepeat);
    }
    setTrack((prev) => ({ ...prev, repeatMode: nextRepeat }));
  }, [settings.mode, isSpotifyAuth, track.repeatMode]);

  // Options modal window sizing
  const handleOpenSettings = async () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    setIsSettingsClosing(false);
    isSettingsClosingRef.current = false;
    setIsSettingsOpen(true);
    isSettingsOpenRef.current = true;
    if (window.spotifly) {
      await window.spotifly.animateWindowHeight(SETTINGS_HEIGHT);
    }
  };

  const handleCloseSettings = async () => {
    if (isSettingsClosingRef.current) return;
    setIsSettingsClosing(true);
    isSettingsClosingRef.current = true;

    const targetH = isLyricsOpenRef.current
      ? LYRICS_HEIGHT
      : isHoveredRef.current
      ? getFullHeight(settingsRef.current.minimalMode)
      : getShrunkHeight(settingsRef.current.minimalMode);

    if (window.spotifly) {
      await window.spotifly.animateWindowHeight(targetH);
    }

    setIsSettingsOpen(false);
    setIsSettingsClosing(false);
    isSettingsClosingRef.current = false;
    isSettingsOpenRef.current = false;

    if (!isHoveredRef.current && !isLyricsOpenRef.current) {
      setIsShrunk(true);
    } else {
      setIsShrunk(false);
      scheduleShrink();
    }
  };

  // Settings update
  const handleUpdateSettings = (newSettings: Partial<SpotiflySettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    settingsRef.current = updated;
    if (window.spotifly) {
      window.spotifly.saveSettings(newSettings);
    }
    if (newSettings.showKaraokeButton === false && isLyricsOpenRef.current) {
      handleToggleLyrics();
    }
    if (!isSettingsOpenRef.current && !isLyricsOpenRef.current && typeof newSettings.minimalMode === 'boolean') {
      const h = isHoveredRef.current
        ? getFullHeight(newSettings.minimalMode)
        : getShrunkHeight(newSettings.minimalMode);
      window.spotifly?.animateWindowHeight(h);
    }
  };

  // Listen to Global Hotkeys and Volume events from Electron
  useEffect(() => {
    if (!window.spotifly) return;

    const unsubVol = window.spotifly.onVolumeChanged?.((data) => {
      showVolumeHud(data.percent, data.target);
    });

    const unsubHotkey = window.spotifly.onHotkeyTrigger?.((action) => {
      if (action === 'playpause') {
        handleTogglePlay();
      } else if (action === 'next') {
        handleNext();
      } else if (action === 'prev') {
        handlePrevious();
      } else if (action === 'volume_up') {
        triggerVolumeChange(5);
      } else if (action === 'volume_down') {
        triggerVolumeChange(-5);
      }
    });

    return () => {
      unsubVol?.();
      unsubHotkey?.();
    };
  }, [handleTogglePlay, handleNext, handlePrevious, showVolumeHud, triggerVolumeChange]);

  // Spotify PKCE Connect
  const handleConnectSpotify = async (clientId?: string, redirectUri?: string) => {
    if (!window.spotifly) throw new Error('Electron bridge not found');
    const targetId = clientId || settings.spotifyClientId;
    if (!targetId) {
      handleOpenSettings();
      return;
    }
    const targetUri = redirectUri || settings.spotifyRedirectUri || 'http://127.0.0.1:8000/callback';
    spotifyApi.setClientId(targetId);

    const res = await window.spotifly.startSpotifyAuth(targetId, targetUri);
    if ('error' in res) {
      throw new Error(res.error);
    }

    // Exchange auth code for tokens
    const body = new URLSearchParams({
      client_id: targetId,
      grant_type: 'authorization_code',
      code: res.code,
      redirect_uri: res.redirectUri,
      code_verifier: res.verifier,
    });

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json();
      throw new Error(errData.error_description || 'Token exchange failed');
    }

    const data = await tokenRes.json();
    const tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    await window.spotifly.saveSpotifyTokens(tokens);
    spotifyApi.setTokens(tokens);
    setIsSpotifyAuth(true);
  };

  const handleDisconnectSpotify = async () => {
    if (window.spotifly) {
      await window.spotifly.clearSpotifyTokens();
    }
    spotifyApi.setTokens(null);
    setIsSpotifyAuth(false);
    handleUpdateSettings({ mode: 'gsmtc' });
  };

  // Weighted Physics Dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary left mouse button
    if (isPinned) return; // Window is pinned down: position locked, dragging disabled!

    const target = e.target as HTMLElement;
    if (
      target.closest('.app-no-drag') ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'A'
    ) {
      return;
    }

    isDraggingRef.current = true;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    window.spotifly?.startInertialDrag(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    isDraggingRef.current = false;
    window.spotifly?.stopInertialDrag();

    const isInside =
      e.clientX >= 0 &&
      e.clientX <= window.innerWidth &&
      e.clientY >= 0 &&
      e.clientY <= window.innerHeight;
    isHoveredRef.current = isInside;

    if (!isInside && !isSettingsOpenRef.current) {
      scheduleShrink();
    }
  };

  return (
    <div className="w-screen h-screen p-0 m-0 overflow-hidden flex items-center justify-center bg-transparent">
      {/* Mini-Player Frameless Window Container */}
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        style={{
          opacity: isSettingsOpen && !isSettingsClosing
            ? 1
            : (typeof settings.opacity === 'number' ? settings.opacity : 100) / 100,
        }}
        className={`app-drag group relative w-full h-full rounded-[16px] overflow-hidden flex flex-col justify-between select-none shadow-2xl border border-white/[0.12] bg-[#121212] transition-opacity duration-200 ${
          isPinned ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        {/* Full-Bleed Blurred Album Cover Background */}
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-xl scale-125 opacity-90 pointer-events-none"
          style={{
            backgroundImage: track.artworkUrl ? `url(${track.artworkUrl})` : undefined,
          }}
        />

        {/* Dark Translucent Tint with subtle green accent glow during loading */}
        <div
          className={`absolute inset-0 pointer-events-none transition-colors duration-500 ${
            track.artworkUrl
              ? 'bg-black/60'
              : 'bg-gradient-to-br from-[#121a14] via-[#111111] to-[#0a0a0a]'
          }`}
        />

        {/* Dynamic Card Container: Top Bar, Player Card & Synced Lyrics */}
        <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
          {/* Top Bar with Winged Spotifly Branding & Window Actions */}
          <div className="shrink-0 w-full">
            <TopBar
              isPinned={isPinned}
              onTogglePin={handleTogglePin}
              onMinimize={handleMinimize}
              onClose={handleClose}
              onOpenSettings={handleOpenSettings}
              mode={settings.mode}
              isVisible={isLyricsOpen || !isShrunk}
              isLyricsOpen={isLyricsOpen}
              onToggleLyrics={settings.showKaraokeButton !== false ? handleToggleLyrics : undefined}
            />
          </div>

          {/* Main Player Card */}
          <div className="shrink-0 w-full">
            <PlayerCard
              track={track}
              isMinimal={Boolean(settings.minimalMode)}
              isShrunk={!isLyricsOpen && isShrunk}
              onTogglePlay={handleTogglePlay}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onSeek={handleSeek}
              onToggleShuffle={handleToggleShuffle}
              onToggleRepeat={handleToggleRepeat}
              showUpNextPreview={settings.showUpNextPreview !== false}
              onFetchUpNext={handleFetchUpNext}
              isLyricsOpen={isLyricsOpen}
              onToggleLyrics={settings.showKaraokeButton !== false ? handleToggleLyrics : undefined}
              isSpotifyAuth={isSpotifyAuth}
              hasSpotifyClientId={Boolean(settings.spotifyClientId)}
              onConnectSpotify={() => handleConnectSpotify()}
              onOpenSettings={handleOpenSettings}
            />
          </div>

          {/* Synced Lyrics Drawer */}
          {isLyricsOpen && (
            <div className="w-full flex-1 min-h-0 overflow-hidden flex flex-col">
              <LyricsDrawer
                isOpen={isLyricsOpen}
                onClose={handleToggleLyrics}
                track={track}
                onSeek={handleSeek}
              />
            </div>
          )}
        </div>

        {/* Temporary Sleek Volume HUD */}
        <VolumeHud
          visible={volumeHud.visible}
          percent={volumeHud.percent}
          target={volumeHud.target}
        />

        {/* Settings Modal */}
        <ErrorBoundary>
          <SettingsModal
            isOpen={isSettingsOpen}
            isClosing={isSettingsClosing}
            onClose={handleCloseSettings}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            isSpotifyAuth={isSpotifyAuth}
            onConnectSpotify={(id) => handleConnectSpotify(id)}
            onDisconnectSpotify={handleDisconnectSpotify}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default App;
