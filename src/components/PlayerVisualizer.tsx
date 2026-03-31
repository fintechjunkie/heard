'use client';

import { useRef, useCallback } from 'react';
import { Song } from '@/data/types';
import Waveform from './Waveform';

export type VizMode = 'waveform' | 'vinyl' | 'spectrum' | 'orb';
const VIZ_MODES: VizMode[] = ['waveform', 'vinyl', 'spectrum', 'orb'];
const VIZ_LABELS = ['Waveform', 'Vinyl', 'Spectrum', 'Orb'];

// Full class names for Tailwind detection
const SPECTRUM_CLASSES = [
  'animate-spectrum-1', 'animate-spectrum-2', 'animate-spectrum-3',
  'animate-spectrum-4', 'animate-spectrum-5', 'animate-spectrum-6',
];

interface PlayerVisualizerProps {
  song: Song;
  isPlaying: boolean;
  progress: number;
  onToggle: () => void;
  mode: VizMode;
  onModeChange: (mode: VizMode) => void;
}

export default function PlayerVisualizer({
  song, isPlaying, progress, onToggle, mode, onModeChange,
}: PlayerVisualizerProps) {
  const touchStartX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      const idx = VIZ_MODES.indexOf(mode);
      const next = delta < 0
        ? (idx + 1) % VIZ_MODES.length
        : (idx - 1 + VIZ_MODES.length) % VIZ_MODES.length;
      onModeChange(VIZ_MODES[next]);
    }
  }, [mode, onModeChange]);

  return (
    <div>
      {/* Visualizer area */}
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-xl"
        style={{ height: 160, background: 'rgba(0,0,0,0.3)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {mode === 'waveform' && (
          <div className="w-full px-4">
            <Waveform
              song={song}
              barCount={52}
              fillColor={song.color}
              baseColor="rgba(255,255,255,0.22)"
              height={80}
            />
          </div>
        )}

        {mode === 'vinyl' && (
          <VinylViz song={song} isPlaying={isPlaying} progress={progress} onToggle={onToggle} />
        )}

        {mode === 'spectrum' && (
          <SpectrumViz song={song} isPlaying={isPlaying} />
        )}

        {mode === 'orb' && (
          <OrbViz song={song} isPlaying={isPlaying} />
        )}
      </div>

      {/* Mode dots + labels */}
      <div className="flex items-center justify-center gap-[14px] mt-3">
        {VIZ_MODES.map((m, i) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className="flex flex-col items-center gap-[3px] cursor-pointer bg-transparent border-none"
          >
            <div
              className="w-[8px] h-[8px] rounded-full transition-all duration-200"
              style={{
                background: mode === m ? song.color : 'rgba(255,255,255,0.2)',
                boxShadow: mode === m ? `0 0 8px ${song.color}66` : 'none',
                transform: mode === m ? 'scale(1.3)' : 'scale(1)',
              }}
            />
            <span className="text-[6px] tracking-[0.5px] uppercase"
              style={{
                fontFamily: "'DM Mono', monospace",
                color: mode === m ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
              }}>
              {VIZ_LABELS[i]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Vinyl Visualization ── */
function VinylViz({ song, isPlaying, progress, onToggle }: {
  song: Song; isPlaying: boolean; progress: number; onToggle: () => void;
}) {
  const size = 140;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Vinyl disc */}
      <div
        className="absolute rounded-full"
        style={{
          width: size - 12,
          height: size - 12,
          background: `conic-gradient(
            #1a1a1a 0deg, #222 15deg, #1a1a1a 30deg, #222 45deg,
            #1a1a1a 60deg, #222 75deg, #1a1a1a 90deg, #222 105deg,
            #1a1a1a 120deg, #222 135deg, #1a1a1a 150deg, #222 165deg,
            #1a1a1a 180deg, #222 195deg, #1a1a1a 210deg, #222 225deg,
            #1a1a1a 240deg, #222 255deg, #1a1a1a 270deg, #222 285deg,
            #1a1a1a 300deg, #222 315deg, #1a1a1a 330deg, #222 345deg,
            #1a1a1a 360deg
          )`,
          animation: 'vinyl-spin 3s linear infinite',
          animationPlayState: isPlaying ? 'running' : 'paused',
        }}
      >
        {/* Center label */}
        <div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: song.color,
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="text-[16px] cursor-pointer bg-transparent border-none"
            style={{ color: '#000' }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>
      </div>

      {/* Progress ring */}
      <svg width={size} height={size} className="absolute" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke={song.color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }} />
      </svg>
    </div>
  );
}

/* ── Spectrum Visualization ── */
function SpectrumViz({ song, isPlaying }: { song: Song; isPlaying: boolean }) {
  const barCount = 24;
  return (
    <div className="flex items-end justify-center gap-[3px] px-4" style={{ height: 120 }}>
      {Array.from({ length: barCount }, (_, i) => {
        const cls = SPECTRUM_CLASSES[i % SPECTRUM_CLASSES.length];
        return (
          <div
            key={i}
            className={`rounded-[2px] ${isPlaying ? cls : ''}`}
            style={{
              width: 6,
              height: '100%',
              background: song.color,
              opacity: 0.6 + (i % 3) * 0.15,
              transformOrigin: 'bottom',
              transform: isPlaying ? undefined : `scaleY(${0.1 + Math.random() * 0.3})`,
              animationDelay: `${i * 0.05}s`,
              transition: 'transform 0.4s ease',
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Glowing Orb Visualization ── */
function OrbViz({ song, isPlaying }: { song: Song; isPlaying: boolean }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 140, overflow: 'hidden' }}>
      <div
        className={`absolute rounded-full ${isPlaying ? 'animate-orb-1' : ''}`}
        style={{
          width: 120, height: 120,
          background: `radial-gradient(circle, ${song.color}99, transparent)`,
          filter: 'blur(20px)',
          willChange: 'transform, opacity',
          opacity: isPlaying ? undefined : 0.3,
          transform: isPlaying ? undefined : 'scale(0.7)',
          transition: 'opacity 0.5s, transform 0.5s',
        }}
      />
      <div
        className={`absolute rounded-full ${isPlaying ? 'animate-orb-2' : ''}`}
        style={{
          width: 90, height: 90,
          top: 10, left: 20,
          background: `radial-gradient(circle, ${song.color}77, transparent)`,
          filter: 'blur(25px)',
          willChange: 'transform, opacity',
          opacity: isPlaying ? undefined : 0.2,
          transform: isPlaying ? undefined : 'scale(0.6)',
          transition: 'opacity 0.5s, transform 0.5s',
        }}
      />
      <div
        className={`absolute rounded-full ${isPlaying ? 'animate-orb-3' : ''}`}
        style={{
          width: 70, height: 70,
          bottom: 10, right: 15,
          background: `radial-gradient(circle, ${song.color}55, transparent)`,
          filter: 'blur(30px)',
          willChange: 'transform, opacity',
          opacity: isPlaying ? undefined : 0.15,
          transform: isPlaying ? undefined : 'scale(0.5)',
          transition: 'opacity 0.5s, transform 0.5s',
        }}
      />
    </div>
  );
}
