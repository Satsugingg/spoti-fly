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
} from 'lucide-react';
import { SpotiflySettings } from '../../types/player';
import logoUrl from '../assets/logo.png';

interface SettingsModalProps {
  isOpen: boolean;
  isClosing?: boolean;
  onClose: () => void;
  settings: SpotiflySettings;
  onUpdateSettings: (newSettings: Partial<SpotiflySettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  isClosing = false,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [hasShortcut, setHasShortcut] = useState(false);

  const isStartOnBoot = settings.startOnBoot !== false;
  const isGlobalHotkeys = settings.globalHotkeysEnabled !== false;
  const isEdgeSnapping = settings.enableEdgeSnapping !== false;
  const isUpNextPreview = settings.showUpNextPreview !== false;
  const volumeTarget = settings.volumeTarget || 'spotify';

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
        <div className="space-y-2 mt-2.5 max-h-[350px] overflow-y-auto pr-0.5 scrollbar-none">
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

            {/* Hotkeys Summary List */}
            {isGlobalHotkeys && (
              <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                {[
                  { keys: 'Ctrl+Alt+Space', action: 'Play / Pause' },
                  { keys: 'Ctrl+Alt+→', action: 'Next Track' },
                  { keys: 'Ctrl+Alt+←', action: 'Previous Track' },
                  { keys: 'Ctrl+Alt+↑ / ↓', action: 'Volume ±5%' },
                  { keys: 'Ctrl+Alt+H', action: 'Show / Hide Spoti-Fly' },
                ].map((hk) => (
                  <div key={hk.keys} className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400">{hk.action}</span>
                    <kbd className="px-1.5 py-0.5 bg-black/40 rounded border border-white/10 font-mono text-[9px] text-zinc-300">
                      {hk.keys}
                    </kbd>
                  </div>
                ))}
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
          <div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ showUpNextPreview: !isUpNextPreview })}
              className={`w-full p-2.5 rounded-xl border transition-all text-left flex items-start justify-between gap-3 ${
                isUpNextPreview
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-zinc-800/50 border-white/5 hover:bg-zinc-800'
              }`}
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

          {/* Start with Windows Toggle */}
          <div>
            <button
              type="button"
              onClick={handleToggleStartOnBoot}
              className={`w-full p-2.5 rounded-xl border transition-all text-left flex items-start justify-between gap-3 ${
                isStartOnBoot
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-zinc-800/50 border-white/5 hover:bg-zinc-800'
              }`}
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
                  Quietly start Spoti-Fly when your computer boots up.
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
          </div>
        </div>

        {/* Footer */}
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-end">
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
