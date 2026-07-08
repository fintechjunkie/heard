'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Song } from '@/data/types';
import { usePlayer } from '@/lib/player';

export type VizMode = 'spectrum' | 'orb' | 'waveform' | 'nebula' | 'aurora';
const VIZ_MODES: VizMode[] = ['spectrum', 'orb', 'waveform', 'nebula', 'aurora'];
const VIZ_LABELS = ['Spectrum', 'Orb', 'Waveform', 'Nebula', 'Aurora'];

const BINS = 64;

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
  song, isPlaying, onToggle, mode, onModeChange, themeColor,
}: PlayerVisualizerProps) {
  const color = themeColor || song.color;
  const { getFrequencyData } = usePlayer();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchStartX = useRef(0);
  const swipedRef = useRef(false);

  // Live values read by the animation loop without restarting it.
  const modeRef = useRef(mode);
  const colorRef = useRef(color);
  const playingRef = useRef(isPlaying);
  const freqFnRef = useRef(getFrequencyData);
  useEffect(() => {
    modeRef.current = mode;
    colorRef.current = color;
    playingRef.current = isPlaying;
    freqFnRef.current = getFrequencyData;
  }, [mode, color, isPlaying, getFrequencyData]);

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
    let bass = 0, level = 0, t = 0;

    // Particle systems (persist across frames).
    const orbP = Array.from({ length: 48 }, () => ({
      a: Math.random() * Math.PI * 2, r: 0.5 + Math.random() * 0.5,
      sp: 0.2 + Math.random() * 0.6, sz: 1 + Math.random() * 2,
    }));
    const nebP = Array.from({ length: 90 }, () => ({
      a: Math.random() * Math.PI * 2, d: Math.random(),
      v: 0.2 + Math.random() * 0.8, sz: 1 + Math.random() * 2.5,
    }));
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
      bass = (spec[0] + spec[1] + spec[2] + spec[3]) / 4;
      level = sum / BINS;
    };

    const drawSpectrum = () => {
      const c = colorRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const step = W / BINS, cy = H;
      for (let i = 0; i < BINS; i++) {
        const v = spec[i];
        const bh = Math.max(2, v * H * 0.92);
        const x = i * step + step * 0.18, bw = step * 0.64, y = cy - bh;
        const g = ctx.createLinearGradient(0, cy, 0, y);
        g.addColorStop(0, hexA(c, 0.12));
        g.addColorStop(0.55, hexA(c, 0.85));
        g.addColorStop(1, `rgba(255,255,255,${Math.min(1, v * 1.3)})`);
        ctx.fillStyle = g; ctx.shadowColor = hexA(c, 0.8); ctx.shadowBlur = 14;
        roundRect(x, y, bw, bh, bw / 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 0.12;
        roundRect(x, cy, bw, bh * 0.4, bw / 2); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
    };

    const drawOrb = () => {
      const c = colorRef.current;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, base = Math.min(W, H) * 0.16;
      ctx.globalCompositeOperation = 'lighter';
      for (let L = 3; L >= 1; L--) {
        const rad = base + bass * base * 2.4 + L * 10;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad * 2.2);
        g.addColorStop(0, hexA(c, 0.5 / L));
        g.addColorStop(0.5, hexA(c, 0.12 / L));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rad * 2.2, 0, 7); ctx.fill();
      }
      const cr = base + bass * base * 1.6;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      cg.addColorStop(0, 'rgba(255,255,255,.95)');
      cg.addColorStop(0.5, hexA(c, .9));
      cg.addColorStop(1, hexA(c, .1));
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 7); ctx.fill();
      for (const p of orbP) {
        if (playingRef.current && !reduce) p.a += p.sp * 0.02;
        const rr = base * 1.8 + p.r * base * 1.2 + bass * base * 2.2;
        const px = cx + Math.cos(p.a) * rr, py = cy + Math.sin(p.a) * rr;
        ctx.fillStyle = hexA(c, 0.4 + bass * 0.5);
        ctx.beginPath(); ctx.arc(px, py, p.sz * (1 + bass * 2), 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    const drawWaveform = () => {
      const c = colorRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const cy = H / 2;
      const trace = (scale: number) => {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 3) {
          const f = x / W;
          const i = Math.floor(f * (BINS - 1));
          const amp = (spec[i] * 0.6 + level * 0.4) * H * 0.42 * scale;
          const yy = cy + Math.sin(f * 22 + t * 5) * amp * Math.sin(f * Math.PI);
          if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
      };
      trace(1); ctx.lineTo(W, cy); ctx.lineTo(0, cy); ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, hexA(c, .25));
      g.addColorStop(0.5, hexA(c, .05));
      g.addColorStop(1, hexA(c, .25));
      ctx.fillStyle = g; ctx.fill();
      ctx.shadowColor = hexA(c, .9); ctx.shadowBlur = 16;
      ctx.strokeStyle = c; ctx.lineWidth = 2.5; trace(1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1; trace(0.55); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
    };

    const drawNebula = () => {
      const c = colorRef.current;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(6,6,14,0.18)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const cx = W / 2, cy = H / 2;
      for (const p of nebP) {
        if (playingRef.current && !reduce) p.d += (0.002 + level * 0.02) * p.v;
        if (p.d > 1) { p.d = 0; p.a = Math.random() * Math.PI * 2; }
        const rr = p.d * Math.min(W, H) * 0.62;
        const px = cx + Math.cos(p.a) * rr * (W / H > 1 ? 1.4 : 1);
        const py = cy + Math.sin(p.a) * rr;
        const s = p.sz * (0.6 + level * 2.4) * (1 - p.d * 0.5);
        ctx.fillStyle = hexA(c, (1 - p.d) * (0.3 + level * 0.6));
        ctx.beginPath(); ctx.arc(px, py, Math.max(0.4, s), 0, 7); ctx.fill();
      }
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 + bass * 80);
      g.addColorStop(0, hexA(c, .5 + bass * .4));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 40 + bass * 80, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    };

    const drawAurora = () => {
      const c = colorRef.current;
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

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      updateSignal(dt);
      switch (modeRef.current) {
        case 'orb': drawOrb(); break;
        case 'waveform': drawWaveform(); break;
        case 'nebula': drawNebula(); break;
        case 'aurora': drawAurora(); break;
        default: drawSpectrum();
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
      </div>
    </div>
  );
}
