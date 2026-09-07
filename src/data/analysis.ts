/**
 * Song analysis — the object the DSP pipeline produces (spec §5).
 *
 * Everything here is a *draft*. Key detection is ambiguous on modal material,
 * tempo has a known half-time failure, and section labels come from a
 * heuristic over unsupervised clustering. Nothing reaches buyers until an
 * admin has reviewed it and set analysis_status to 'approved'.
 */

export type AnalysisStatus = 'pending' | 'running' | 'complete' | 'failed' | 'approved';
/** 'review' arrived with engine 1.1.0: the pipeline is not confident enough
 *  to publish the structure but does not consider it worthless either. */
export type Confidence = 'clear' | 'ambiguous' | 'high' | 'low' | 'review';

/** Structure confidences that must not reach a buyer unreviewed. */
export const UNTRUSTED_STRUCTURE: Confidence[] = ['low', 'review'];

export interface AnalysisSourceFile {
  sample_rate: number;
  channels: number;
  /** Null for a lossy source, which has no bit depth to report. */
  bit_depth: number | null;
  duration_sec: number;
  format: string;
  /** Engine 1.0.0 emitted a single flag; 1.1.0 emits an array. Both are read. */
  quality_flag?: string | null;
  quality_flags?: string[];
}

export interface AnalysisTempo {
  bpm: number;
  /** Present when the detected tempo is implausible enough that half or double
   *  it is equally likely. The admin resolves it with a toggle. */
  alt_bpm: number | null;
  confidence: Confidence;
}

export interface AnalysisKey {
  root: string;
  mode: string;
  display: string;
  runner_up: string;
  /** Correlation gap to the runner-up. Below 0.10 needs human confirmation. */
  margin: number;
  confidence: Confidence;
}

export interface AnalysisSection {
  start: number;
  end: number;
  label: string;
  energy: number;
  /** How many segmentation resolutions this boundary survived (1–3). */
  stability: number;
}

export interface AnalysisVocal {
  range_low: string;
  range_high: string;
  tessitura_low: string;
  tessitura_high: string;
  median: string;
  span_semitones: number;
  frames_analyzed: number;
  confidence: Confidence;
}

export interface AnalysisMix {
  lufs: number;
  true_peak_db: number;
  crest_db: number;
  stereo_side_mid: number;
  stereo_correlation: number;
  spectral_centroid_hz: number;
  band_balance: { low: number; mid: number; high: number };
}

export interface AnalysisAdmin {
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  /** Field paths an admin has changed, e.g. "tempo.bpm", "sections". Tells us
   *  which pipeline stages need work once there are enough songs to see it. */
  edited_fields: string[];
}

/** Why the pipeline was unsure about the structure. Engine 1.1.0 onward. */
export interface StructureDiagnostics {
  /** Energy gap between the chorus family and everything else. Small numbers
   *  mean the labelling had little to go on. */
  chorus_separation?: number;
  flags?: string[];
  /** How the sections were labelled. 'energy' is the primary path; when the
   *  energy profile is too flat to separate a chorus the engine falls back to
   *  'repetition', which finds repeats but cannot tell which repeat is the
   *  hook — those labels deserve a closer look. */
  method?: 'energy' | 'repetition' | string;
  /** Similarity threshold used by the repetition path. */
  threshold?: number;
  chorus_instances?: number;
  /** Fraction of the track the chorus family covers. Above ~0.6 the label has
   *  stopped meaning much. */
  chorus_coverage?: number;
  fallback_reason?: string;
}

export interface SongAnalysis {
  version: number;
  analyzed_at: string;
  engine_version: string;
  source_file: AnalysisSourceFile;
  tempo: AnalysisTempo;
  key: AnalysisKey;
  /** Exactly 160 floats, 0–1. */
  energy_curve: number[];
  sections: AnalysisSection[];
  structure_confidence: Confidence;
  time_to_hook_sec: number | null;
  vocal: AnalysisVocal;
  mix: AnalysisMix;
  structure_diagnostics?: StructureDiagnostics;
  pitch_paragraph: string | null;
  admin: AnalysisAdmin;
}

