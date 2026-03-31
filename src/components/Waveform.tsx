'use client';

import { usePlayer } from '@/lib/player';
import { Song } from '@/data/types';
import { useCallback } from 'react';

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
  const { activeSong, isPlaying, progress, seek, toggle, playSong } = usePlayer();
  const isActive = activeSong?.id === song.id;
  const currentProgress = isActive ? progress : 0;

  const defaultFillColor = fillColor || 'var(--sky)';
  const defaultBaseColor = baseColor || (isActive ? 'rgba(255,255,255,0.2)' : 'rgba(140,135,120,0.25)');

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();

    // Calculate click position as percentage
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    const clampedPercent = Math.max(0, Math.min(100, percent));

    if (isActive) {
      // Song is already loaded — just seek
      seek(clampedPercent);
      // If paused, also resume playback
      if (!isPlaying) {
        toggle(song);
      }
    } else {
      // Different song — play it starting at the clicked position
      playSong(song, clampedPercent);
    }

    // Still call onClick for any additional consumer behavior
    onClick?.();
  }, [isActive, isPlaying, seek, toggle, playSong, song, onClick]);

  return (
    <div
      className="flex items-end gap-[1.5px] cursor-pointer"
      style={{ height }}
      onClick={handleClick}
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
