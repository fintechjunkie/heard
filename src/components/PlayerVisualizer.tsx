'use client';

import { useRef, useEffect, useCallback, type ReactNode } from 'react';
import { Song } from '@/data/types';
import { usePlayer } from '@/lib/player';

export type VizMode = 'aurora' | 'composition';
const VIZ_MODES: VizMode[] = ['aurora', 'composition'];
const VIZ_LABELS = ['Aurora', 'Composition'];

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
 * Pocket than the choice was worth.
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
}

export default function PlayerVisualizer({
  song, isPlaying, progress, onToggle, mode, onModeChange, themeColor, extraAction,
}: PlayerVisualizerProps) {
  const color = themeColor || song.color;
  const { getFrequencyData } = usePlayer();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchStartX = useRef(0);
  const swipedRef = useRef(false);

  // Live values read by the animation loop without restarting it.
  const modeRef = useRef(mode);
  const colorRef = useRef(color);
  /** The anchor colour advanced around the wheel; recomputed every frame. */
  const drawColorRef = useRef(color);
  const songIdRef = useRef(song.id);
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
  }, [mode, color, isPlaying, getFrequencyData, song.id, progress]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    swipedRef.current = false;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      swipedRef.current = true; // suppress the tap-to-toggle that follows
      const idx = VIZ_MODES.indexOf(modeRef.current);
      const next = delta < 0
        ? (idx + 1) % VIZ_MODES.length
        : (idx - 1 + VIZ_MODES.length) % VIZ_MODES.length;
      onModeChange(VIZ_MODES[next]);
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
    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      r = Math.min(r, w / 2, h / 2 > 0 ? h / 2 : r);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

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
    const drawComposition = () => {
      const c = drawColorRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(6,6,14,0.9)';
      ctx.fillRect(0, 0, W, H);

      const seed = songIdRef.current || 1;
      const rand = (n: number) => {
        const v = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
        return v - Math.floor(v);
      };

      const padX = 10;
      const barH = 12;
      const plotH = H - barH - 26;
      const plotW = W - padX * 2;

      // Sections across the track, alternating quiet and loud.
      const sections = [
        { label: 'Intro', w: 0.07, hot: false },
        { label: 'Verse', w: 0.15, hot: false },
        { label: 'Pre', w: 0.07, hot: false },
        { label: 'Chorus', w: 0.19, hot: true },
        { label: 'Verse', w: 0.12, hot: false },
        { label: 'Chorus', w: 0.19, hot: true },
        { label: 'Bridge', w: 0.09, hot: false },
        { label: 'Chorus', w: 0.12, hot: true },
      ];

      // Energy curve
      ctx.beginPath();
      ctx.moveTo(padX, plotH + 8);
      let x = padX;
      sections.forEach((sec, si) => {
        const segW = sec.w * plotW;
        const steps = Math.max(4, Math.floor(segW / 5));
        for (let i = 0; i <= steps; i++) {
          const base = sec.hot ? 0.78 : 0.42;
          const jitter = (rand(si * 10 + i) - 0.5) * (sec.hot ? 0.16 : 0.12);
          const y = plotH + 8 - (base + jitter) * plotH;
          ctx.lineTo(x + (i / steps) * segW, y);
        }
        x += segW;
      });
      ctx.lineTo(W - padX, plotH + 8);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, 0, 0, plotH + 8);
      fill.addColorStop(0, hexA(c, 0.35));
      fill.addColorStop(1, hexA(c, 0.02));
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = hexA(c, 0.95);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Section bar
      x = padX;
      sections.forEach(sec => {
        const segW = sec.w * plotW - 2;
        ctx.fillStyle = sec.hot ? hexA(c, 0.95) : 'rgba(255,255,255,0.22)';
        roundRect(x, plotH + 16, Math.max(2, segW), barH, barH / 2);
        ctx.fill();
        x += sec.w * plotW;
      });

      // Playhead
      const px = padX + (progressRef.current / 100) * plotW;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, 4);
      ctx.lineTo(px, plotH + 16 + barH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '9px monospace';
      ctx.fillText('STRUCTURE · PLACEHOLDER DATA', padX, H - 5);
    };

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      updateSignal(dt);
      drawColorRef.current = reduce
        ? colorRef.current
        : rotateHue(colorRef.current, (t / COLOR_CYCLE_SECONDS) * 360);
      switch (modeRef.current) {
        case 'composition': drawComposition(); break;
        default: drawAurora();
      }
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
        onClick={handleClick}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
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
            <span className="text-micro tracking-[0.5px] uppercase"
              style={{
                fontFamily: "'DM Mono', monospace",
                color: mode === m ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
              }}>
              {VIZ_LABELS[i]}
            </span>
          </button>
        ))}
        {extraAction}
      </div>
    </div>
  );
}
