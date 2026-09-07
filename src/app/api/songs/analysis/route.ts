import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  derivePromoted,
  validateAnalysis,
  freshAdminBlock,
  type SongAnalysis,
  type AnalysisStatus,
} from '@/data/analysis';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * `_promoted` is emitted by the offline pipeline as a convenience — it carries
 * the values destined for real columns, already converted. It is read on
 * import and then discarded: leaving it inside the JSONB would create a second
 * copy of the promoted values that silently goes stale the moment an admin
 * edits anything.
 */
function stripPromoted(raw: Record<string, unknown>): {
  analysis: SongAnalysis;
  promotedHint: Record<string, unknown> | null;
} {
  const { _promoted, ...rest } = raw;
  return {
    analysis: rest as unknown as SongAnalysis,
    promotedHint: (_promoted as Record<string, unknown>) ?? null,
  };
}

/**
 * POST — import an analysis file against a song.
 *
 * Re-importing discards prior DSP output but preserves the pitch paragraph and
 * any admin edits (spec §8.1) unless `overwrite` is set.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.songId || !body?.analysis) {
    return NextResponse.json({ error: 'Missing songId or analysis' }, { status: 400 });
  }

  const check = validateAnalysis(body.analysis);
  if (!check.ok) {
    return NextResponse.json({ error: check.errors.join('; '), errors: check.errors }, { status: 400 });
  }

  const supabase = getClient();
  const { data: existing, error: readErr } = await supabase
    .from('songs')
    .select('id, title, analysis')
    .eq('id', body.songId)
    .maybeSingle();

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: `No song with id ${body.songId}` }, { status: 404 });

  const { analysis, promotedHint } = stripPromoted(body.analysis as Record<string, unknown>);
  analysis.admin = analysis.admin ?? freshAdminBlock();

  const prior = existing.analysis as SongAnalysis | null;
  if (prior && !body.overwrite) {
    // Keep human work across a re-import.
    if (prior.pitch_paragraph) analysis.pitch_paragraph = prior.pitch_paragraph;
    if (prior.admin?.edited_fields?.length) analysis.admin = prior.admin;
  }

  // Status comes from the file's hint if it named one, else 'complete'. Never
  // 'approved' on import — approval is an explicit human act (§8.3).
  const hinted = promotedHint?.analysis_status as AnalysisStatus | undefined;
  const status: AnalysisStatus = hinted && hinted !== 'approved' ? hinted : 'complete';
  const promoted = derivePromoted(analysis, status);

  const { data, error } = await supabase
    .from('songs')
    .update({ analysis, ...promoted, updated_at: new Date().toISOString() })
    .eq('id', body.songId)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ song: data, warnings: check.warnings });
}

/**
 * PUT — save admin edits.
 *
 * Promoted columns are recomputed from the edited analysis rather than trusted
 * from the client, so they cannot drift from the JSONB they summarise.
 */
export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.songId || !body?.analysis) {
    return NextResponse.json({ error: 'Missing songId or analysis' }, { status: 400 });
  }

  const check = validateAnalysis(body.analysis);
  if (!check.ok) {
    return NextResponse.json({ error: check.errors.join('; ') }, { status: 400 });
  }

  const supabase = getClient();
  const { data: existing } = await supabase
    .from('songs')
    .select('analysis_status')
    .eq('id', body.songId)
    .maybeSingle();

  const analysis = body.analysis as SongAnalysis;
  // Editing an approved analysis returns it to 'complete': what buyers were
  // shown is no longer what a reviewer signed off on.
  const current = (existing?.analysis_status as AnalysisStatus) || 'complete';
  const status: AnalysisStatus = current === 'approved' ? 'complete' : current;
  const promoted = derivePromoted(analysis, status);

  const { data, error } = await supabase
    .from('songs')
    .update({ analysis, ...promoted, updated_at: new Date().toISOString() })
    .eq('id', body.songId)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: `No song with id ${body.songId}` }, { status: 404 });
  return NextResponse.json({ song: data, warnings: check.warnings });
}

/**
 * PATCH — approve for buyers, or send an approved analysis back for review.
 * Nothing reaches Composition mode without this (§8.3).
 */
export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { songId, action, reviewer } = body || {};
  if (!songId || !action) {
    return NextResponse.json({ error: 'Missing songId or action' }, { status: 400 });
  }

  const supabase = getClient();
  const { data: existing, error: readErr } = await supabase
    .from('songs')
    .select('analysis')
    .eq('id', songId)
    .maybeSingle();

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!existing?.analysis) {
    return NextResponse.json({ error: 'This song has no analysis to approve' }, { status: 400 });
  }

  const analysis = existing.analysis as SongAnalysis;
  const now = new Date().toISOString();

  if (action === 'approve') {
    analysis.admin = {
      ...(analysis.admin ?? freshAdminBlock()),
      reviewed: true,
      reviewed_by: reviewer || 'admin',
      reviewed_at: now,
    };
  } else if (action === 'unapprove') {
    analysis.admin = { ...(analysis.admin ?? freshAdminBlock()), reviewed: false };
  } else {
    return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
  }

  const status: AnalysisStatus = action === 'approve' ? 'approved' : 'complete';
  const promoted = derivePromoted(analysis, status);

  const { data, error } = await supabase
    .from('songs')
    .update({ analysis, ...promoted, updated_at: now })
    .eq('id', songId)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ song: data });
}

/**
 * DELETE — discard an analysis entirely, returning the song to 'pending'.
 */
export async function DELETE(request: NextRequest) {
  const songId = request.nextUrl.searchParams.get('songId');
  if (!songId) return NextResponse.json({ error: 'Missing songId' }, { status: 400 });

  const supabase = getClient();
  const { error } = await supabase
    .from('songs')
    .update({
      analysis: null,
      analysis_status: 'pending',
      tempo_bpm: null,
      key_display: null,
      time_to_hook_sec: null,
      vocal_range_low_midi: null,
      vocal_range_high_midi: null,
    })
    .eq('id', parseInt(songId, 10));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
