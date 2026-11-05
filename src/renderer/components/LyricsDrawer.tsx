import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Mic2, ChevronUp, Music, Loader2 } from 'lucide-react';
import { TrackState } from '../../types/player';
import { fetchLyrics, LyricsData } from '../services/lyricsService';

interface LyricsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  track: TrackState;
  onSeek: (seconds: number) => void;
}

function formatLyricTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const LyricsDrawer: React.FC<LyricsDrawerProps> = ({
  isOpen,
  onClose,
  track,
  onSeek,
}) => {
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Fetch lyrics when track changes or drawer opens
  useEffect(() => {
    if (!isOpen || !track.hasMedia || !track.title) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetchLyrics(track.artist, track.title, track.duration)
      .then((data) => {
        if (isMounted) {
          setLyricsData(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLyricsData(null);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, track.title, track.artist, track.duration, track.hasMedia]);

  // Find active line index based on playback position
  const activeIndex = useMemo(() => {
    if (!lyricsData || !lyricsData.isSynced || lyricsData.lines.length === 0) {
      return -1;
    }

    const currentPos = track.position;
    // Find last line that started before or at current position
    let index = -1;
    for (let i = 0; i < lyricsData.lines.length; i++) {
      if (lyricsData.lines[i].time <= currentPos + 0.15) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [lyricsData, track.position]);

  // Smoothly scroll active line to center
  useEffect(() => {
    if (activeLineRef.current && listContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div className="app-no-drag scrollable-area flex flex-col h-[210px] w-full border-t border-white/10 bg-black/60 backdrop-blur-xl transition-all duration-300 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-1.5">
          <Mic2 size={13} className="text-[#1DB954]" />
          <span className="text-[11px] font-semibold text-white tracking-wide">
            Synced Lyrics
          </span>
          {lyricsData?.isSynced && (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#1DB954]/20 text-[#1DB954] font-medium border border-[#1DB954]/30">
              SYNCED
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          title="Collapse Lyrics"
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronUp size={14} />
        </button>
      </div>

      {/* Lyrics Content Container */}
      <div
        ref={listContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 text-center scrollbar-none"
        style={{ scrollBehavior: 'smooth' }}
      >
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-400 py-8">
            <Loader2 size={18} className="animate-spin text-[#1DB954]" />
            <span className="text-[11px]">Finding synced lyrics...</span>
          </div>
        ) : !lyricsData || lyricsData.lines.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-1.5 text-zinc-400 py-8">
            <Music size={20} className="text-zinc-500 mb-1" />
            <span className="text-[11px] font-medium text-zinc-300">
              No synced lyrics available
            </span>
            <span className="text-[10px] text-zinc-500">
              Enjoy the music!
            </span>
          </div>
        ) : (
          lyricsData.lines.map((line, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={`${idx}-${line.time}`}
                ref={isActive ? activeLineRef : null}
                onClick={() => {
                  if (lyricsData.isSynced && line.time >= 0) {
                    onSeek(line.time);
                  }
                }}
                className={`group cursor-pointer transition-all duration-200 py-0.5 px-2 rounded-lg ${
                  isActive
                    ? 'text-white font-bold text-[13px] scale-105 bg-white/5 shadow-sm'
                    : 'text-zinc-400/80 hover:text-zinc-200 text-[11px] font-normal hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={
                      isActive
                        ? 'text-[#1DB954] drop-shadow-[0_0_8px_rgba(29,185,84,0.7)]'
                        : ''
                    }
                  >
                    {line.text || '♪'}
                  </span>
                  {lyricsData.isSynced && line.time > 0 && (
                    <span className="text-[9px] font-mono text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatLyricTime(line.time)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
