'use client';

import { useMemo } from 'react';

interface SongArtProps {
  songId: number;
  bpm: number;
  songKey: string;
  color: string;
  mood: string[];
  height?: number;
}

// Generate deterministic pseudo-random from seed
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Map musical key to a hue offset
function keyToHue(key: string): number {
  const map: Record<string, number> = {
    'C': 0, 'C#': 30, 'Db': 30, 'D': 60, 'D#': 90, 'Eb': 90,
    'E': 120, 'F': 150, 'F#': 180, 'Gb': 180, 'G': 210,
    'G#': 240, 'Ab': 240, 'A': 270, 'A#': 300, 'Bb': 300, 'B': 330,
  };
  const root = key.split(' ')[0];
  return map[root] || 0;
}

export default function SongArt({ songId, bpm, songKey, color, mood, height = 200 }: SongArtProps) {
  const shapes = useMemo(() => {
    const rng = seededRandom(songId * 7919 + bpm * 31);
    const hueOffset = keyToHue(songKey);
    const density = Math.floor(bpm / 20) + 3; // More shapes for faster BPMs

    // Parse the hex color
    const r = parseInt(color.slice(1, 3), 16) || 200;
    const g = parseInt(color.slice(3, 5), 16) || 180;
    const b = parseInt(color.slice(5, 7), 16) || 100;

    // Mood affects style
    const hasMood = (m: string) => mood.some(mo => mo.toLowerCase().includes(m));
    const isEnergetic = hasMood('energy') || hasMood('uptempo') || hasMood('dance') || bpm > 120;
    const isMoody = hasMood('dark') || hasMood('moody') || hasMood('chill') || hasMood('intimate');

    const elements: {
      type: 'circle' | 'ring' | 'line' | 'blob';
      x: number;
      y: number;
      size: number;
      rotation: number;
      opacity: number;
      color: string;
      blur: number;
    }[] = [];

    for (let i = 0; i < density + 4; i++) {
      const type = ['circle', 'ring', 'line', 'blob'][Math.floor(rng() * 4)] as 'circle' | 'ring' | 'line' | 'blob';
      const hue = (hueOffset + rng() * 60 - 30 + 360) % 360;
      const sat = isMoody ? 40 + rng() * 30 : 60 + rng() * 40;
      const lit = isMoody ? 30 + rng() * 25 : 45 + rng() * 35;

      elements.push({
        type,
        x: rng() * 100,
        y: rng() * 100,
        size: (isEnergetic ? 10 : 15) + rng() * (isEnergetic ? 30 : 40),
        rotation: rng() * 360,
        opacity: 0.3 + rng() * 0.5,
        color: `hsl(${hue}, ${sat}%, ${lit}%)`,
        blur: rng() * 4,
      });
    }

    // Add accent elements using the song's actual color
    for (let i = 0; i < 3; i++) {
      elements.push({
        type: i === 0 ? 'blob' : 'circle',
        x: 20 + rng() * 60,
        y: 20 + rng() * 60,
        size: 20 + rng() * 35,
        rotation: rng() * 360,
        opacity: 0.4 + rng() * 0.3,
        color: `rgba(${r}, ${g}, ${b}, 1)`,
        blur: 2 + rng() * 6,
      });
    }

    return elements;
  }, [songId, bpm, songKey, color, mood]);

  return (
    <div className="relative overflow-hidden rounded-xl" style={{ height, background: '#0a0a0f' }}>
      {shapes.map((s, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.type === 'line' ? s.size * 0.15 : s.size,
            borderRadius: s.type === 'blob' ? '40% 60% 55% 45%' : s.type === 'ring' ? '50%' : s.type === 'line' ? '4px' : '50%',
            background: s.type === 'ring' ? 'transparent' : s.color,
            border: s.type === 'ring' ? `2px solid ${s.color}` : 'none',
            opacity: s.opacity,
            filter: `blur(${s.blur}px)`,
            transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
          }}
        />
      ))}
      {/* Subtle noise overlay */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.03) 0%, transparent 70%)',
      }} />
    </div>
  );
}
