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
  hidePlayButton?: boolean;
}

export default function Waveform({
  song,
  barCount = 44,
  fillColor,
  baseColor,
  height = 32,
  onClick,
  hidePlayButton = false,
}: WaveformProps) {
  const { activeSong, isPlaying, progress, seek, toggle, playSong } = usePlayer();
  const isActive = activeSong?.id === song.id && song.id != null;
  const isThisPlaying = isActive && isPlaying;
  const currentProgress = isActive ? progress : 0;

  const defaultFillColor = fillColor || 'var(--sky)';
  const defaultBaseColor = baseColor || (isActive ? 'rgba(255,255,255,0.2)' : 'rgba(140,135,120,0.25)');

  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      toggle(song);
    } else {
      playSong(song);
    }
    onClick?.();
  }, [isActive, toggle, playSong, song, onClick]);

  const handleBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    const clampedPercent = Math.max(0, Math.min(100, percent));

    if (isActive) {
      seek(clampedPercent);
      if (!isPlaying) {
        toggle(song);
      }
    } else {
      playSong(song, clampedPercent);
    }
    onClick?.();
  }, [isActive, isPlaying, seek, toggle, playSong, song, onClick]);

  const btnSize = Math.max(28, height);

  return (
    <div className="relative flex items-center gap-[10px]" style={{ minHeight: btnSize }}>
      {/* Play/Pause button */}
      {!hidePlayButton && (
        <button
          onClick={handlePlayPause}
          className={`flex-shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 ${
            isThisPlaying ? 'animate-pulse-glow border-none' : ''
          }`}
          style={{
            width: btnSize,
            height: btnSize,
            background: isThisPlaying
              ? 'var(--acid)'
              : isActive
                ? 'var(--b3)'
                : 'transparent',
            border: isThisPlaying
              ? 'none'
              : isActive
                ? '1px solid var(--b4)'
                : '1.5px solid var(--border)',
            color: isThisPlaying
              ? 'var(--black)'
              : isActive
                ? 'var(--th-white)'
                : 'var(--muted)',
            fontSize: btnSize * 0.34,
          }}
        >
          {isThisPlaying ? '⏸' : '▶'}
        </button>
      )}

      {/* Waveform bars */}
      <div
        className="flex-1 flex items-end gap-[1.5px] cursor-pointer"
        style={{ height }}
        onClick={handleBarClick}
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
    </div>
  );
}
