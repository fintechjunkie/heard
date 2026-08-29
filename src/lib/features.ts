/**
 * ─────────────────────────────────────────────────────────────
 * FEATURE FLAGS
 * ─────────────────────────────────────────────────────────────
 *
 * `SIMPLIFIED` is the master switch. Flip it to `false` to restore the
 * full-featured app (deal rooms, teams, reserve/buy) with no other edits.
 *
 * Nothing is deleted when a feature is off — the components, API routes and
 * database tables all stay in place, they simply stop being rendered. Turning
 * a feature back on is a one-line change here.
 *
 * The pre-simplification build is also tagged in git as `v1-full`.
 */

/** Master switch. `true` = the stripped-down build. */
export const SIMPLIFIED: boolean = true;

/**
 * ⚠️  SHARED DEMO PASSWORD  ⚠️
 *
 * While this is set, per-user Supabase sign-in is bypassed: ANY email address
 * gets in as long as the password matches this exact string. Everyone shares
 * one credential, so there are no real user identities on this build — the top
 * nav falls back to the email that was typed at the door.
 *
 * The gate is a plain browser cookie, which anyone can set by hand. Treat this
 * as a speed bump for demos, not as access control, and don't put anything
 * behind it you'd mind a stranger seeing.
 *
 * Set to `null` to restore normal Supabase sign-in.
 */
export const SHARED_PASSWORD: string | null = 'Heard1970!';

/** Cookie that marks a browser as having cleared the shared-password gate. */
export const DEMO_SESSION_COOKIE = 'heard_demo_session';

/**
 * Deliberately typed as `boolean` rather than left to literal inference: that
 * keeps both sides of every `FEATURES.x ? a : b` type-checked no matter which
 * way a flag is currently set, so flipping one can never surface a stale
 * branch that no longer compiles.
 */
export const FEATURES: Record<FeatureName, boolean> = {
  /** Song Bank list, waveforms, player, search / genre / sort. Always on. */
  songBank: true,

  /** Pocket Songs tab: queue, visualizers, theme chips, full-length playback. */
  pocket: true,

  /** The Collective / writer profiles. */
  writers: true,

  /**
   * Team deal rooms: votes, comments, the Deals button in the top nav, the
   * per-card Deals action, and the TeamPicker gate on launch.
   * Backed by deal_rooms / deal_room_reactions / deal_room_comments.
   */
  dealRooms: !SIMPLIFIED,

  /**
   * Team selection. Deal rooms are the only consumer today, so this rides
   * along with them — split it out if teams gain their own surface.
   */
  teams: !SIMPLIFIED,

  /**
   * Commerce: reserve sheet, 72-hour hold countdown, buy flow, rights
   * passport, and the Reserved + Purchased tabs. Currently client-side only.
   */
  commerce: !SIMPLIFIED,

  /** Price and availability counts on cards and in the stats strip. */
  pricing: !SIMPLIFIED,

  /**
   * Writer credentials on profile pages: the streams and awards counters,
   * the Awards chips, and the Notable Hits chart.
   */
  memberCredentials: !SIMPLIFIED,

  /** Tier badges and Tier 1 / Tier 2 labelling throughout. */
  tiers: !SIMPLIFIED,

  /**
   * Whether a reaction is a signal to other people. When off, reacting is a
   * private bookmark: no "your team sees this" toast, no shared-with-team
   * caption, and no artist-flag banner on the song card.
   */
  sharedReactions: !SIMPLIFIED,

  /**
   * How recently a song entered the bank: the "✦ New" tag and genre chip,
   * and the "Added N days ago" detail row.
   */
  songRecency: !SIMPLIFIED,
};

export type FeatureName =
  | 'songBank'
  | 'pocket'
  | 'writers'
  | 'dealRooms'
  | 'teams'
  | 'commerce'
  | 'pricing'
  | 'memberCredentials'
  | 'tiers'
  | 'sharedReactions'
  | 'songRecency';
