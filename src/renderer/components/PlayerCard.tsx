import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
} from 'lucide-react';
import { MarqueeText } from './MarqueeText';
import { TrackState } from '../../types/player';
import logoUrl from '../assets/logo.png';

interface PlayerCardProps {
  track: TrackState;
  isMinimal?: boolean;
  isShrunk?: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
  onToggleShuffle?: () => void;
  onToggleRepeat?: () => void;
}

function formatTime(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '0:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  track,
  isMinimal = false,
  isShrunk = false,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  onToggleShuffle,
  onToggleRepeat,
}) => {
  // Local smooth playback progress extrapolation
  const [localPos, setLocalPos] = useState(track.position);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPos, setScrubPos] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalPos(track.position);
  }, [track.position, track.title]);

  // Smoothly increment localPos every 200ms when playing
  useEffect(() => {
    if (!track.isPlaying || isScrubbing) return;

    const interval = setInterval(() => {
      setLocalPos((prev) => {
        const next = prev + 0.2;
        return track.duration > 0 && next > track.duration ? track.duration : next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [track.isPlaying, track.duration, isScrubbing]);

  const activePosition = isScrubbing ? scrubPos : localPos;
  const progressPercent =
    track.duration > 0
      ? Math.min(100, Math.max(0, (activePosition / track.duration) * 100))
      : 0;

  // Handle seeking / scrubbing via pointer capture
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.button !== 0 || !progressBarRef.current || track.duration <= 0) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    setIsScrubbing(true);
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSeconds = ratio * track.duration;
    setScrubPos(targetSeconds);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing || !progressBarRef.current || track.duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSeconds = ratio * track.duration;
    setScrubPos(targetSeconds);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (progressBarRef.current && track.duration > 0) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const finalSec = ratio * track.duration;
      setIsScrubbing(false);
      setLocalPos(finalSec);
      onSeek(finalSec);
    } else {
      setIsScrubbing(false);
    }
  };

  if (isMinimal) {
    return (
      <div
        className={`flex-1 flex items-center gap-2.5 px-3 select-none transition-all duration-300 ease-out ${
          isShrunk ? 'py-1.5' : 'pb-2 pt-0.5'
        }`}
      >
        {/* Left: Album Artwork (34px x 34px rounded) */}
        <div className="app-no-drag relative shrink-0">
          <div className="w-[34px] h-[34px] rounded-lg overflow-hidden shadow border border-white/15 bg-zinc-900/90 flex items-center justify-center">
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
              <img
                src={logoUrl}
                alt="Spotifly"
                className="w-5 h-auto object-contain opacity-50 animate-pulse"
              />
            )}
          </div>
        </div>

        {/* Right: Title - Artist and Elapsed Time only */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Flat Single Line: Title - Artist */}
          <MarqueeText
            className="text-[12px] leading-tight"
            text={`${track.title || 'Waiting for Spotify...'} - ${track.artist || 'Play a song to begin'}`}
          >
            <span className="text-white font-semibold">
              {track.title || 'Waiting for Spotify...'}
            </span>
            <span className="text-zinc-500 mx-1.5">-</span>
            <span className="text-zinc-300 font-normal">
              {track.artist || 'Play a song to begin'}
            </span>
          </MarqueeText>

          {/* Elapsed Time only (NO total duration, NO playback bar) */}
          <div className="flex items-center mt-1">
            <span className="text-[10px] font-mono text-zinc-400 font-medium tracking-tight leading-none">
              {formatTime(activePosition)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex flex-col px-3 select-none transition-all duration-300 ease-out ${
        isShrunk ? 'pt-1 pb-2 justify-between' : 'pt-0.5 pb-2 justify-between'
      }`}
    >
      {/* Middle Row: Album Artwork + Track Info & Controls */}
      <div className="flex items-center gap-3 mt-0.5">
        {/* Left: Album Artwork */}
        <div className="app-no-drag relative shrink-0 group/cover">
          <div
            className={`rounded-xl overflow-hidden shadow-lg border border-white/15 bg-zinc-900/90 flex items-center justify-center transition-all duration-300 ease-out ${
              isShrunk ? 'w-[42px] h-[42px]' : 'w-[56px] h-[56px]'
            }`}
          >
            {track.artworkUrl ? (
              <img
                src={track.artworkUrl}
                alt={`${track.title} cover`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover/cover:scale-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-2">
                <img
                  src={logoUrl}
                  alt="Spotifly"
                  className={`h-auto object-contain opacity-60 animate-pulse transition-all duration-300 ${
                    isShrunk ? 'w-6' : 'w-8'
                  }`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Metadata + Controls Row */}
        <div
          className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ease-out ${
            isShrunk ? 'h-[42px] justify-center' : 'h-[56px] justify-between'
          }`}
        >
          {/* Track Title & Artist */}
          <div className="min-w-0">
            <MarqueeText
              text={track.title || 'Waiting for Spotify...'}
              className={`font-bold text-white tracking-tight leading-tight transition-all duration-300 ${
                isShrunk ? 'text-[13px]' : 'text-[14px]'
              }`}
            />
            <p
              className="text-[11px] text-zinc-300/80 font-normal truncate leading-tight mt-0.5"
              title={track.artist}
            >
              {track.artist || 'Play a song to begin'}
            </p>
          </div>

          {/* Media Control Action Buttons (Smoothly disappear when shrunk) */}
          <div
            className={`app-no-drag flex items-center justify-center gap-3.5 transition-all duration-300 ease-out ${
              isShrunk
                ? 'max-h-0 opacity-0 overflow-hidden pointer-events-none -mt-0 py-0'
                : 'max-h-8 opacity-100 -mt-0.5'
            }`}
          >
            {/* Shuffle */}
            <button
              onClick={onToggleShuffle}
              title={`Shuffle: ${track.isShuffle ? 'On' : 'Off'}`}
              className={`p-1 transition-colors ${
                track.isShuffle
                  ? 'text-[#1DB954] hover:text-[#1ed760]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shuffle size={13} className="stroke-[2.2]" />
            </button>

            {/* Skip Previous */}
            <button
              onClick={onPrevious}
              title="Previous Track"
              className="p-1 text-white hover:text-zinc-200 hover:scale-110 active:scale-90 transition-transform"
            >
              <SkipBack size={17} className="fill-white stroke-none" />
            </button>

            {/* Play / Pause (Glass pill button) */}
            <button
              onClick={onTogglePlay}
              title={track.isPlaying ? 'Pause' : 'Play'}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 flex items-center justify-center p-0 text-white backdrop-blur-md transition-all shadow-md hover:shadow-lg"
            >
              {track.isPlaying ? (
                <Pause size={15} className="fill-white stroke-none" />
              ) : (
                <Play size={15} className="fill-white stroke-none" />
              )}
            </button>

            {/* Skip Next */}
            <button
              onClick={onNext}
              title="Next Track"
              className="p-1 text-white hover:text-zinc-200 hover:scale-110 active:scale-90 transition-transform"
            >
              <SkipForward size={17} className="fill-white stroke-none" />
            </button>

            {/* Repeat */}
            <button
              onClick={onToggleRepeat}
              title={`Repeat: ${track.repeatMode}`}
              className={`p-1 transition-colors ${
                track.repeatMode !== 'off'
                  ? 'text-[#1DB954] hover:text-[#1ed760]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {track.repeatMode === 'track' ? (
                <Repeat1 size={13} className="stroke-[2.2]" />
              ) : (
                <Repeat size={13} className="stroke-[2.2]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Timestamps + Glowing Progress Bar (Kept intact and fully visible) */}
      <div
        className={`w-full transition-all duration-300 ease-out ${
          isShrunk ? 'mt-1' : 'mt-2'
        }`}
      >
        {/* Timestamp labels */}
        <div
          className={`flex items-center justify-between text-[10px] text-zinc-400 font-mono tracking-tight px-0.5 leading-none transition-all duration-300 ${
            isShrunk ? 'mb-1' : 'mb-1'
          }`}
        >
          <span>{formatTime(activePosition)}</span>
          <span>{formatTime(track.duration)}</span>
        </div>

        {/* Glowing Spotify Progress Bar with Scrubber */}
        <div
          ref={progressBarRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="app-no-drag group/bar relative w-full py-1 cursor-pointer flex items-center select-none"
        >
          {/* Background Track */}
          <div className="w-full h-1 group-hover/bar:h-1.5 bg-white/20 rounded-full transition-all duration-150 relative">
            {/* Filled Bar */}
            <div
              className="h-full bg-[#1DB954] rounded-full relative"
              style={{
                width: `${progressPercent}%`,
                boxShadow: '0 0 10px rgba(29, 185, 84, 0.8)',
              }}
            />
            {/* Scrubber Thumb */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3 h-3 bg-white rounded-full shadow-lg transition-opacity duration-150 pointer-events-none ${
                isScrubbing ? 'opacity-100 scale-110' : 'opacity-0 group-hover/bar:opacity-100'
              }`}
              style={{
                left: `${progressPercent}%`,
                boxShadow: '0 0 6px rgba(0, 0, 0, 0.5), 0 0 8px rgba(29, 185, 84, 0.6)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
