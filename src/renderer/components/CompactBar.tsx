import React from 'react';
import { Play, Pause, SkipForward, Pin } from 'lucide-react';
import { MarqueeText } from './MarqueeText';
import { TrackState } from '../../types/player';
import logoUrl from '../assets/logo.png';

interface CompactBarProps {
  track: TrackState;
  onTogglePlay: () => void;
  onNext: () => void;
  onTogglePin: () => void;
  isPinned: boolean;
}

export const CompactBar: React.FC<CompactBarProps> = ({
  track,
  onTogglePlay,
  onNext,
  onTogglePin,
  isPinned,
}) => {
  const progressPercent =
    track.duration > 0
      ? Math.min(100, Math.max(0, (track.position / track.duration) * 100))
      : 0;

  return (
    <div className="w-full h-full px-2.5 flex items-center justify-between select-none relative">
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
            text={track.title || 'No Track Playing'}
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
      <div className="app-no-drag flex items-center gap-1.5 shrink-0">
        {/* Play / Pause button */}
        <button
          onClick={onTogglePlay}
          title={track.isPlaying ? 'Pause' : 'Play'}
          className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 flex items-center justify-center p-0 text-white backdrop-blur-md transition-all shadow"
        >
          {track.isPlaying ? (
            <Pause size={11} className="fill-white stroke-none" />
          ) : (
            <Play size={11} className="fill-white stroke-none" />
          )}
        </button>

        {/* Next Track button */}
        <button
          onClick={onNext}
          title="Next Track"
          className="p-1 text-white hover:text-zinc-200 hover:scale-110 active:scale-90 transition-transform"
        >
          <SkipForward size={13} className="fill-white stroke-none" />
        </button>

        {/* Pin button */}
        <button
          onClick={onTogglePin}
          title="Window Pinned Down (Click to unpin and expand)"
          className={`p-1 rounded-md transition-all duration-200 ${
            isPinned
              ? 'text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 ring-1 ring-emerald-500/40 rotate-45'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Pin size={11} className="stroke-[2.2]" />
        </button>
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
