'use client';

import { useState, useRef, useMemo } from 'react';
import { Song } from '@/data/types';
import CompositionArc from '../CompositionArc';
import {
  SECTION_LABELS,
  KEY_ROOTS,
  KEY_MODES,
  deriveTimeToHook,
  formatSeconds,
  noteToMidi,
  validateAnalysis,
  type SongAnalysis,
  type AnalysisSection,
} from '@/data/analysis';

interface AnalysisPanelProps {
  song: Song;
  onSongUpdated: (song: Song) => void;
}

/** Machine value beside the edited one, so an admin can see what they changed. */
function Original({ value }: { value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <span className="text-xs text-gray-400 ml-2">was {String(value)}</span>
  );
}

function Confidence({ level }: { level?: string }) {
  if (!level) return null;
  const bad = level === 'ambiguous' || level === 'low';
  return (
    <span className={`ml-2 px-2 py-[1px] rounded-full text-xs ${
      bad ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700'
    }`}>
      {level}
    </span>
  );
}

export default function AnalysisPanel({ song, onSongUpdated }: AnalysisPanelProps) {
  const stored = (song.analysis as SongAnalysis | undefined) ?? null;
  const [draft, setDraft] = useState<SongAnalysis | null>(stored);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // The machine's own values, for the "was X" annotations. Frozen at mount so
  // it keeps showing what was imported, not what was last saved.
  const machine = useRef(stored).current;

  const status = song.analysis_status || 'pending';
  const derivedHook = useMemo(
    () => (draft ? deriveTimeToHook(draft.sections || []) : null),
    [draft]
  );

  /** Record which fields a human touched — §8.2 says this is how we learn
   *  which pipeline stages need work. */
  const markEdited = (path: string, next: SongAnalysis): SongAnalysis => {
    const set = new Set(next.admin?.edited_fields || []);
    set.add(path);
    return { ...next, admin: { ...next.admin, edited_fields: [...set] } };
  };

  const update = (path: string, mutate: (a: SongAnalysis) => SongAnalysis) => {
    setDraft(prev => (prev ? markEdited(path, mutate(structuredClone(prev))) : prev));
    setDirty(true);
  };

  // ---- Import -------------------------------------------------------------

  const importFile = async (file: File) => {
    setError(null);
    setWarnings([]);
    setBusy('Reading file…');
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('That file is not valid JSON');
      }
      const check = validateAnalysis(parsed);
      if (!check.ok) throw new Error(check.errors.join('; '));

      setBusy('Importing…');
      const res = await fetch('/api/songs/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: song.id, analysis: parsed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Import failed (${res.status})`);

      setDraft(data.song.analysis);
      setWarnings(data.warnings || []);
      setDirty(false);
      onSongUpdated(data.song);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!draft) return;
    setBusy('Saving…');
    setError(null);
    try {
      const res = await fetch('/api/songs/analysis', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: song.id, analysis: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);
      // Take the server's copy back: it rewrites derived fields such as
      // time_to_hook_sec, so keeping the local draft would leave them stale.
      setDraft(data.song.analysis);
      setDirty(false);
      setWarnings(data.warnings || []);
      onSongUpdated(data.song);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(null);
    }
  };

  const setApproval = async (action: 'approve' | 'unapprove') => {
    setBusy(action === 'approve' ? 'Approving…' : 'Reopening…');
    setError(null);
    try {
      const res = await fetch('/api/songs/analysis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: song.id, action, reviewer: 'admin' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      setDraft(data.song.analysis);
      onSongUpdated(data.song);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const discard = async () => {
    if (!confirm('Discard this analysis? The song returns to unanalyzed.')) return;
    setBusy('Discarding…');
    try {
      const res = await fetch(`/api/songs/analysis?songId=${song.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not discard');
      setDraft(null);
      onSongUpdated({ ...song, analysis: undefined, analysis_status: 'pending' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  // ---- Section editing ----------------------------------------------------

  const editSection = (i: number, patch: Partial<AnalysisSection>) =>
    update('sections', a => {
      a.sections[i] = { ...a.sections[i], ...patch };
      return a;
    });

  /** Moving a boundary moves its neighbour's edge too — sections are
   *  contiguous, and letting them overlap would break the arc. */
  const moveBoundary = (i: number, newStart: number) =>
    update('sections', a => {
      const prev = a.sections[i - 1];
      const cur = a.sections[i];
      if (!cur) return a;
      const lower = prev ? prev.start + 0.5 : 0;
      const upper = cur.end - 0.5;
      const clamped = Math.max(lower, Math.min(upper, newStart));
      cur.start = clamped;
      if (prev) prev.end = clamped;
      return a;
    });

  const mergeWithNext = (i: number) =>
    update('sections', a => {
      const cur = a.sections[i];
      const next = a.sections[i + 1];
      if (!cur || !next) return a;
      // Keep the louder label: merging a pre into a chorus should read chorus.
      const keep = next.energy > cur.energy ? next.label : cur.label;
      a.sections.splice(i, 2, {
        start: cur.start,
        end: next.end,
        label: keep,
        energy: Math.max(cur.energy, next.energy),
        stability: Math.min(cur.stability, next.stability),
      });
      return a;
    });

  const deleteSection = (i: number) =>
    update('sections', a => {
      const cur = a.sections[i];
      const prev = a.sections[i - 1];
      const next = a.sections[i + 1];
      if (!cur) return a;
      // Give the time to a neighbour rather than leaving a hole.
      if (prev) prev.end = cur.end;
      else if (next) next.start = cur.start;
      a.sections.splice(i, 1);
      return a;
    });

  const splitSection = (i: number) =>
    update('sections', a => {
      const cur = a.sections[i];
      if (!cur || cur.end - cur.start < 2) return a;
      const mid = (cur.start + cur.end) / 2;
      a.sections.splice(i, 1,
        { ...cur, end: mid },
        { ...cur, start: mid, label: 'section' }
      );
      return a;
    });

  // ---- Render -------------------------------------------------------------

  if (!draft) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">Analysis</h3>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">{status}</span>
        </div>
        <p className="text-sm text-gray-500 mb-4 max-w-xl">
          Analysis is produced offline by the DSP pipeline and imported here as JSON.
          Nothing reaches buyers until it has been reviewed and approved on this screen.
        </p>
        {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={!!busy}
          className="px-4 py-2 bg-black text-white rounded-lg text-sm cursor-pointer border-none">
          {busy || 'Import analysis JSON'}
        </button>
      </div>
    );
  }

  const approved = status === 'approved';

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      {/* Header + status */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-bold">Analysis</h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${
            approved ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {status}
          </span>
          {dirty && <span className="text-xs text-amber-600">unsaved changes</span>}
        </div>
      </div>
      <div className="text-xs text-gray-400 mb-4">
        engine {draft.engine_version} · analyzed {new Date(draft.analyzed_at).toLocaleDateString()}
        {draft.admin?.edited_fields?.length ? ` · edited: ${draft.admin.edited_fields.join(', ')}` : ''}
      </div>

      {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
      {warnings.length > 0 && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <div className="font-medium mb-1">Worth checking</div>
          <ul className="list-disc pl-5 space-y-[2px]">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Live arc preview — §8.2 wants boundary edits visible immediately */}
      <div className="mb-6 p-3 rounded-xl border border-gray-100" style={{ background: '#FAFAF7' }}>
        <div className="text-xs text-gray-500 mb-2">Preview</div>
        <CompositionArc
          analysis={{ ...draft, time_to_hook_sec: derivedHook }}
          accent="#FF6848"
          muted="#9CA3AF"
          textColor="#6B7280"
          labelColor="#111827"
          height={180}
          windowSeconds={null}
        />
        <div className="text-xs text-gray-400 mt-1">
          Whole song. Buyers see a scrolling 45-second window.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Tempo */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Tempo (BPM)<Confidence level={draft.tempo.confidence} />
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={draft.tempo.bpm}
              onChange={e => update('tempo.bpm', a => {
                a.tempo.bpm = parseInt(e.target.value, 10) || 0;
                return a;
              })}
              className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
            />
            {draft.tempo.alt_bpm != null && (
              <button
                onClick={() => update('tempo.bpm', a => {
                  const swap = a.tempo.alt_bpm!;
                  a.tempo.alt_bpm = a.tempo.bpm;
                  a.tempo.bpm = swap;
                  return a;
                })}
                className="px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white cursor-pointer">
                Use {draft.tempo.alt_bpm} instead
              </button>
            )}
            <Original value={machine?.tempo.bpm !== draft.tempo.bpm ? machine?.tempo.bpm : null} />
          </div>
        </div>

        {/* Key */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Key<Confidence level={draft.key.confidence} />
          </label>
          <div className="flex items-center gap-2">
            <select
              value={draft.key.root}
              onChange={e => update('key.root', a => {
                a.key.root = e.target.value;
                a.key.display = `${e.target.value} ${a.key.mode}`;
                return a;
              })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800">
              {KEY_ROOTS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={draft.key.mode}
              onChange={e => update('key.mode', a => {
                a.key.mode = e.target.value;
                a.key.display = `${a.key.root} ${e.target.value}`;
                return a;
              })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800">
              {KEY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            runner-up {draft.key.runner_up} · margin {draft.key.margin?.toFixed(3)}
            {draft.key.margin < 0.10 && ' — too close to call from audio alone'}
          </div>
        </div>

        {/* Time to hook (derived) */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Time to hook (derived)</label>
          <div className="px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-600">
            {derivedHook != null ? `${formatSeconds(derivedHook)} (${derivedHook.toFixed(1)}s)` : 'No chorus identified'}
          </div>
          <div className="text-xs text-gray-400 mt-1">Recomputes from the first chorus section</div>
        </div>

        {/* Structure confidence */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Structure confidence</label>
          <select
            value={draft.structure_confidence}
            onChange={e => update('structure_confidence', a => {
              a.structure_confidence = e.target.value as SongAnalysis['structure_confidence'];
              return a;
            })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800">
            {['high', 'clear', 'ambiguous', 'review', 'low'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="text-xs text-gray-400 mt-1">
&quot;low&quot; and &quot;review&quot; hide the section bar and hook marker from buyers
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-500">
            Sections ({draft.sections.length})
          </label>
          <span className="text-xs text-gray-400">
            Boundaries are contiguous — moving a start moves the previous end with it
          </span>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Start', 'End', 'Label', 'Energy', 'Stab.', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draft.sections.map((sec, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2">
                    <input
                      type="number" step="0.1" value={sec.start}
                      disabled={i === 0}
                      onChange={e => moveBoundary(i, parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-gray-200 rounded text-sm outline-none disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number" step="0.1" value={sec.end}
                      disabled={i === draft.sections.length - 1}
                      onChange={e => moveBoundary(i + 1, parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-gray-200 rounded text-sm outline-none disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={sec.label}
                      onChange={e => editSection(i, { label: e.target.value })}
                      className="px-2 py-1 border border-gray-200 rounded text-sm outline-none bg-white text-gray-800">
                      {SECTION_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{sec.energy?.toFixed(2)}</td>
                  <td className="px-3 py-2 text-gray-400">{sec.stability}/3</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button onClick={() => splitSection(i)}
                      className="text-xs text-blue-600 bg-transparent border-none cursor-pointer">Split</button>
                    {i < draft.sections.length - 1 && (
                      <button onClick={() => mergeWithNext(i)}
                        className="text-xs text-blue-600 bg-transparent border-none cursor-pointer ml-2">Merge ↓</button>
                    )}
                    <button onClick={() => deleteSection(i)}
                      className="text-xs text-red-500 bg-transparent border-none cursor-pointer ml-2">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vocal */}
      <div className="mb-6">
        <label className="block text-xs text-gray-500 mb-2">
          Vocal range<Confidence level={draft.vocal.confidence} />
        </label>
        <div className="grid grid-cols-5 gap-3">
          {([
            ['range_low', 'Low (5%)'],
            ['tessitura_low', 'Tess. low (25%)'],
            ['median', 'Median'],
            ['tessitura_high', 'Tess. high (75%)'],
            ['range_high', 'High (95%)'],
          ] as const).map(([field, label]) => {
            const value = draft.vocal[field] as string;
            const midi = noteToMidi(value);
            return (
              <div key={field}>
                <div className="text-xs text-gray-400 mb-1">{label}</div>
                <input
                  value={value}
                  onChange={e => update(`vocal.${field}`, a => {
                    (a.vocal as unknown as Record<string, string>)[field] = e.target.value;
                    return a;
                  })}
                  className={`w-full px-2 py-1 border rounded text-sm outline-none ${
                    midi === null ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                />
                <div className="text-xs text-gray-400 mt-[2px]">
                  {midi === null ? 'unreadable' : `MIDI ${midi}`}
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-gray-400 mt-2 max-w-2xl">
          {draft.vocal.frames_analyzed} confident frames analyzed. Extremes are estimated
          from a full mix and may reflect prominent harmonics rather than sung notes —
          if a vocal stem is ever submitted, re-run against the stem for sharper numbers.
        </div>
      </div>

      {/* Pitch paragraph */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-500">Pitch paragraph</label>
          <button
            onClick={() => setError('Regenerate needs the LLM step, which is not wired up yet — edit the text directly for now.')}
            className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white text-gray-500 cursor-pointer">
            Regenerate
          </button>
        </div>
        <textarea
          value={draft.pitch_paragraph || ''}
          onChange={e => update('pitch_paragraph', a => { a.pitch_paragraph = e.target.value; return a; })}
          rows={5}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none resize-y"
        />
        <div className="text-xs text-gray-400 mt-1">
          Three or four sentences. A committee member who has heard the song will beat
          the generated text — it exists to react to, not to publish unread.
        </div>
      </div>

      {/* Mix — internal reference only */}
      <details className="mb-6">
        <summary className="text-xs text-gray-500 cursor-pointer">Mix measurements (internal, not shown to buyers)</summary>
        <div className="grid grid-cols-4 gap-3 mt-3 text-sm">
          {[
            ['LUFS', draft.mix.lufs],
            ['True peak', `${draft.mix.true_peak_db} dB`],
            ['Crest', `${draft.mix.crest_db} dB`],
            ['Centroid', `${draft.mix.spectral_centroid_hz} Hz`],
            ['Side/mid', draft.mix.stereo_side_mid],
            ['Correlation', draft.mix.stereo_correlation],
            ['Bands', `${draft.mix.band_balance.low}/${draft.mix.band_balance.mid}/${draft.mix.band_balance.high}`],
            ['Source', `${draft.source_file.sample_rate / 1000}kHz ${draft.source_file.bit_depth}-bit`],
          ].map(([k, v]) => (
            <div key={String(k)} className="px-3 py-2 rounded-lg bg-gray-50">
              <div className="text-xs text-gray-400">{k}</div>
              <div className="text-gray-700">{String(v)}</div>
            </div>
          ))}
        </div>
        {draft.mix.lufs < -12 && (
          <div className="mt-2 text-xs text-amber-700">
            {draft.mix.lufs} LUFS with {draft.mix.crest_db} dB crest reads as a rough mix rather than a master.
          </div>
        )}
      </details>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        <button
          onClick={save}
          disabled={!!busy || !dirty}
          className="px-4 py-2 rounded-lg text-sm border-none"
          style={{
            background: busy || !dirty ? '#E5E7EB' : '#2563EB',
            color: busy || !dirty ? '#9CA3AF' : '#FFFFFF',
            cursor: busy || !dirty ? 'not-allowed' : 'pointer',
          }}>
          {busy === 'Saving…' ? 'Saving…' : 'Save changes'}
        </button>

        {approved ? (
          <button onClick={() => setApproval('unapprove')} disabled={!!busy}
            className="px-4 py-2 rounded-lg text-sm border border-gray-200 bg-white text-gray-600 cursor-pointer">
            Reopen for review
          </button>
        ) : (
          <button
            onClick={() => setApproval('approve')}
            disabled={!!busy || dirty}
            title={dirty ? 'Save your changes first' : undefined}
            className="px-4 py-2 rounded-lg text-sm border-none"
            style={{
              background: busy || dirty ? '#E5E7EB' : '#16A34A',
              color: busy || dirty ? '#9CA3AF' : '#FFFFFF',
              cursor: busy || dirty ? 'not-allowed' : 'pointer',
            }}>
            Approve for buyers
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }}
        />
        <button onClick={() => fileRef.current?.click()} disabled={!!busy}
          className="px-4 py-2 rounded-lg text-sm border border-gray-200 bg-white text-gray-600 cursor-pointer ml-auto">
          Re-import
        </button>
        <button onClick={discard} disabled={!!busy}
          className="px-4 py-2 rounded-lg text-sm border border-gray-200 bg-white text-red-500 cursor-pointer">
          Discard
        </button>
      </div>
      <div className="text-xs text-gray-400 mt-2">
        Re-importing keeps the pitch paragraph and any edits you have made. Editing an
        approved analysis returns it to review — buyers stop seeing it until you approve again.
      </div>
    </div>
  );
}
