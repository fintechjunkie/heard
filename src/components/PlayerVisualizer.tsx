'use client';

import { useRef, useEffect, useCallback, type ReactNode } from 'react';
import { Song } from '@/data/types';
import { usePlayer } from '@/lib/player';
import CompositionArc from './CompositionArc';
import type { SongAnalysis } from '@/data/analysis';

export type VizMode = 'aurora' | 'composition';
const ALL_VIZ_MODES: VizMode[] = ['aurora', 'composition'];
const VIZ_LABEL: Record<VizMode, string> = { aurora: 'Player', composition: 'Composition' };

/** Seconds for the palette to travel a full turn of the colour wheel. */
const COLOR_CYCLE_SECONDS = 90;

/** #rrggbb → [h, s, l], h in degrees. */
function hexToHsl(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return [0, 0, 60];
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, sat * 100, l * 100];
}

function hslToHex(h: number, sPct: number, lPct: number): string {
  const sat = sPct / 100;
  const l = lPct / 100;
  const k = (n: number) => (n + ((h % 360) + 360) / 30) % 12;
  const a = sat * Math.min(l, 1 - l);
  const f = (n: number) => {
    const v = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * v).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * The palette drifts around the wheel from the song's anchor colour rather
 * than being picked by hand — the theme chips it replaces cost more room in
 * the Crate than the choice was worth.
 */
function rotateHue(hex: string, degrees: number): string {
  const [h, sat, l] = hexToHsl(hex);
  return hslToHex(h + degrees, sat, l);
}

const BINS = 64;

interface PlayerVisualizerProps {
  song: Song;
  isPlaying: boolean;
  progress: number;
  onToggle: () => void;
  mode: VizMode;
  onModeChange: (mode: VizMode) => void;
  themeColor?: string; // override color from mood theme
  /** Rendered alongside the mode buttons, so page-level actions can sit in the
   *  same row without the visualizer knowing what they are. */
  extraAction?: ReactNode;
  /** Approved analysis for this song, or null. Composition mode is not offered
   *  without it (§7.4) — an unreviewed arc is machine output nobody checked. */
  analysis?: SongAnalysis | null;
  /** Live position in seconds, for the Composition playhead. */
  getTime?: () => number;
  onSeek?: (seconds: number) => void;
}

export default function PlayerVisualizer({
  song, isPlaying, progress, onToggle, mode, onModeChange, themeColor, extraAction,
  analysis = null, getTime, onSeek,
}: PlayerVisualizerProps) {
  const color = themeColor || song.color;
  const { getFrequencyData } = usePlayer();

  // §7.4: Composition is only offered for an approved analysis. Without one it
  // is not a mode the user can reach at all, rather than an empty panel.
  const compositionReady = !!analysis && Array.isArray(analysis.energy_curve) && analysis.energy_curve.length > 0;
  const offeredModes: VizMode[] = compositionReady ? ALL_VIZ_MODES : ['aurora'];
  const effectiveMode: VizMode = offeredModes.includes(mode) ? mode : 'aurora';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchStartX = useRef(0);
  const swipedRef = useRef(false);

  // Live values read by the animation loop without restarting it.
  const modeRef = useRef(mode);
  const colorRef = useRef(color);
  /** The anchor colour advanced around the wheel; recomputed every frame. */
  const drawColorRef = useRef(color);
  const songIdRef = useRef(song.id);
  // Which modes the swipe gesture may cycle through, kept in a ref so the
  // gesture handler does not need re-binding when availability changes.
  const offeredRef = useRef<VizMode[]>(ALL_VIZ_MODES);
  const progressRef = useRef(progress);
  const playingRef = useRef(isPlaying);
  const freqFnRef = useRef(getFrequencyData);
  useEffect(() => {
    modeRef.current = mode;
    colorRef.current = color;
    playingRef.current = isPlaying;
    freqFnRef.current = getFrequencyData;
    songIdRef.current = song.id;
    progressRef.current = progress;
    // Kept in a ref so the swipe handler does not need re-binding when the
    // offered modes change; written here rather than during render.
    offeredRef.current = compositionReady ? ALL_VIZ_MODES : ['aurora'];
  }, [mode, color, isPlaying, getFrequencyData, song.id, progress, compositionReady]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    swipedRef.current = false;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      swipedRef.current = true; // suppress the tap-to-toggle that follows
      const idx = offeredRef.current.indexOf(modeRef.current);
      const next = delta < 0
        ? (idx + 1) % offeredRef.current.length
        : (idx - 1 + offeredRef.current.length) % offeredRef.current.length;
      onModeChange(offeredRef.current[next]);
    }
  }, [onModeChange]);

  const handleClick = useCallback(() => {
    if (swipedRef.current) { swipedRef.current = false; return; }
    onToggle();
  }, [onToggle]);

  // ── The canvas engine ── mounted once; reads live refs each frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0, DPR = 1;
    const resize = () => {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);
    window.addEventListener('resize', resize);

    const reduce = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Smoothed spectrum + derived scalars.
    const spec = new Float32Array(BINS);
    let level = 0, t = 0;

    // Particle pools for the Orb and Nebula modes went with those renderers.
    const AUR = [
      { band: 0.08, yoff: 0.60, amp: 0.10, sp: 0.55, freq: 1.4, a: 0.55 },
      { band: 0.24, yoff: 0.52, amp: 0.13, sp: -0.40, freq: 2.1, a: 0.42 },
      { band: 0.45, yoff: 0.46, amp: 0.09, sp: 0.80, freq: 1.1, a: 0.30 },
    ];

    const hexA = (hex: string, a: number) => {
      let h = hex.replace('#', '');
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return `rgba(${r || 0},${g || 0},${b || 0},${a})`;
    };
    // roundRect went with the Composition canvas placeholder.

    // Fold real FFT data into `spec`, or synthesize a musical signal when the
    // analyser is unavailable / silent (CORS-tainted streams read as zeros).
    const updateSignal = (dt: number) => {
      const playing = playingRef.current;
      if (playing && !reduce) t += dt;

      const real = freqFnRef.current();
      let realSum = 0;
      if (real) for (let i = 0; i < BINS; i++) realSum += real[i];

      if (real && realSum > 4) {
        for (let i = 0; i < BINS; i++) {
          const v = real[i] / 255;
          spec[i] += (v - spec[i]) * 0.5;
        }
      } else if (playing && !reduce) {
        const beat = t * (120 / 60);
        const kick = Math.pow(Math.max(0, Math.sin(beat * Math.PI)), 8);
        const snare = Math.pow(Math.max(0, Math.sin((beat + 0.5) * Math.PI)), 10) * 0.6;
        for (let i = 0; i < BINS; i++) {
          const f = i / BINS;
          let v = 0;
          v += Math.exp(-f * 5) * (0.5 + 0.5 * kick);
          v += Math.exp(-Math.pow((f - 0.3) * 4.5, 2)) * (0.3 + 0.25 * Math.sin(t * 4 + i * 0.6) + snare);
          v += Math.exp(-Math.pow((f - 0.72) * 5, 2)) * 0.3 * (0.5 + 0.5 * Math.abs(Math.sin(t * 9 + i * 1.3)));
          v += Math.random() * 0.05;
          spec[i] += (Math.min(1, v) - spec[i]) * 0.35;
        }
      } else {
        // Paused / reduced motion: settle to a calm baseline.
        for (let i = 0; i < BINS; i++) {
          const target = 0.06 + (i / BINS) * 0.02;
          spec[i] += (Math.min(spec[i], target) - spec[i]) * 0.08;
        }
      }

      let sum = 0;
      for (let i = 0; i < BINS; i++) sum += spec[i];
      level = sum / BINS;
    };

    // Spectrum, Orb, Waveform and Nebula renderers were removed with their
    // modes; Aurora and Composition are the only two the player offers.

    const drawAurora = () => {
      const c = drawColorRef.current;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(6,6,14,0.28)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const rb of AUR) {
        const bandVal = spec[Math.floor(rb.band * BINS)];
        const amp = (rb.amp + bandVal * 0.20 + level * 0.10) * H;
        const top = rb.yoff * H - amp - 8;
        // colored curtain
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 6) {
          const f = x / W;
          const y = rb.yoff * H
            + Math.sin(f * Math.PI * rb.freq * 2 + t * rb.sp * 2) * amp
            + Math.sin(f * Math.PI * rb.freq * 5 - t * rb.sp) * amp * 0.35;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.closePath();
        const g = ctx.createLinearGradient(0, top, 0, H);
        g.addColorStop(0, hexA(c, 0));
        g.addColorStop(0.18, hexA(c, rb.a + bandVal * 0.4));
        g.addColorStop(0.6, hexA(c, rb.a * 0.25));
        g.addColorStop(1, hexA(c, 0.02));
        ctx.fillStyle = g; ctx.fill();
        // bright crest line
        ctx.shadowColor = hexA(c, .9); ctx.shadowBlur = 18;
        ctx.strokeStyle = `rgba(255,255,255,${0.35 + bandVal * 0.5})`;
        ctx.lineWidth = 1.5; ctx.beginPath();
        for (let x = 0; x <= W; x += 6) {
          const f = x / W;
          const y = rb.yoff * H
            + Math.sin(f * Math.PI * rb.freq * 2 + t * rb.sp * 2) * amp
            + Math.sin(f * Math.PI * rb.freq * 5 - t * rb.sp) * amp * 0.35;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke(); ctx.shadowBlur = 0;
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    /**
     * Placeholder for the structure view: energy over time with the song's
     * sections beneath it. The shape is derived from the song id so each track
     * looks consistent run to run, but it is invented — the real curve and
     * section marks come from analysis data the admin does not capture yet.
     */
    // The canvas Composition placeholder is gone: Composition is now a real
    // SVG arc drawn from analysis data by CompositionArc.

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      updateSignal(dt);
      drawColorRef.current = reduce
        ? colorRef.current
        : rotateHue(colorRef.current, (t / COLOR_CYCLE_SECONDS) * 360);
      // Composition is rendered as SVG by CompositionArc; the canvas only ever
      // draws the Player view now.
      drawAurora();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div>
      {/* Visualizer canvas */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          height: 180,
          background: `radial-gradient(ellipse at center, ${color}14 0%, rgba(0,0,0,0.5) 72%, rgba(0,0,0,0.7) 100%)`,
          border: `1px solid ${color}22`,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={effectiveMode === 'composition' ? undefined : handleClick}
      >
        {/* The canvas stays mounted so its animation loop is not torn down and
            rebuilt every time the user flips modes; it is just hidden. */}
        <div style={{ display: effectiveMode === 'composition' ? 'none' : 'block', height: '100%' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
        {effectiveMode === 'composition' && analysis && (
          <div className="px-2 pt-1">
            <CompositionArc
              analysis={analysis}
              duration={analysis.source_file?.duration_sec}
              accent={color}
              muted="rgba(255,255,255,0.30)"
              textColor="rgba(255,255,255,0.5)"
              labelColor="#FFFFFF"
              height={172}
              windowSeconds={45}
              getTime={getTime}
              isPlaying={isPlaying}
              onSeek={onSeek}
            />
          </div>
        )}
      </div>

      {/* Mode selector */}
      <div className="flex items-center justify-center gap-[16px] mt-3">
        {offeredModes.map(m => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className="flex flex-col items-center gap-[3px] cursor-pointer bg-transparent border-none"
          >
            <div
              className="rounded-full transition-all duration-300"
              style={{
                width: effectiveMode === m ? 10 : 6,
                height: effectiveMode === m ? 10 : 6,
                background: effectiveMode === m ? color : 'rgba(255,255,255,0.2)',
                boxShadow: effectiveMode === m ? `0 0 10px ${color}88, 0 0 20px ${color}44` : 'none',
              }}
            />
            <span className="text-micro tracking-[0.5px] uppercase"
              style={{
                fontFamily: "'DM Mono', monospace",
                color: effectiveMode === m ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
              }}>
              {VIZ_LABEL[m]}
            </span>
          </button>
        ))}
        {extraAction}
      </div>
    </div>
  );
}
