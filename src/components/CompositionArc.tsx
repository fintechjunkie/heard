'use client';

import { useEffect, useRef, useState } from 'react';
import {
  formatSeconds,
  type AnalysisSection,
  type SongAnalysis,
} from '@/data/analysis';

interface CompositionArcProps {
  analysis: SongAnalysis;
  /** Track length. Falls back to the analysed duration. */
  duration?: number;
  /** Accent for the curve and chorus blocks. */
  accent?: string;
  /** Neutral for non-chorus blocks. */
  muted?: string;
  background?: string;
  /** Ticks and secondary text. */
  textColor?: string;
  /** Section labels. Kept separate because they have to stay legible against
   *  whatever the bar is drawn on — white on the dark player, dark in admin. */
  labelColor?: string;
  height?: number;
  /**
   * How many seconds are visible at once. Fitting a 3-minute song into a phone
   * width leaves roughly two pixels per second, which is unreadable — the
   * labels collide and the curve turns to noise. A window scrolls instead.
   * Pass null to fit the whole song, which is what the admin preview wants
   * while boundaries are being edited.
   */
  windowSeconds?: number | null;
  /** Live position, in seconds. Read every frame — this moves the view. */
  getTime?: () => number;
  isPlaying?: boolean;
  onSeek?: (seconds: number) => void;
  curveOnly?: boolean;
}

const PAD = 10;
const BAR_H = 14;
const LABEL_H = 16;
const TICK_H = 12;

/**
 * Where the playhead sits once the view starts scrolling. Before this it moves
 * across a still image; after it, it holds position and the song moves under
 * it — a second off the left for every second added on the right.
 */
const SCROLL_LEAD_SECONDS = 20;

/** A label needs about this much room before it is worth drawing. */
const MIN_LABEL_PX = 26;

