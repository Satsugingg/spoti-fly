import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Pin, Settings2, ChevronsUpDown } from 'lucide-react';
import { MarqueeText } from './MarqueeText';
import { TrackState } from '../../types/player';
import logoUrl from '../assets/logo.png';

interface CompactBarProps {
  track: TrackState;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious?: () => void;
  onTogglePin: () => void;
  isPinned: boolean;
  onOpenSettings?: () => void;
  onToggleZip?: () => void;
}

export const CompactBar: React.FC<CompactBarProps> = ({
  track,
  onTogglePlay,
  onNext,
  onPrevious,
  onTogglePin,
  isPinned,
  onOpenSettings,
  onToggleZip,
}) => {
  const progressPercent =
    track.duration > 0
      ? Math.min(100, Math.max(0, (track.position / track.duration) * 100))
      : 0;

  return (
    <div
      onDoubleClick={onToggleZip}
      className="w-full h-full px-2.5 flex items-center justify-between select-none relative group/bar"
      title="Double-click to expand / unzip miniplayer"
    >
      {/* Left: Thumbnail & Track Info */}
      <div className="flex items-center min-w-0 flex-1 mr-2">
        <div className="app-no-drag w-[28px] h-[28px] rounded-lg overflow-hidden border border-white/15 bg-zinc-900/90 shrink-0 flex items-center justify-center shadow">
          {track.artworkUrl ? (
            <img
              src={track.artworkUrl}
              alt={`${track.title} cover`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <img src={logoUrl} alt="Spoti-Fly" className="w-5 h-auto object-contain opacity-70" />
          )}
        </div>

        <div className="min-w-0 flex-1 ml-2">
          <MarqueeText
            text={track.title || 'Waiting for Spotify...'}
            className="text-[11px] font-bold text-white tracking-tight leading-tight"
          />
          <p
            className="text-[9px] text-zinc-300/80 font-normal truncate leading-tight mt-0.5"
            title={track.artist}
          >
            {track.artist || 'Spoti-Fly'}
          </p>
        </div>
      </div>

      {/* Right: Controls Cluster */}
      <div className="app-no-drag flex items-center gap-1 shrink-0">
        {/* Previous Track button */}
        {onPrevious && (
          <button
            onClick={onPrevious}
            title="Previous Track"
            className="p-1 text-zinc-300 hover:text-white active:scale-90 transition-transform"
          >
            <SkipBack size={12} className="fill-white stroke-none" />
          </button>
        )}

        {/* Play / Pause button */}
        <button
          onClick={onTogglePlay}
          title={track.isPlaying ? 'Pause' : 'Play'}
          className={`w-6 h-6 rounded-full flex items-center justify-center p-0 backdrop-blur-md transition-all shadow active:scale-90 ${
            track.isPlaying
              ? 'bg-[#1DB954] hover:bg-[#1ed760] text-black shadow-[0_0_8px_rgba(29,185,84,0.4)]'
              : 'bg-white/20 hover:bg-white/30 text-white'
          }`}
        >
          {track.isPlaying ? (
            <Pause size={10} className="fill-black stroke-none" />
          ) : (
            <Play size={10} className="fill-white stroke-none ml-0.5" />
          )}
        </button>

        {/* Next Track button */}
        <button
          onClick={onNext}
          title="Next Track"
          className="p-1 text-zinc-300 hover:text-white active:scale-90 transition-transform"
        >
          <SkipForward size={12} className="fill-white stroke-none" />
        </button>

        {/* Expand / Unzip button */}
        {onToggleZip && (
          <button
            onClick={onToggleZip}
            title="Unzip / Expand to Full Player"
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronsUpDown size={12} className="stroke-[2.2]" />
          </button>
        )}

        {/* Pin Window Position button */}
        <button
          onClick={onTogglePin}
          title={
            isPinned
              ? 'Position Locked (Click to unlock & drag)'
              : 'Position Unlocked (Draggable — click to lock position)'
          }
          className={`p-1 rounded-md transition-all duration-200 ${
            isPinned
              ? 'text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 ring-1 ring-emerald-500/40 rotate-45'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Pin size={11} className="stroke-[2.2]" />
        </button>

        {/* Settings button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title="Spoti-Fly Settings"
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Settings2 size={11} className="stroke-[2.2]" />
          </button>
        )}
      </div>

      {/* Bottom Glowing Progress Line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 overflow-hidden pointer-events-none">
        <div
          className="h-full bg-[#1DB954] transition-all duration-150"
          style={{
            width: `${progressPercent}%`,
            boxShadow: '0 0 6px rgba(29, 185, 84, 0.8)',
          }}
        />
      </div>
    </div>
  );
};
