'use client';

import { usePlayer } from '@/lib/player';
import { Song } from '@/data/types';

function getBarHeight(index: number, songId: number): number {
  return Math.min(98, 22 + Math.abs(Math.sin((index + songId * 97) * 0.72) * 46 + Math.cos((index + songId * 53) * 1.4) * 22));
}

interface WaveformProps {
  song: Song;
  barCount?: number;
  fillColor?: string;
  baseColor?: string;
  height?: number;
  onClick?: () => void;
}

export default function Waveform({
  song,
  barCount = 44,
  fillColor,
  baseColor,
  height = 32,
  onClick,
}: WaveformProps) {
  const { activeSong, isPlaying, progress } = usePlayer();
  const isActive = activeSong?.id === song.id;
  const currentProgress = isActive ? progress : 0;

  const defaultFillColor = fillColor || 'var(--sky)';
  const defaultBaseColor = baseColor || (isActive ? 'rgba(255,255,255,0.2)' : 'rgba(140,135,120,0.25)');

  return (
    <div
      className="flex items-end gap-[1.5px] cursor-pointer"
      style={{ height }}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      {Array.from({ length: barCount }, (_, i) => {
        const pct = getBarHeight(i, song.id);
        const isPlayed = i < Math.floor(barCount * (currentProgress / 100));
        return (
          <div
            key={i}
            className="flex-1 rounded-[2px] transition-colors duration-100"
            style={{
              height: `${pct}%`,
              background: isPlayed ? defaultFillColor : defaultBaseColor,
            }}
          />
        );
      })}
    </div>
  );
}
