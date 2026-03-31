'use client';

import { useMemo } from 'react';

interface SongArtProps {
  songId: number;
  bpm: number;
  songKey: string;
  color: string;
  mood: string[];
  height?: number;
  bannerUrl?: string;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function keyToHue(key: string): number {
  const map: Record<string, number> = {
    'C': 0, 'C#': 30, 'Db': 30, 'D': 60, 'D#': 90, 'Eb': 90,
    'E': 120, 'F': 150, 'F#': 180, 'Gb': 180, 'G': 210,
    'G#': 240, 'Ab': 240, 'A': 270, 'A#': 300, 'Bb': 300, 'B': 330,
  };
  const root = key.split(' ')[0];
  return map[root] || 0;
}

export default function SongArt({ songId, bpm, songKey, color, mood, height = 160, bannerUrl }: SongArtProps) {
  // If a banner image is uploaded, use it
  if (bannerUrl) {
    return (
      <div className="relative overflow-hidden" style={{ height }}>
        <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 right-0 h-[40px]"
          style={{ background: 'linear-gradient(to bottom, transparent, #F2EDE3)' }} />
      </div>
    );
  }

  return <GeneratedArt songId={songId} bpm={bpm} songKey={songKey} color={color} mood={mood} height={height} />;
}

function GeneratedArt({ songId, bpm, songKey, color, mood, height }: Omit<SongArtProps, 'bannerUrl'>) {
  const gradients = useMemo(() => {
    const rng = seededRandom(songId * 7919 + bpm * 31);
    const hueOffset = keyToHue(songKey);

    const r = parseInt(color.slice(1, 3), 16) || 200;
    const g = parseInt(color.slice(3, 5), 16) || 180;
    const b = parseInt(color.slice(5, 7), 16) || 100;

    const hasMood = (m: string) => mood.some(mo => mo.toLowerCase().includes(m));
    const isEnergetic = hasMood('energy') || hasMood('uptempo') || hasMood('dance') || bpm > 120;

    // Generate 3-5 colorful gradient layers
    const layerCount = isEnergetic ? 5 : 3;
    const layers: {
      gradient: string;
      x: number;
      y: number;
      scale: number;
      opacity: number;
    }[] = [];

    // Base warm background
    const baseHue = (hueOffset + 20) % 360;

    for (let i = 0; i < layerCount; i++) {
      const hue1 = (hueOffset + rng() * 80 - 40 + 360) % 360;
      const hue2 = (hue1 + 40 + rng() * 60) % 360;
      const sat1 = 65 + rng() * 30;
      const sat2 = 55 + rng() * 35;
      const lit1 = 55 + rng() * 20;
      const lit2 = 50 + rng() * 25;

      layers.push({
        gradient: `radial-gradient(ellipse at ${30 + rng() * 40}% ${20 + rng() * 60}%, hsl(${hue1}, ${sat1}%, ${lit1}%) 0%, hsl(${hue2}, ${sat2}%, ${lit2}%) 45%, transparent 75%)`,
        x: -20 + rng() * 40,
        y: -20 + rng() * 40,
        scale: 0.8 + rng() * 0.6,
        opacity: 0.5 + rng() * 0.4,
      });
    }

    // Add the song's actual color as a prominent layer
    layers.push({
      gradient: `radial-gradient(ellipse at ${40 + rng() * 20}% ${30 + rng() * 40}%, rgba(${r},${g},${b},0.8) 0%, rgba(${r},${g},${b},0.3) 40%, transparent 70%)`,
      x: 0,
      y: 0,
      scale: 1.2,
      opacity: 0.7,
    });

    return { layers, baseHue };
  }, [songId, bpm, songKey, color, mood]);

  return (
    <div className="relative overflow-hidden" style={{ height }}>
      {/* Warm base */}
      <div className="absolute inset-0" style={{
        background: `linear-gradient(135deg, hsl(${gradients.baseHue}, 40%, 85%) 0%, hsl(${(gradients.baseHue + 30) % 360}, 35%, 80%) 50%, hsl(${(gradients.baseHue + 60) % 360}, 30%, 82%) 100%)`,
      }} />

      {/* Colorful gradient layers */}
      {gradients.layers.map((layer, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            background: layer.gradient,
            opacity: layer.opacity,
            transform: `translate(${layer.x}%, ${layer.y}%) scale(${layer.scale})`,
          }}
        />
      ))}

      {/* Subtle wave pattern overlay */}
      <div className="absolute inset-0" style={{
        background: `repeating-linear-gradient(${45 + (songId % 90)}deg, transparent, transparent 8px, rgba(255,255,255,0.06) 8px, rgba(255,255,255,0.06) 9px)`,
      }} />

      {/* Bottom fade to cream */}
      <div className="absolute bottom-0 left-0 right-0 h-[50px]"
        style={{ background: 'linear-gradient(to bottom, transparent, #F2EDE3)' }} />
    </div>
  );
}
