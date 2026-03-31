'use client';

import { useRef, useCallback } from 'react';
import { Song } from '@/data/types';
import Waveform from './Waveform';

export type VizMode = 'waveform' | 'vinyl' | 'spectrum' | 'kaleidoscope';
const VIZ_MODES: VizMode[] = ['waveform', 'vinyl', 'spectrum', 'kaleidoscope'];
const VIZ_LABELS = ['Waveform', 'Vinyl', 'Spectrum', 'Prism'];

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
  themeColor?: string; // override color from mood theme
}

export default function PlayerVisualizer({
  song, isPlaying, progress, onToggle, mode, onModeChange, themeColor,
}: PlayerVisualizerProps) {
  const touchStartX = useRef(0);
  const color = themeColor || song.color;

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
        className="relative flex items-center justify-center overflow-hidden rounded-2xl"
        style={{
          height: 180,
          background: `radial-gradient(ellipse at center, ${color}18 0%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.7) 100%)`,
          border: `1px solid ${color}22`,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Ambient glow behind all modes */}
        {isPlaying && (
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `radial-gradient(circle at 50% 50%, ${color}15 0%, transparent 60%)`,
            animation: 'splash-breathe 3s ease-in-out infinite',
          }} />
        )}

        {mode === 'waveform' && (
          <div className="w-full px-4">
            <Waveform song={song} barCount={52} fillColor={color} baseColor="rgba(255,255,255,0.15)" height={90} />
          </div>
        )}

        {mode === 'vinyl' && (
          <VinylViz color={color} title={song.title} isPlaying={isPlaying} progress={progress} onToggle={onToggle} />
        )}

        {mode === 'spectrum' && (
          <SpectrumViz color={color} isPlaying={isPlaying} />
        )}

        {mode === 'kaleidoscope' && (
          <KaleidoscopeViz color={color} isPlaying={isPlaying} progress={progress} />
        )}
      </div>

      {/* Mode selector */}
      <div className="flex items-center justify-center gap-[16px] mt-3">
        {VIZ_MODES.map((m, i) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className="flex flex-col items-center gap-[3px] cursor-pointer bg-transparent border-none"
          >
            <div
              className="rounded-full transition-all duration-300"
              style={{
                width: mode === m ? 10 : 6,
                height: mode === m ? 10 : 6,
                background: mode === m ? color : 'rgba(255,255,255,0.2)',
                boxShadow: mode === m ? `0 0 10px ${color}88, 0 0 20px ${color}44` : 'none',
              }}
            />
            <span className="text-[6px] tracking-[0.5px] uppercase"
              style={{
                fontFamily: "'DM Mono', monospace",
                color: mode === m ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
              }}>
              {VIZ_LABELS[i]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Vinyl ── */
function VinylViz({ color, title, isPlaying, progress, onToggle }: {
  color: string; title: string; isPlaying: boolean; progress: number; onToggle: () => void;
}) {
  const size = 150;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer glow */}
      {isPlaying && (
        <div className="absolute rounded-full" style={{
          width: size + 20, height: size + 20,
          background: `radial-gradient(circle, ${color}22, transparent 70%)`,
          filter: 'blur(10px)',
          animation: 'splash-breathe 2s ease-in-out infinite',
        }} />
      )}

      {/* Vinyl disc */}
      <div
        className="absolute rounded-full"
        style={{
          width: size - 14,
          height: size - 14,
          background: `conic-gradient(
            #1a1a1a 0deg, #282828 10deg, #1a1a1a 20deg, #252525 30deg,
            #1a1a1a 40deg, #282828 50deg, #1a1a1a 60deg, #252525 70deg,
            #1a1a1a 80deg, #282828 90deg, #1a1a1a 100deg, #252525 110deg,
            #1a1a1a 120deg, #282828 130deg, #1a1a1a 140deg, #252525 150deg,
            #1a1a1a 160deg, #282828 170deg, #1a1a1a 180deg, #252525 190deg,
            #1a1a1a 200deg, #282828 210deg, #1a1a1a 220deg, #252525 230deg,
            #1a1a1a 240deg, #282828 250deg, #1a1a1a 260deg, #252525 270deg,
            #1a1a1a 280deg, #282828 290deg, #1a1a1a 300deg, #252525 310deg,
            #1a1a1a 320deg, #282828 330deg, #1a1a1a 340deg, #252525 350deg,
            #1a1a1a 360deg
          )`,
          boxShadow: `inset 0 0 30px rgba(0,0,0,0.5), 0 0 ${isPlaying ? '15' : '5'}px ${color}33`,
          animation: 'vinyl-spin 2.5s linear infinite',
          animationPlayState: isPlaying ? 'running' : 'paused',
        }}
      >
        {/* Inner ring */}
        <div className="absolute rounded-full" style={{
          width: 80, height: 80, top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          border: `1px solid ${color}44`,
        }} />
        {/* Center label */}
        <div className="absolute rounded-full flex flex-col items-center justify-center"
          style={{
            width: 52, height: 52, top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: `linear-gradient(135deg, ${color}, ${color}aa)`,
            boxShadow: `0 0 12px ${color}55`,
          }}>
          <button onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="text-[18px] cursor-pointer bg-transparent border-none" style={{ color: '#000' }}>
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>
      </div>

      {/* Progress ring */}
      <svg width={size} height={size} className="absolute" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease', filter: `drop-shadow(0 0 4px ${color}88)` }} />
      </svg>
    </div>
  );
}

/* ── Spectrum ── */
function SpectrumViz({ color, isPlaying }: { color: string; isPlaying: boolean }) {
  const barCount = 32;
  return (
    <div className="flex items-end justify-center gap-[2px] px-3" style={{ height: 140 }}>
      {Array.from({ length: barCount }, (_, i) => {
        const cls = SPECTRUM_CLASSES[i % SPECTRUM_CLASSES.length];
        // Create a gradient effect across bars
        const hueShift = (i / barCount) * 40 - 20;
        return (
          <div
            key={i}
            className={`rounded-[2px] ${isPlaying ? cls : ''}`}
            style={{
              width: 5,
              height: '100%',
              background: `linear-gradient(to top, ${color}dd, ${color}44)`,
              filter: `hue-rotate(${hueShift}deg)`,
              opacity: 0.5 + (Math.sin(i * 0.5) * 0.3 + 0.3),
              transformOrigin: 'bottom',
              transform: isPlaying ? undefined : `scaleY(${0.05 + Math.sin(i * 0.8) * 0.15})`,
              animationDelay: `${i * 0.04}s`,
              transition: 'transform 0.4s ease',
              boxShadow: isPlaying ? `0 0 4px ${color}33` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Kaleidoscope / Prism ── */
function KaleidoscopeViz({ color, isPlaying, progress }: { color: string; isPlaying: boolean; progress: number }) {
  // Multi-colored rotating rings with shifting hues
  const rings = [
    { size: 150, blur: 8, hue: 0, speed: '4s', dir: 'normal' },
    { size: 120, blur: 12, hue: 60, speed: '5.5s', dir: 'reverse' },
    { size: 90, blur: 6, hue: 120, speed: '3.5s', dir: 'normal' },
    { size: 60, blur: 10, hue: 180, speed: '6s', dir: 'reverse' },
    { size: 35, blur: 4, hue: 240, speed: '2.8s', dir: 'normal' },
  ];

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 160, overflow: 'hidden' }}>
      {rings.map((ring, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: ring.size,
            height: ring.size,
            background: `conic-gradient(
              from ${progress * 3.6 + ring.hue}deg,
              #FF6848cc,
              #FFB830cc,
              #C8FF45cc,
              #5AB4FFcc,
              #B57BFFcc,
              #FF6BAAdd,
              #FF6848cc
            )`,
            filter: `blur(${ring.blur}px) hue-rotate(${ring.hue + (isPlaying ? 0 : 0)}deg)`,
            opacity: isPlaying ? 0.7 - i * 0.08 : 0.15,
            animation: isPlaying ? `vinyl-spin ${ring.speed} linear infinite` : 'none',
            animationDirection: ring.dir,
            transform: isPlaying ? undefined : `scale(${0.4 + i * 0.05})`,
            transition: 'opacity 0.6s, transform 0.6s',
            willChange: 'transform, opacity',
            mixBlendMode: i > 0 ? 'screen' : undefined,
          }}
        />
      ))}
      {/* Center crystal */}
      <div
        className="absolute rounded-full"
        style={{
          width: 24,
          height: 24,
          background: `conic-gradient(from ${progress * 7.2}deg, ${color}, #FF6848, #FFB830, #C8FF45, #5AB4FF, #B57BFF, ${color})`,
          opacity: isPlaying ? 1 : 0.3,
          boxShadow: isPlaying
            ? `0 0 15px ${color}88, 0 0 30px rgba(200,255,69,0.3), 0 0 45px rgba(90,180,255,0.2)`
            : 'none',
          transition: 'opacity 0.6s, box-shadow 0.6s',
        }}
      />
      {/* Progress ring */}
      <svg width={160} height={160} className="absolute" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={80} cy={80} r={76}
          fill="none"
          stroke="url(#prism-gradient)"
          strokeWidth={2}
          strokeDasharray={2 * Math.PI * 76}
          strokeDashoffset={2 * Math.PI * 76 * (1 - progress / 100)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
        <defs>
          <linearGradient id="prism-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6848" />
            <stop offset="25%" stopColor="#FFB830" />
            <stop offset="50%" stopColor="#C8FF45" />
            <stop offset="75%" stopColor="#5AB4FF" />
            <stop offset="100%" stopColor="#B57BFF" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
