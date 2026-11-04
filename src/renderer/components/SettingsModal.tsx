import React from 'react';
import { X, SlidersHorizontal, Eye } from 'lucide-react';
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
  if (!isOpen) return null;

  const isMinimal = Boolean(settings.minimalMode);
  const currentOpacity = typeof settings.opacity === 'number' ? settings.opacity : 100;

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/80 backdrop-blur-md transition-all duration-200 ease-out ${
        isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`app-no-drag w-full max-w-[300px] rounded-2xl bg-zinc-900/95 border border-white/10 p-3 shadow-2xl text-white text-xs select-none transition-all duration-200 ease-out ${
          isClosing
            ? 'opacity-0 scale-95 translate-y-1'
            : 'opacity-100 scale-100 translate-y-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <span className="font-semibold text-white tracking-wide flex items-center gap-2">
            <img src={logoUrl} alt="spoti-fly" className="h-3.5 w-auto object-contain" />
            spoti-fly Settings
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Minimal Player Mode Toggle */}
        <div className="mt-2.5">
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
                Compact view showing album art, track title, artist, and elapsed time only.
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
        <div className="mt-2 p-2.5 rounded-xl bg-zinc-800/50 border border-white/5">
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