/** The columns the importer fills from an analysis object. */
export interface PromotedColumns {
  analysis_status: AnalysisStatus;
  tempo_bpm: number | null;
  key_display: string | null;
  time_to_hook_sec: number | null;
  vocal_range_low_midi: number | null;
  vocal_range_high_midi: number | null;
}

/** Labels the section editor offers. "section" is the honest fallback the
 *  pipeline uses when it will not guess. */
export const SECTION_LABELS = [
  'intro', 'verse', 'pre', 'chorus', 'bridge', 'outro', 'section',
] as const;

export const KEY_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const KEY_MODES = ['major', 'minor'];

const SEMITONES: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

/**
 * "A#3" → 58. Accepts ♯/♭ as well as #/b since the pipeline emits both
 * spellings depending on the field.
 */
export function noteToMidi(note: string): number | null {
  if (!note) return null;
  const cleaned = note.trim().replace(/♯/g, '#').replace(/♭/g, 'b');
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(cleaned);
  if (!m) return null;
  const letter = m[1].toUpperCase() + m[2];
  const semitone = SEMITONES[letter];
  if (semitone === undefined) return null;
  const octave = parseInt(m[3], 10);
  // MIDI 60 is C4, the convention librosa's note_to_midi uses.
  return (octave + 1) * 12 + semitone;
}

const MIDI_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** 58 → "A#3". */
export function midiToNote(midi: number): string {
  const rounded = Math.round(midi);
  const octave = Math.floor(rounded / 12) - 1;
  return `${MIDI_NAMES[((rounded % 12) + 12) % 12]}${octave}`;
}

