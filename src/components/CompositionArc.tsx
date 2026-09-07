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
  /** Neutral for non-chorus blocks and ticks. */
  muted?: string;
  /** Ground colour, so the same component works on cream and on near-black. */
  background?: string;
  textColor?: string;
  height?: number;
  /** Live position, in seconds. Read every frame while `isPlaying`, so this
   *  must be cheap — the playhead is moved by mutating the DOM, never by
   *  re-rendering React. */
  getTime?: () => number;
  isPlaying?: boolean;
  /** Seconds to seek to when the arc is clicked. Omit to make it read-only. */
  onSeek?: (seconds: number) => void;
  /** Hide the section bar and hook marker regardless of confidence. */
  curveOnly?: boolean;
}

const PAD = 10;
const BAR_H = 12;
const LABEL_H = 14;
const TICK_H = 12;

/** Sections shorter than this have no room for a label without colliding. */
const MIN_LABEL_SECONDS = 8;

export default function CompositionArc({
  analysis,
  duration,
  accent = 'var(--acid)',
  muted = 'var(--muted)',
  background = 'transparent',
  textColor = 'var(--muted)',
  height = 170,
  getTime,
  isPlaying = false,
  onSeek,
  curveOnly = false,
}: CompositionArcProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<SVGLineElement>(null);
  const sectionRefs = useRef<(SVGRectElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const [width, setWidth] = useState(0);

  // Real pixel width rather than a scaled viewBox: a viewBox would squash the
  // labels and ticks on a narrow phone.
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
  // §7.4: low structure confidence means the sections are not trustworthy
  // enough to draw, but the curve itself still is.
  const showStructure = !curveOnly && analysis.structure_confidence !== 'low';
  const sections: AnalysisSection[] = showStructure ? (analysis.sections || []) : [];
  const hook = showStructure ? analysis.time_to_hook_sec : null;

  const plotW = Math.max(0, width - PAD * 2);
  const plotH = Math.max(
    20,
    height - (showStructure ? BAR_H + LABEL_H : 0) - TICK_H - 8
  );

  const xAt = (sec: number) => PAD + (Math.max(0, Math.min(total, sec)) / total) * plotW;

  // Area + stroke share one point list.
  let linePath = '';
  let areaPath = '';
  if (curve.length > 1 && plotW > 0) {
    const pts = curve.map((v, i) => {
      const x = PAD + (i / (curve.length - 1)) * plotW;
      const y = 4 + (1 - Math.max(0, Math.min(1, v))) * (plotH - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    linePath = `M${pts.join('L')}`;
    areaPath = `M${PAD},${plotH} L${pts.join('L')} L${(PAD + plotW).toFixed(1)},${plotH} Z`;
  }

  // Minute ticks, plus zero.
  const ticks: number[] = [0];
  for (let s = 60; s < total; s += 60) ticks.push(s);

  // Playhead + active section, driven by rAF and written straight to the DOM.
  useEffect(() => {
    if (!getTime || !isPlaying || plotW <= 0) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const tick = () => {
      const t = getTime();
      // Howler's seek() can hand back the Howl itself before playback has
      // initialised; anything non-numeric is skipped rather than rendered.
      if (typeof t === 'number' && Number.isFinite(t)) {
        const x = xAt(t);
        const line = playheadRef.current;
        if (line) {
          line.setAttribute('x1', String(x));
          line.setAttribute('x2', String(x));
          line.setAttribute('opacity', '1');
        }
        sections.forEach((sec, i) => {
          const rect = sectionRefs.current[i];
          if (!rect) return;
          const active = t >= sec.start && t < sec.end;
          rect.setAttribute('opacity', active ? '1' : sec.label === 'chorus' ? '0.85' : '0.5');
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getTime, isPlaying, plotW, total, sections.length]);

  const seekFromX = (clientX: number) => {
    if (!onSeek || !wrapRef.current || plotW <= 0) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const rel = clientX - rect.left - PAD;
    onSeek(Math.max(0, Math.min(total, (rel / plotW) * total)));
  };

  const barY = plotH + 6;

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

          {/* Minute ticks behind everything */}
          {ticks.map(t => (
            <g key={`tick-${t}`}>
              <line
                x1={xAt(t)} x2={xAt(t)} y1={0} y2={plotH}
                stroke="var(--border)" strokeWidth={1} opacity={0.5}
              />
              <text
                x={xAt(t) + 3} y={height - 2}
                fontSize={9} fontFamily="'DM Mono', monospace" fill={textColor} opacity={0.7}
              >
                {formatSeconds(t)}
              </text>
            </g>
          ))}

          {areaPath && <path d={areaPath} fill="url(#arcFill)" />}
          {linePath && <path d={linePath} fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round" />}

          {/* Hook marker */}
          {hook != null && (
            <g>
              <line
                x1={xAt(hook)} x2={xAt(hook)} y1={0} y2={plotH}
                stroke={textColor} strokeWidth={1} strokeDasharray="3 3" opacity={0.8}
              />
              <text
                x={xAt(hook) + 4} y={11}
                fontSize={9} fontFamily="'DM Mono', monospace" fill={textColor}
              >
                hook {formatSeconds(hook)}
              </text>
            </g>
          )}

          {/* Section bar */}
          {sections.map((sec, i) => {
            const x = xAt(sec.start);
            const w = Math.max(2, xAt(sec.end) - x - 2);
            const isChorus = sec.label === 'chorus';
            return (
              <rect
                key={`sec-${i}`}
                ref={el => { sectionRefs.current[i] = el; }}
                x={x} y={barY} width={w} height={BAR_H} rx={BAR_H / 2}
                fill={isChorus ? accent : muted}
                opacity={isChorus ? 0.85 : 0.5}
              />
            );
          })}

          {/* Labels, only where there is room */}
          {sections.map((sec, i) => {
            if (sec.end - sec.start < MIN_LABEL_SECONDS) return null;
            const x = xAt(sec.start);
            const w = xAt(sec.end) - x;
            return (
              <text
                key={`lab-${i}`}
                x={x + w / 2} y={barY + BAR_H + 11}
                fontSize={9} fontFamily="'DM Mono', monospace"
                fill={textColor} textAnchor="middle" opacity={0.85}
              >
                {sec.label}
              </text>
            );
          })}

          {/* Playhead, hidden until the first frame gives it a position */}
          {getTime && (
            <line
              ref={playheadRef}
              x1={PAD} x2={PAD} y1={0} y2={barY + BAR_H}
              stroke="#FFFFFF" strokeWidth={1.5} opacity={0}
              style={{ mixBlendMode: 'difference' }}
            />
          )}
        </svg>
      )}
    </div>
  );
}
