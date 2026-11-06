import React from 'react';
import { Pin, X, Settings2, Minus, Mic2, ChevronsDownUp } from 'lucide-react';
import logoUrl from '../assets/logo.png';

interface TopBarProps {
  isPinned: boolean;
  onTogglePin: () => void;
  onMinimize?: () => void;
  onClose: () => void;
  onOpenSettings: () => void;
  mode: 'gsmtc' | 'spotify' | 'demo';
  isVisible?: boolean;
  isLyricsOpen?: boolean;
  onToggleLyrics?: () => void;
  onToggleZip?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isPinned,
  onTogglePin,
  onMinimize,
  onClose,
  onOpenSettings,
  mode,
  isVisible = true,
  isLyricsOpen = false,
  onToggleLyrics,
  onToggleZip,
}) => {
  return (
    <header
      onDoubleClick={onToggleZip}
      className={`app-drag w-full flex items-center justify-between px-3 text-white select-none transition-all duration-300 ease-out ${
        isVisible
          ? 'max-h-8 opacity-60 hover:opacity-100 pt-1 pb-0.5 pointer-events-auto'
          : 'max-h-0 opacity-0 py-0 overflow-hidden pointer-events-none'
      }`}
    >
      {/* Left: Branding */}
      <div className="flex items-center gap-1.5">
        <img
          src={logoUrl}
          alt="Spoti-Fly"
          className="h-[14px] w-auto object-contain select-none pointer-events-none drop-shadow-[0_1px_3px_rgba(29,185,84,0.4)]"
        />
        <span className="text-xs font-semibold tracking-wide text-white/95 font-sans">
          Spoti-Fly
        </span>
      </div>

      {/* Right: Window Controls */}
      <div className="app-no-drag flex items-center gap-1">
        {/* Synced Lyrics Toggle Button */}
        {onToggleLyrics && (
          <button
            onClick={onToggleLyrics}
            title={isLyricsOpen ? 'Hide Synced Lyrics' : 'Show Synced Lyrics'}
            className={`p-1 rounded-md transition-all duration-200 ${
              isLyricsOpen
                ? 'text-[#1DB954] bg-[#1DB954]/20 hover:bg-[#1DB954]/30 ring-1 ring-[#1DB954]/40'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Mic2 size={13} className="stroke-[2.2]" />
          </button>
        )}

        {/* Pin Window Position Button (Locks position against dragging; window always stays on top) */}
        <button
          onClick={onTogglePin}
          title={
            isPinned
              ? 'Position Locked (Click to unlock & drag window)'
              : 'Position Unlocked (Draggable — click to lock position)'
          }
          className={`p-1 rounded-md transition-all duration-200 ${
            isPinned
              ? 'text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 ring-1 ring-emerald-500/40 rotate-45'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Pin size={13} className="stroke-[2.2]" />
        </button>

        {/* Zip Up / Size Down Button */}
        {onToggleZip && (
          <button
            onClick={onToggleZip}
            title="Zip up miniplayer (Size down to compact bar)"
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors duration-150"
          >
            <ChevronsDownUp size={13} className="stroke-[2.2]" />
          </button>
        )}

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          title="Spoti-Fly Settings & Source"
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors duration-150"
        >
          <Settings2 size={13} className="stroke-[2.2]" />
        </button>

        {/* Minimize Button */}
        <button
          onClick={onMinimize}
          title="Minimize Spoti-Fly"
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors duration-150"
        >
          <Minus size={13} className="stroke-[2.5]" />
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          title="Close Spoti-Fly"
          className="p-1 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors duration-150"
        >
          <X size={14} className="stroke-[2.2]" />
        </button>
      </div>
    </header>
  );
};
