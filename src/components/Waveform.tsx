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
  const { activeSong, isPlaying, progress, seek, toggle, playSong, previewMode, currentTime, duration } = usePlayer();
  const isActive = activeSong?.id === song.id && song.id != null;
  const isThisPlaying = isActive && isPlaying;

  // In preview mode, map 0-20s to 0-100% so the full waveform fills in 20 seconds
  const currentProgress = isActive
    ? (previewMode && duration > 0 ? Math.min(100, (currentTime / 20) * 100) : progress)
    : 0;

  const defaultFillColor = fillColor || 'var(--sky)';
  const defaultBaseColor = baseColor || (isActive ? 'rgba(255,255,255,0.2)' : 'rgba(140,135,120,0.25)');

  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      // If preview ended (at or past 20s in preview mode), restart from beginning
      if (previewMode && currentTime >= 19.5 && !isPlaying) {
        playSong(song);
      } else {
        toggle(song);
      }
    } else {
      playSong(song);
    }
    onClick?.();
  }, [isActive, isPlaying, previewMode, currentTime, toggle, playSong, song, onClick]);

  const handleBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    let clampedPercent = Math.max(0, Math.min(100, percent));

    // In preview mode, clicking the bar maps to 0-20s range
    if (previewMode && duration > 0) {
      const seekSeconds = (clampedPercent / 100) * 20;
      clampedPercent = (seekSeconds / duration) * 100;
    }

    if (isActive) {
      // If preview ended, restart from clicked position
      if (previewMode && currentTime >= 19.5 && !isPlaying) {
        playSong(song, clampedPercent);
      } else {
        seek(clampedPercent);
        if (!isPlaying) {
          toggle(song);
        }
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