/** Seconds → "0:38". */
export function formatSeconds(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '—';
  const total = Math.round(sec);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Time to hook is derived, never stored independently: it is the start of the
 * first chorus, so editing the sections has to move it.
 */
export function deriveTimeToHook(sections: AnalysisSection[]): number | null {
  const chorus = sections.find(s => s.label === 'chorus');
  return chorus ? chorus.start : null;
}

/**
 * Compute the promoted columns from an analysis object.
 *
 * `_promoted` in an imported file is a convenience from the offline pipeline,
 * not part of the schema — it is read on import and then discarded. After an
 * admin edits anything these values must be recomputed from the analysis
 * itself, or the columns drift away from the JSONB they claim to summarise.
 */
export function derivePromoted(
  analysis: SongAnalysis,
  status: AnalysisStatus
): PromotedColumns {
  return {
    analysis_status: status,
    tempo_bpm: analysis.tempo?.bpm ?? null,
    key_display: analysis.key?.display ?? null,
    time_to_hook_sec: deriveTimeToHook(analysis.sections || []),
    vocal_range_low_midi: analysis.vocal?.range_low ? noteToMidi(analysis.vocal.range_low) : null,
    vocal_range_high_midi: analysis.vocal?.range_high ? noteToMidi(analysis.vocal.range_high) : null,
  };
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Check an imported file before it touches the database. Deliberately strict
 * about shape and lenient about values: a wrong tempo is the admin's job to
 * fix, but a missing sections array would break the editor.
 */
export function validateAnalysis(input: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof input !== 'object' || input === null) {
    return { ok: false, errors: ['File is not a JSON object'], warnings };
  }
  const a = input as Partial<SongAnalysis> & Record<string, unknown>;

  if (typeof a.version !== 'number') errors.push('Missing "version"');
  if (!Array.isArray(a.energy_curve)) {
    errors.push('Missing "energy_curve"');
  } else if (a.energy_curve.length !== 160) {
    warnings.push(`energy_curve has ${a.energy_curve.length} points, expected 160`);
  }
  if (!Array.isArray(a.sections)) {
    errors.push('Missing "sections"');
  } else if (a.sections.length === 0) {
    warnings.push('No sections — the arc will render without a section bar');
  }
  if (!a.tempo || typeof a.tempo.bpm !== 'number') errors.push('Missing "tempo.bpm"');
  if (!a.key || typeof a.key.display !== 'string') errors.push('Missing "key.display"');
  if (!a.vocal || typeof a.vocal.range_low !== 'string') errors.push('Missing "vocal.range_low"');
  if (typeof a.pitch_paragraph !== 'string') warnings.push('No pitch paragraph in this file');

  if (a.vocal?.range_low && noteToMidi(a.vocal.range_low) === null) {
    errors.push(`Could not read vocal.range_low ("${a.vocal.range_low}") as a note`);
  }
  if (a.vocal?.range_high && noteToMidi(a.vocal.range_high) === null) {
    errors.push(`Could not read vocal.range_high ("${a.vocal.range_high}") as a note`);
  }

  // Above 0 dBFS the master is clipping — worth an admin's eye even though the
  // mix block itself is internal.
  if (a.mix && typeof a.mix.true_peak_db === 'number' && a.mix.true_peak_db > 0) {
    warnings.push(`True peak is +${a.mix.true_peak_db} dB — the master is clipping`);
  }

  if (a.structure_confidence && UNTRUSTED_STRUCTURE.includes(a.structure_confidence)) {
    warnings.push(
      `Structure confidence is "${a.structure_confidence}" — sections and time to hook `
      + 'need checking, and buyers see the curve without them until this is raised'
    );
  }
  const diag = a.structure_diagnostics as StructureDiagnostics | undefined;
  if (diag?.chorus_separation != null && diag.chorus_separation < 0.15) {
    warnings.push(
      `Chorus separation is only ${diag.chorus_separation} — the choruses barely stand `
      + 'out from the rest, so the labels are a guess'
    );
  }
  for (const flag of diag?.flags || []) {
    warnings.push(`Structure flag: ${flag.replace(/_/g, ' ')}`);
  }
  if (diag?.method === 'repetition') {
    warnings.push(
      'Sections were labelled by repetition, not energy'
      + (diag.fallback_reason ? ` (${diag.fallback_reason.replace(/_/g, ' ')})` : '')
      + ' — the engine found repeats but cannot tell which one is the hook'
    );
  }
  if (diag?.chorus_coverage != null && diag.chorus_coverage > 0.6) {
    warnings.push(
      `Chorus covers ${Math.round(diag.chorus_coverage * 100)}% of the track — `
      + 'too much of the song is labelled chorus for the label to mean anything'
    );
  }
  if (Array.isArray(a.sections) && a.sections.length > 0
      && !a.sections.some(sec => sec.label === 'chorus')) {
    warnings.push('No chorus was identified — there is no time to hook to show');
  }
  if (a.vocal?.confidence === 'low') {
    warnings.push(`Vocal confidence is low (${a.vocal.frames_analyzed} frames analyzed)`);
  }
  if (a.tempo?.alt_bpm) {
    warnings.push(`Tempo is ambiguous — ${a.tempo.bpm} or ${a.tempo.alt_bpm} BPM`);
  }
  if (a.key?.confidence === 'ambiguous') {
    warnings.push(`Key is ambiguous — ${a.key.display} vs ${a.key.runner_up}`);
  }
  if (a.source_file) {
    const { sample_rate: rate, bit_depth: depth, format } = a.source_file;
    if (typeof rate === 'number' && rate < 44100) {
      warnings.push(`Source is ${rate}Hz — below master quality`);
    }
    // A lossy source reports no bit depth; null there is expected, not a fault.
    if (typeof depth === 'number' && depth < 16) {
      warnings.push(`Source is ${depth}-bit — below master quality`);
    }
    if (format && /mp3|m4a|aac|ogg/i.test(format)) {
      warnings.push(`Source is ${format} — analysis ran on a lossy file, not a master`);
    }
    // Engine 1.1.0 reports its own quality findings; surface any we have not
    // already said in plainer words.
    const flags = a.source_file.quality_flags || (a.source_file.quality_flag ? [a.source_file.quality_flag] : []);
    for (const flag of flags) {
      if (flag === 'lossy_source' || flag === 'clipping') continue; // covered above
      warnings.push(`Source flag: ${flag.replace(/_/g, ' ')}`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Blank admin block for a freshly imported analysis. */
export function freshAdminBlock(): AnalysisAdmin {
  return { reviewed: false, reviewed_by: null, reviewed_at: null, edited_fields: [] };
}