export default function CompositionArc({
  analysis,
  duration,
  accent = 'var(--acid)',
  muted = 'var(--muted)',
  background = 'transparent',
  textColor = 'var(--muted)',
  labelColor,
  height = 170,
  windowSeconds = 45,
  getTime,
  isPlaying = false,
  onSeek,
  curveOnly = false,
}: CompositionArcProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<SVGGElement>(null);
  const playheadRef = useRef<SVGLineElement>(null);
  const sectionRefs = useRef<(SVGRectElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  /** Left edge of the visible window, in seconds. Read by the pointer handler
   *  so a tap maps to the right moment in the song. */
  const windowStartRef = useRef(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const total = duration || analysis.source_file?.duration_sec || 1;
  const curve = analysis.energy_curve || [];
  const showStructure = !curveOnly && analysis.structure_confidence !== 'low';
  const sections: AnalysisSection[] = showStructure ? (analysis.sections || []) : [];
  const hook = showStructure ? analysis.time_to_hook_sec : null;

  const plotW = Math.max(0, width - PAD * 2);
  const plotH = Math.max(
    20,
    height - (showStructure ? BAR_H + LABEL_H : 0) - TICK_H - 8
  );

  // Seconds visible at once, and therefore how wide a second is.
  const visible = windowSeconds && windowSeconds < total ? windowSeconds : total;
  const pxPerSec = plotW > 0 ? plotW / visible : 0;
  const scrolls = visible < total;
  const maxStart = Math.max(0, total - visible);

  /** Absolute time → x in the scrolling group's own coordinates. */
  const xAt = (sec: number) => PAD + sec * pxPerSec;

  // Curve as one path across the whole song; the group is what moves.
  let linePath = '';
  let areaPath = '';
  if (curve.length > 1 && pxPerSec > 0) {
    const pts = curve.map((v, i) => {
      const t = (i / (curve.length - 1)) * total;
      const y = 4 + (1 - Math.max(0, Math.min(1, v))) * (plotH - 4);
      return `${xAt(t).toFixed(1)},${y.toFixed(1)}`;
    });
    linePath = `M${pts.join('L')}`;
    areaPath = `M${xAt(0)},${plotH} L${pts.join('L')} L${xAt(total).toFixed(1)},${plotH} Z`;
  }

  // Denser ticks than once a minute: at 45 seconds across a phone, a minute
  // tick can be off-screen entirely.
  const tickEvery = visible <= 60 ? 10 : 30;
  const ticks: number[] = [];
  for (let s = 0; s <= total; s += tickEvery) ticks.push(s);

  const barY = plotH + 6;

  /** Left edge of the window for a given playback position. */
  const startFor = (t: number) => {
    if (!scrolls) return 0;
    return Math.max(0, Math.min(maxStart, t - SCROLL_LEAD_SECONDS));
  };

  const applyView = (t: number) => {
    const start = startFor(t);
    windowStartRef.current = start;
    const g = scrollRef.current;
    if (g) g.setAttribute('transform', `translate(${(-start * pxPerSec).toFixed(2)},0)`);
    const line = playheadRef.current;
    if (line) {
      const x = PAD + (t - start) * pxPerSec;
      line.setAttribute('x1', String(x));
      line.setAttribute('x2', String(x));
      line.setAttribute('opacity', '1');
    }
    sections.forEach((sec, i) => {
      const rect = sectionRefs.current[i];
      if (!rect) return;
      const active = t >= sec.start && t < sec.end;
      rect.setAttribute('opacity', active ? '1' : sec.label === 'chorus' ? '0.85' : '0.45');
    });
  };

  // The view has to follow the playhead whether or not audio is running —
  // seeking while paused must move the window too — so the loop is tied to
  // having a time source rather than to playback. It reads one number and
  // writes a transform, which is cheap enough to leave running.
  useEffect(() => {
    if (!getTime || pxPerSec <= 0) return;
    const tick = () => {
      const t = getTime();
      // Howler's seek() hands back the Howl itself before playback
      // initialises; anything non-numeric is skipped rather than rendered.
      if (typeof t === 'number' && Number.isFinite(t)) applyView(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getTime, pxPerSec, total, sections.length, isPlaying]);

  const seekFromX = (clientX: number) => {
    if (!onSeek || !wrapRef.current || pxPerSec <= 0) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const rel = clientX - rect.left - PAD;
    const t = windowStartRef.current + rel / pxPerSec;
    onSeek(Math.max(0, Math.min(total, t)));
  };

  const labelFill = labelColor || textColor;

  return (
    <div
      ref={wrapRef}
      style={{ width: '100%', background, borderRadius: 12, touchAction: onSeek ? 'none' : undefined }}
      onPointerDown={onSeek ? (e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        seekFromX(e.clientX);
      } : undefined}
      onPointerMove={onSeek ? (e) => {
        if (e.buttons > 0) seekFromX(e.clientX);
      } : undefined}
    >
      {width > 0 && (
        <svg width={width} height={height} style={{ display: 'block', cursor: onSeek ? 'pointer' : 'default' }}>
          <defs>
            <linearGradient id="arcFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Everything time-positioned lives in here; scrolling is one
              transform on this group rather than a re-render. */}
          <g ref={scrollRef} transform="translate(0,0)">
            {ticks.map(t => (
              <g key={`tick-${t}`}>
                <line
                  x1={xAt(t)} x2={xAt(t)} y1={0} y2={plotH}
                  stroke={textColor} strokeWidth={1} opacity={0.18}
                />
                <text
                  x={xAt(t) + 3} y={height - 2}
                  fontSize={9} fontFamily="'DM Mono', monospace" fill={textColor} opacity={0.75}
                >
                  {formatSeconds(t)}
                </text>
              </g>
            ))}

            {areaPath && <path d={areaPath} fill="url(#arcFill)" />}
            {linePath && <path d={linePath} fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round" />}

            {hook != null && (
              <g>
                <line
                  x1={xAt(hook)} x2={xAt(hook)} y1={0} y2={plotH}
                  stroke={labelFill} strokeWidth={1} strokeDasharray="3 3" opacity={0.85}
                />
                <text
                  x={xAt(hook) + 4} y={11}
                  fontSize={10} fontFamily="'DM Mono', monospace" fill={labelFill}
                >
                  hook {formatSeconds(hook)}
                </text>
              </g>
            )}

            {sections.map((sec, i) => {
              const x = xAt(sec.start);
              const w = Math.max(2, (sec.end - sec.start) * pxPerSec - 2);
              const isChorus = sec.label === 'chorus';
              return (
                <rect
                  key={`sec-${i}`}
                  ref={el => { sectionRefs.current[i] = el; }}
                  x={x} y={barY} width={w} height={BAR_H} rx={BAR_H / 2}
                  fill={isChorus ? accent : muted}
                  opacity={isChorus ? 0.85 : 0.45}
                />
              );
            })}

            {sections.map((sec, i) => {
              const w = (sec.end - sec.start) * pxPerSec;
              if (w < MIN_LABEL_PX) return null;
              return (
                <text
                  key={`lab-${i}`}
                  x={xAt(sec.start) + w / 2} y={barY + BAR_H + 12}
                  fontSize={10} fontFamily="'DM Mono', monospace"
                  fontWeight={600}
                  letterSpacing="0.5"
                  fill={labelFill} textAnchor="middle"
                >
                  {sec.label}
                </text>
              );
            })}
          </g>

          {/* Fixed: the playhead does not scroll with the song. */}
          {getTime && (
            <line
              ref={playheadRef}
              x1={PAD} x2={PAD} y1={0} y2={barY + BAR_H}
              stroke={labelFill} strokeWidth={1.5} opacity={0}
            />
          )}
        </svg>
      )}
    </div>
  );
}
