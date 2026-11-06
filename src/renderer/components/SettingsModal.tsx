import React, { useEffect, useState } from 'react';
import {
  X,
  SlidersHorizontal,
  Eye,
  Monitor,
  Power,
  Volume2,
  Keyboard,
  Magnet,
  SkipForward,
  RotateCcw,
  Mic2,
  Minimize2,
  Radio,
} from 'lucide-react';
import { SpotiflySettings, HotkeyConfig } from '../../types/player';
import logoUrl from '../assets/logo.png';
import packageJson from '../../../package.json';

export const DEFAULT_HOTKEYS: Required<HotkeyConfig> = {
  playPause: 'CommandOrControl+Alt+Space',
  nextTrack: 'CommandOrControl+Alt+Right',
  prevTrack: 'CommandOrControl+Alt+Left',
  volumeUp: 'CommandOrControl+Alt+Up',
  volumeDown: 'CommandOrControl+Alt+Down',
  toggleWindow: 'CommandOrControl+Alt+H',
};

interface HotkeyActionItem {
  id: keyof HotkeyConfig;
  label: string;
}

const HOTKEY_ACTIONS: HotkeyActionItem[] = [
  { id: 'playPause', label: 'Play / Pause' },
  { id: 'nextTrack', label: 'Next Track' },
  { id: 'prevTrack', label: 'Previous Track' },
  { id: 'volumeUp', label: 'Volume Up (+5%)' },
  { id: 'volumeDown', label: 'Volume Down (-5%)' },
  { id: 'toggleWindow', label: 'Show / Hide Window' },
];

function formatShortcutDisplay(accelerator?: string): string {
  if (!accelerator || !accelerator.trim()) return 'None (Unassigned)';
  return accelerator
    .replace(/CommandOrControl|CmdOrCtrl/gi, 'Ctrl')
    .replace(/Super|Meta/gi, 'Win')
    .replace(/ArrowUp/gi, '↑')
    .replace(/ArrowDown/gi, '↓')
    .replace(/ArrowLeft/gi, '←')
    .replace(/ArrowRight/gi, '→')
    .replace(/Return/gi, 'Enter')
    .split('+')
    .join(' + ');
}

function getAcceleratorFromEvent(e: KeyboardEvent): { accelerator?: string; error?: string } {
  const isCtrl = e.ctrlKey;
  const isAlt = e.altKey;
  const isShift = e.shiftKey;
  const isMeta = e.metaKey;

  // Modifiers alone
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
    return {};
  }

  let key = e.key;

  if (key === ' ') key = 'Space';
  else if (key === 'ArrowUp') key = 'Up';
  else if (key === 'ArrowDown') key = 'Down';
  else if (key === 'ArrowLeft') key = 'Left';
  else if (key === 'ArrowRight') key = 'Right';
  else if (key === 'Enter') key = 'Return';
  else if (/^[a-z]$/i.test(key)) key = key.toUpperCase();
  else if (/^F\d{1,2}$/i.test(key)) key = key.toUpperCase();

  const isFunctionKey = /^F\d{1,2}$/i.test(key);
  const isMediaKey = /^Media/i.test(key);

  if (!isCtrl && !isAlt && !isShift && !isMeta && !isFunctionKey && !isMediaKey) {
    return { error: 'Include Ctrl, Alt, or Shift' };
  }

  const parts: string[] = [];
  if (isCtrl) parts.push('CommandOrControl');
  if (isAlt) parts.push('Alt');
  if (isShift) parts.push('Shift');
  if (isMeta) parts.push('Super');
  parts.push(key);

  return { accelerator: parts.join('+') };
}

