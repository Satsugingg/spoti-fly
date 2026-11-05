import React from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';

interface VolumeHudProps {
  visible: boolean;
  percent: number;
  target: 'spotify' | 'system';
}

export const VolumeHud: React.FC<VolumeHudProps> = ({
  visible,
  percent,
  target,
}) => {
  const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)));

  const VolumeIcon =
    clampedPercent === 0 ? VolumeX : clampedPercent < 50 ? Volume1 : Volume2;

  return (
    <div
      className={`pointer-events-none absolute inset-x-6 top-7 z-40 rounded-xl bg-zinc-950/90 border border-white/15 backdrop-blur-2xl px-3 py-2 shadow-2xl transition-all duration-200 select-none ${
        visible
          ? 'opacity-100 scale-100 translate-y-0'
          : 'opacity-0 scale-95 -translate-y-2'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <VolumeIcon size={13} className="text-[#1DB954]" />
          <span className="text-[10px] font-semibold text-zinc-200 uppercase tracking-wider">
            {target === 'system' ? 'Windows Volume' : 'Spotify Volume'}
          </span>
        </div>
        <span className="text-[11px] font-mono font-bold text-white">
          {clampedPercent}%
        </span>
      </div>

      {/* Mini volume progress bar */}
      <div className="w-full h-1 bg-white/15 rounded-full mt-1.5 overflow-hidden">
        <div
          className="h-full bg-[#1DB954] rounded-full transition-all duration-100"
          style={{
            width: `${clampedPercent}%`,
            boxShadow: '0 0 8px rgba(29, 185, 84, 0.8)',
          }}
        />
      </div>
    </div>
  );
};