interface SettingsModalProps {
  isOpen: boolean;
  isClosing?: boolean;
  onClose: () => void;
  settings: SpotiflySettings;
  onUpdateSettings: (newSettings: Partial<SpotiflySettings>) => void;
  isSpotifyAuth?: boolean;
  onConnectSpotify?: (clientId?: string) => void;
  onDisconnectSpotify?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  isClosing = false,
  onClose,
  settings,
  onUpdateSettings,
  isSpotifyAuth = false,
  onConnectSpotify,
  onDisconnectSpotify,
}) => {
  const [hasShortcut, setHasShortcut] = useState(false);
  const [recordingAction, setRecordingAction] = useState<keyof HotkeyConfig | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<string | null>(null);
  const [clientIdInput, setClientIdInput] = useState(settings.spotifyClientId || '');
  const [authError, setAuthError] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  useEffect(() => {
    setClientIdInput(settings.spotifyClientId || '');
  }, [settings.spotifyClientId]);

  const isStartOnBoot = settings.startOnBoot !== false;
  const isStartMinimized = Boolean(settings.startMinimized);
  const isGlobalHotkeys = settings.globalHotkeysEnabled !== false;
  const isEdgeSnapping = settings.enableEdgeSnapping !== false;
  const isUpNextPreview = Boolean(settings.showUpNextPreview);
  const isKaraokeButton = settings.showKaraokeButton !== false;
  const volumeTarget = settings.volumeTarget || 'spotify';

  useEffect(() => {
    if (!recordingAction) {
      setRecordingStatus(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingAction(null);
        setRecordingStatus(null);
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        const currentHotkeys = { ...DEFAULT_HOTKEYS, ...(settings.hotkeys || {}) };
        const updated = { ...currentHotkeys, [recordingAction]: '' };
        onUpdateSettings({ hotkeys: updated });
        setRecordingAction(null);
        setRecordingStatus(null);
        return;
      }

      const { accelerator, error } = getAcceleratorFromEvent(e);
      if (error) {
        setRecordingStatus(error);
        return;
      }

      if (accelerator !== undefined) {
        const currentHotkeys = { ...DEFAULT_HOTKEYS, ...(settings.hotkeys || {}) };
        const updated = { ...currentHotkeys, [recordingAction]: accelerator };
        onUpdateSettings({ hotkeys: updated });
        setRecordingAction(null);
        setRecordingStatus(null);
      } else {
        const mods: string[] = [];
        if (e.ctrlKey) mods.push('Ctrl');
        if (e.altKey) mods.push('Alt');
        if (e.shiftKey) mods.push('Shift');
        if (e.metaKey) mods.push('Win');
        setRecordingStatus(mods.length > 0 ? `${mods.join(' + ')} + ...` : null);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [recordingAction, settings.hotkeys, onUpdateSettings]);

  useEffect(() => {
    if (isOpen && window.spotifly) {
      window.spotifly.hasDesktopShortcut?.().then((exists) => setHasShortcut(Boolean(exists)));
      window.spotifly.getStartOnBoot?.().then((boot) => {
        if (typeof boot === 'boolean' && boot !== settings.startOnBoot) {
          onUpdateSettings({ startOnBoot: boot });
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isMinimal = Boolean(settings.minimalMode);
  const currentOpacity = typeof settings.opacity === 'number' ? settings.opacity : 100;

  const handleToggleShortcut = async () => {
    if (!window.spotifly) return;
    if (hasShortcut) {
      await window.spotifly.removeDesktopShortcut?.();
      setHasShortcut(false);
    } else {
      const ok = await window.spotifly.createDesktopShortcut?.();
      if (ok) setHasShortcut(true);
    }
  };

  const handleToggleStartOnBoot = async () => {
    const next = !isStartOnBoot;
    onUpdateSettings({ startOnBoot: next });
    if (window.spotifly?.setStartOnBoot) {
      await window.spotifly.setStartOnBoot(next);
    }
  };

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/80 backdrop-blur-md transition-all duration-200 ease-out ${
        isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`app-no-drag w-full max-w-[310px] rounded-2xl bg-zinc-900/95 border border-white/10 p-3 shadow-2xl text-white text-xs select-none transition-all duration-200 ease-out ${
          isClosing
            ? 'opacity-0 scale-95 translate-y-1'
            : 'opacity-100 scale-100 translate-y-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <span className="font-semibold text-white tracking-wide flex items-center gap-2">
            <img src={logoUrl} alt="Spoti-Fly" className="h-3.5 w-auto object-contain" />
            Spoti-Fly Settings
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Settings List */}
        <div className="scrollable-area space-y-2 mt-2.5 max-h-[350px] overflow-y-auto pr-0.5 scrollbar-none">
          {/* Scroll Wheel Volume Target */}
          <div className="p-2.5 rounded-xl bg-zinc-800/50 border border-white/5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Volume2 size={14} className="text-[#1DB954]" />
              <span className="font-semibold text-[12px] text-white">
                Scroll Wheel Volume Target
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-tight mb-2">
              Scroll mouse wheel anywhere over player to adjust volume.
            </p>

            {/* Segmented selector */}
            <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
              <button
                type="button"
                onClick={() => onUpdateSettings({ volumeTarget: 'spotify' })}
                className={`py-1 px-2 rounded-md text-[11px] font-medium transition-all ${
                  volumeTarget === 'spotify'
                    ? 'bg-[#1DB954] text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Spotify App
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ volumeTarget: 'system' })}
                className={`py-1 px-2 rounded-md text-[11px] font-medium transition-all ${
                  volumeTarget === 'system'
                    ? 'bg-[#1DB954] text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Windows Master
              </button>
            </div>
          </div>

          {/* Global Hotkeys Toggle & Cheat-sheet */}
          <div className="p-2.5 rounded-xl bg-zinc-800/50 border border-white/5">
            <button
              type="button"
              onClick={() => onUpdateSettings({ globalHotkeysEnabled: !isGlobalHotkeys })}
              className="w-full flex items-start justify-between gap-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Keyboard
                    size={14}
                    className={isGlobalHotkeys ? 'text-[#1DB954]' : 'text-zinc-400'}
                  />
                  <span className="font-semibold text-[12px] text-white">
                    Global Hotkeys
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Control playback anywhere while gaming or working in other apps.
                </p>
              </div>

              {/* Toggle Pill Switch */}
              <div
                className={`shrink-0 w-8 h-4.5 rounded-full p-0.5 transition-colors mt-0.5 flex items-center ${
                  isGlobalHotkeys ? 'bg-[#1DB954]' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${
                    isGlobalHotkeys ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* Hotkeys Customization Table */}
            {isGlobalHotkeys && (
              <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium px-0.5 mb-1">
                  <span>Action</span>
                  <span>Shortcut</span>
                </div>

                {HOTKEY_ACTIONS.map(({ id, label }) => {
                  const currentHotkeys = { ...DEFAULT_HOTKEYS, ...(settings?.hotkeys || {}) };
                  const currentVal = currentHotkeys?.[id] ?? DEFAULT_HOTKEYS?.[id] ?? '';
                  const isRecording = recordingAction === id;
                  const isDefault = currentVal === (DEFAULT_HOTKEYS?.[id] ?? '');

                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-black/30 border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <span className="text-[11px] text-zinc-300 font-medium leading-tight">
                        {label}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (isRecording) {
                              setRecordingAction(null);
                              setRecordingStatus(null);
                            } else {
                              setRecordingAction(id);
                              setRecordingStatus(null);
                            }
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
                            isRecording
                              ? 'bg-[#1DB954]/20 border-[#1DB954] text-[#1DB954] animate-pulse ring-1 ring-[#1DB954]/50'
                              : currentVal
                              ? 'bg-zinc-800/80 hover:bg-zinc-700/80 border-white/10 text-white hover:border-white/20'
                              : 'bg-zinc-900 border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {isRecording ? (
                            recordingStatus || 'Press keys...'
                          ) : currentVal ? (
                            formatShortcutDisplay(currentVal)
                          ) : (
                            'Click to record'
                          )}
                        </button>

                        {/* Reset individual button if modified */}
                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = {
                                ...currentHotkeys,
                                [id]: DEFAULT_HOTKEYS[id],
                              };
                              onUpdateSettings({ hotkeys: updated });
                            }}
                            title="Reset to default"
                            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <RotateCcw size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Recording helper prompt when active */}
                {recordingAction && (
                  <div className="p-1.5 rounded-md bg-[#1DB954]/10 border border-[#1DB954]/30 text-[10px] text-zinc-300 flex items-center justify-between">
                    <span>
                      Press shortcut, <kbd className="px-1 py-0.2 bg-black/40 rounded text-[9px] text-[#1DB954]">Backspace</kbd> to clear, or <kbd className="px-1 py-0.2 bg-black/40 rounded text-[9px] text-zinc-400">Esc</kbd>
                    </span>
                    <button
                      type="button"
                      onClick={() => setRecordingAction(null)}
                      className="text-zinc-400 hover:text-white text-[9px] underline ml-1"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Reset all shortcuts */}
                <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-400">
                  <span className="text-[9px] text-zinc-500">Requires Ctrl, Alt, or Shift</span>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ hotkeys: { ...DEFAULT_HOTKEYS } })}
                    className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-[#1DB954] transition-colors"
                  >
                    <RotateCcw size={10} />
                    <span>Reset All Shortcuts</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Magnetic Edge Snapping */}
          <div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ enableEdgeSnapping: !isEdgeSnapping })}
              className={`w-full p-2.5 rounded-xl border transition-all text-left flex items-start justify-between gap-3 ${
                isEdgeSnapping
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-zinc-800/50 border-white/5 hover:bg-zinc-800'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Magnet
                    size={14}
                    className={isEdgeSnapping ? 'text-emerald-400' : 'text-zinc-400'}
                  />
                  <span className="font-semibold text-[12px] text-white">
                    Magnetic Screen Snapping
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Tactile bounce snap to monitor borders with weighted breakaway pull.
                </p>
              </div>

              {/* Toggle Pill Switch */}
              <div
                className={`shrink-0 w-8 h-4.5 rounded-full p-0.5 transition-colors mt-0.5 flex items-center ${
                  isEdgeSnapping ? 'bg-[#1DB954]' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${
                    isEdgeSnapping ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Up Next Preview Toggle */}
          <div
            className={`w-full p-2.5 rounded-xl border transition-all text-left ${
              isUpNextPreview
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-zinc-800/50 border-white/5'
            }`}
          >
            <button
              type="button"
              onClick={() => onUpdateSettings({ showUpNextPreview: !isUpNextPreview })}
              className="w-full flex items-start justify-between gap-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <SkipForward
                    size={14}
                    className={isUpNextPreview ? 'text-emerald-400' : 'text-zinc-400'}
                  />
                  <span className="font-semibold text-[12px] text-white">
                    Up Next Hover Preview
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Hovering over the next track button previews the upcoming song.
                </p>
              </div>

              {/* Toggle Pill Switch */}
              <div
                className={`shrink-0 w-8 h-4.5 rounded-full p-0.5 transition-colors mt-0.5 flex items-center ${
                  isUpNextPreview ? 'bg-[#1DB954]' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${
                    isUpNextPreview ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* Spotify Account Connection for Up Next Queue */}
            {isUpNextPreview && (
              <div className="mt-2.5 pt-2 border-t border-white/10 pl-2 border-l-2 border-[#1DB954]/50 ml-0.5 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Radio size={12} className={isSpotifyAuth ? 'text-emerald-400' : 'text-zinc-400'} />
                      <span className="text-[11px] font-semibold text-white">
                        Spotify Queue Sync
                      </span>
                      {isSpotifyAuth && (
                        <span className="text-[8.5px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-[9.5px] text-zinc-400 leading-tight mt-0.5">
                      {isSpotifyAuth
                        ? 'Queue data is syncing in real-time for upcoming track previews.'
                        : 'Windows media controls (GSMTC) only expose the active song. Note: Spotify restricts their Web API queue endpoint to Spotify Premium accounts.'}
                    </p>
                  </div>
                  {isSpotifyAuth && (
                    <button
                      type="button"
                      onClick={onDisconnectSpotify}
                      className="shrink-0 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium transition-colors"
                    >
                      Disconnect
                    </button>
                  )}
                </div>

                {!isSpotifyAuth && (
                  <div className="flex flex-col gap-2 bg-black/40 p-2.5 rounded-lg border border-white/5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-zinc-300">Spotify Client ID</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (window.spotifly?.openExternalUrl) {
                              window.spotifly.openExternalUrl('https://developer.spotify.com/dashboard');
                            } else {
                              window.open('https://developer.spotify.com/dashboard', '_blank');
                            }
                          }}
                          className="text-[#1DB954] hover:underline flex items-center gap-0.5 text-[9.5px] cursor-pointer bg-transparent border-none p-0"
                        >
                          developer.spotify.com ↗
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={clientIdInput}
                          onChange={(e) => {
                            setClientIdInput(e.target.value.trim());
                            setAuthError(null);
                          }}
                          placeholder="Paste 32-character Client ID"
                          className="flex-1 px-2 py-1 rounded bg-zinc-900 border border-white/10 text-white text-[10px] font-mono focus:border-[#1DB954] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!clientIdInput) return;
                            setAuthError(null);
                            onUpdateSettings({ spotifyClientId: clientIdInput });
                            onConnectSpotify?.(clientIdInput);
                          }}
                          disabled={!clientIdInput}
                          className="shrink-0 px-2.5 py-1 rounded bg-[#1DB954] hover:bg-[#1ed760] disabled:bg-zinc-800 disabled:text-zinc-600 text-black text-[10px] font-bold transition-colors shadow"
                        >
                          Connect
                        </button>
                      </div>
                      {authError && (
                        <p className="text-[9px] text-rose-400 mt-0.5">{authError}</p>
                      )}
                    </div>

                    <div className="text-[9px] text-zinc-400 bg-zinc-900/70 p-2 rounded border border-white/5 space-y-1">
                      <div className="font-semibold text-zinc-300">Quick 1-Minute Setup:</div>
                      <div>
                        1. Open{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (window.spotifly?.openExternalUrl) {
                              window.spotifly.openExternalUrl('https://developer.spotify.com/dashboard');
                            } else {
                              window.open('https://developer.spotify.com/dashboard', '_blank');
                            }
                          }}
                          className="text-[#1DB954] underline bg-transparent border-none p-0 cursor-pointer font-medium"
                        >
                          developer.spotify.com/dashboard
                        </button>{' '}
                        in your default browser and log in.
                      </div>
                      <div className="pt-0.5">
                        <span className="text-[9px] text-zinc-300">2. In App Settings, add Redirect URI:</span>
                      </div>
                      <div className="flex items-center gap-1.5 my-1">
                        <code className="flex-1 font-mono text-[9.5px] text-emerald-400 select-all bg-black/60 px-2 py-1 rounded border border-white/10 font-bold">
                          http://127.0.0.1:8000/callback
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('http://127.0.0.1:8000/callback');
                            setCopiedUri(true);
                            setTimeout(() => setCopiedUri(false), 2000);
                          }}
                          className="shrink-0 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[9px] font-semibold border border-white/10 transition-colors"
                        >
                          {copiedUri ? '✓ Copied!' : 'Copy URI'}
                        </button>
                      </div>
                      <div className="text-[8.5px] text-zinc-500 italic pb-0.5">
                        ℹ Spotify requires the 127.0.0.1 loopback address (Spotify blocks &quot;localhost&quot; for security).
                      </div>
                      <div>3. Copy your <b>Client ID</b>, paste it above, and click <b>Connect</b>!</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Karaoke / Synced Lyrics Button Toggle */}
          <div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ showKaraokeButton: !isKaraokeButton })}
              className={`w-full p-2.5 rounded-xl border transition-all text-left flex items-start justify-between gap-3 ${
                isKaraokeButton
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-zinc-800/50 border-white/5 hover:bg-zinc-800'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Mic2
                    size={14}
                    className={isKaraokeButton ? 'text-emerald-400' : 'text-zinc-400'}
                  />
                  <span className="font-semibold text-[12px] text-white">
                    Karaoke / Synced Lyrics Button
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Show or remove the mic button on the player controls and top bar.
                </p>
              </div>

              {/* Toggle Pill Switch */}
              <div
                className={`shrink-0 w-8 h-4.5 rounded-full p-0.5 transition-colors mt-0.5 flex items-center ${
                  isKaraokeButton ? 'bg-[#1DB954]' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${
                    isKaraokeButton ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Minimal Player Mode Toggle */}
          <div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ minimalMode: !isMinimal })}
              className={`w-full p-2.5 rounded-xl border transition-all text-left flex items-start justify-between gap-3 ${
                isMinimal
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-zinc-800/50 border-white/5 hover:bg-zinc-800'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <SlidersHorizontal
                    size={14}
                    className={isMinimal ? 'text-emerald-400' : 'text-zinc-400'}
                  />
                  <span className="font-semibold text-[12px] text-white">
                    Minimal Player Mode
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Compact view with album art, title, and elapsed time only.
                </p>
              </div>

              {/* Toggle Pill Switch */}
              <div
                className={`shrink-0 w-8 h-4.5 rounded-full p-0.5 transition-colors mt-0.5 flex items-center ${
                  isMinimal ? 'bg-[#1DB954]' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${
                    isMinimal ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Window Opacity Slider */}
          <div className="p-2.5 rounded-xl bg-zinc-800/50 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Eye size={14} className="text-emerald-400" />
                <span className="font-semibold text-[12px] text-white">Window Opacity</span>
              </div>
              <span className="text-[11px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {currentOpacity}%
              </span>
            </div>

            {/* Range Slider */}
            <div className="flex items-center gap-2.5 px-0.5">
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={currentOpacity}
                onChange={(e) => onUpdateSettings({ opacity: Number(e.target.value) })}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center justify-between gap-1.5 mt-2 pt-2 border-t border-white/5">
              <span className="text-[10px] text-zinc-400">Presets:</span>
              <div className="flex items-center gap-1">
                {[40, 60, 80, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onUpdateSettings({ opacity: preset })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      currentOpacity === preset
                        ? 'bg-[#1DB954] text-black font-semibold'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop Shortcut Toggle */}
          <div>
            <button
              type="button"
              onClick={handleToggleShortcut}
              className={`w-full p-2.5 rounded-xl border transition-all text-left flex items-start justify-between gap-3 ${
                hasShortcut
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-zinc-800/50 border-white/5 hover:bg-zinc-800'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Monitor
                    size={14}
                    className={hasShortcut ? 'text-emerald-400' : 'text-zinc-400'}
                  />
                  <span className="font-semibold text-[12px] text-white">
                    Desktop Shortcut
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  {hasShortcut
                    ? 'Active on your desktop. Click to remove.'
                    : 'Click to place a shortcut on your Windows desktop.'}
                </p>
              </div>

              {/* Toggle Pill Switch */}
              <div
                className={`shrink-0 w-8 h-4.5 rounded-full p-0.5 transition-colors mt-0.5 flex items-center ${
                  hasShortcut ? 'bg-[#1DB954]' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${
                    hasShortcut ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Start with Windows Toggle Container */}
          <div
            className={`w-full p-2.5 rounded-xl border transition-all text-left ${
              isStartOnBoot
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-zinc-800/50 border-white/5'
            }`}
          >
            <button
              type="button"
              onClick={handleToggleStartOnBoot}
              className="w-full flex items-start justify-between gap-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Power
                    size={14}
                    className={isStartOnBoot ? 'text-emerald-400' : 'text-zinc-400'}
                  />
                  <span className="font-semibold text-[12px] text-white">
                    Start with Windows
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Automatically start Spoti-Fly when your computer boots up.
                </p>
              </div>

              {/* Toggle Pill Switch */}
              <div
                className={`shrink-0 w-8 h-4.5 rounded-full p-0.5 transition-colors mt-0.5 flex items-center ${
                  isStartOnBoot ? 'bg-[#1DB954]' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${
                    isStartOnBoot ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* Secondary Option: Start Minimized (Appears only when Start with Windows is ON) */}
            {isStartOnBoot && (
              <div className="mt-2.5 pt-2.5 border-t border-white/10 pl-2.5 border-l-2 border-[#1DB954]/50 ml-1">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ startMinimized: !isStartMinimized })}
                  className="w-full flex items-start justify-between gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Minimize2
                        size={13}
                        className={isStartMinimized ? 'text-emerald-400' : 'text-zinc-400'}
                      />
                      <span className="font-semibold text-[11px] text-white">
                        Start Minimized
                      </span>
                    </div>
                    <p className="text-[9.5px] text-zinc-400 leading-tight">
                      Launch quietly in the background/tray without popping up on screen.
                    </p>
                  </div>

                  {/* Toggle Pill Switch */}
                  <div
                    className={`shrink-0 w-7 h-4 rounded-full p-0.5 transition-colors mt-0.5 flex items-center ${
                      isStartMinimized ? 'bg-[#1DB954]' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full bg-white shadow-md transform transition-transform ${
                        isStartMinimized ? 'translate-x-3' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 font-mono tracking-wider">
            v{packageJson.version}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold text-xs transition-colors shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
