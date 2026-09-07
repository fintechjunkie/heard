'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { Howl } from 'howler';
import { Song } from '@/data/types';

interface PlayerState {
  activeSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  previewMode: boolean;
}

interface PlayerActions {
  playSong: (song: Song, seekPercent?: number) => void;
  pause: () => void;
  toggle: (song: Song) => void;
  seek: (percent: number) => void;
  skipForward: (seconds?: number) => void;
  skipBack: (seconds?: number) => void;
  setPreviewMode: (preview: boolean) => void;
  /** Live FFT frequency data (0–255) for the active track, or null if the
   *  Web Audio analyser is unavailable (e.g. blocked by CORS). Visualizers
   *  fall back to a synthetic signal when this returns null or all-zeros. */
  getFrequencyData: () => Uint8Array | null;
}

const PlayerContext = createContext<(PlayerState & PlayerActions) | null>(null);

/**
 * Log that a track was started. Fire-and-forget: playback must never wait on
 * this, and a missing song_plays table must not surface as an error.
 *
 * Called from playSong only, so resuming after a pause is not counted as a
 * second play — one row per time a track is actually put on.
 */
function recordPlay(songId: number) {
  if (typeof window === 'undefined') return;
  let userEmail = '';
  try { userEmail = localStorage.getItem('theheard_demoEmail') || ''; } catch { /* ignore */ }
  void fetch('/api/plays', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songId, userEmail }),
    // Survive the page being backgrounded or navigated immediately after a
    // tap, which mobile browsers otherwise treat as a cancelled request.
    keepalive: true,
  }).catch(() => { /* tracking is best-effort */ });
}

/**
 * Current playback position in seconds.
 *
 * Howler's own seek() returns a value it cached at play() time while its
 * internal play-lock is held, which on html5 sources can persist for the whole
 * track — the position only refreshes on pause, which is why the progress bar
 * appeared to jump forward only when paused. The underlying <audio> element's
 * currentTime is always live, so prefer it and fall back to seek() if Howler's
 * internals ever move.
 */
function readPosition(howl: Howl): number {
  const node = (howl as unknown as { _sounds?: { _node?: { currentTime?: number } }[] })
    ._sounds?.[0]?._node;
  if (node && typeof node.currentTime === 'number' && !Number.isNaN(node.currentTime)) {
    return node.currentTime;
  }
  const fallback = howl.seek() as number;
  return typeof fallback === 'number' && !Number.isNaN(fallback) ? fallback : 0;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [previewMode, setPreviewMode] = useState(true);
  const howlRef = useRef<Howl | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeSongIdRef = useRef<number | null>(null);
  const pendingSeekRef = useRef<number | undefined>(undefined);
  const previewModeRef = useRef(true);
  /** Whether THIS playback session is preview-limited. Captured when playback
   *  starts so that later mode changes — e.g. leaving Crate while a
   *  track is mid-play — cannot retroactively cut it off. */
  const previewLockRef = useRef(true);
  /** Mirrors isPlaying for the rAF loop. Howler's own playing() briefly
   *  reports false while an html5 element is starting, so polling it to decide
   *  whether to schedule the next frame kills the loop on the first frame. */
  const isPlayingRef = useRef(false);
  /** Whether the current track has already been counted as a play. */
  const playRecordedRef = useRef(false);

  // NOTE: Real Web Audio analysis is intentionally NOT wired up. Splicing
  // Howler's <audio> element into an AnalyserNode (source → analyser →
  // destination) silences cross-origin media — and the master files are served
  // from Vercel Blob (cross-origin) — unless CORS is negotiated before the
  // element loads, which Howler's html5 mode doesn't let us do cleanly. Doing
  // it muted playback in production. So getFrequencyData() returns null and the
  // visualizer runs on its synthetic signal. Revisit only with same-origin
  // audio or a verified CORS pipeline (see design-pass notes).
  const getFrequencyData = useCallback((): Uint8Array | null => null, []);

  // Keep ref in sync with state
  const updatePreviewMode = useCallback((preview: boolean) => {
    setPreviewMode(preview);
    previewModeRef.current = preview;
    // Lifting preview must also release whatever is playing right now.
    // Otherwise a track started in the bank keeps the 20s cap it was given at
    // playSong time, and stalls mid-song once carried into Crate.
    //
    // The reverse deliberately does not apply: turning preview back on (which
    // happens on leaving the Crate) leaves the current track uncapped, so it is
    // not cut off mid-play. The cap returns with the next track started.
    if (!preview) previewLockRef.current = false;
  }, []);

  const stopProgress = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    stopProgress();
    const update = () => {
      if (!howlRef.current || !isPlayingRef.current) {
        rafRef.current = null;
        return;
      }

      const seekPos = readPosition(howlRef.current);
      const dur = howlRef.current.duration();
      if (dur > 0) {
        setCurrentTime(seekPos);
        setDuration(dur);
        setProgress((seekPos / dur) * 100);

        // 20-second preview limit, decided when this track started playing.
        if (previewLockRef.current && seekPos >= 20) {
          howlRef.current.pause();
          isPlayingRef.current = false;
          setIsPlaying(false);
          rafRef.current = null;
          return;
        }
      }

      // Keep polling until onpause/onend/onstop clears isPlayingRef. Asking
      // Howler whether it is playing would end the loop during the html5
      // start-up lock, freezing the progress bar for the whole track.
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
  }, [stopProgress]);

  const playSong = useCallback((song: Song, seekPercent?: number) => {
    // Stop existing
    if (howlRef.current) {
      howlRef.current.stop();
      howlRef.current.unload();
      howlRef.current = null;
    }
    stopProgress();

    // Store the pending seek for after load
    pendingSeekRef.current = seekPercent;

    // Lock in whether this track is preview-limited for its whole session.
    previewLockRef.current = previewModeRef.current;

    // Extract format hint from file extension
    const ext = song.audio_url.split('.').pop()?.toLowerCase();
    const format = ext && ['wav', 'mp3', 'ogg', 'webm', 'flac', 'aac'].includes(ext) ? [ext] : undefined;

    const howl = new Howl({
      src: [song.audio_url],
      html5: true,
      format,
      onload: () => {
        const dur = howl.duration();
        setDuration(dur);
        // Apply pending seek after load when duration is known
        if (pendingSeekRef.current !== undefined && pendingSeekRef.current > 0 && dur > 0) {
          const seekTime = (pendingSeekRef.current / 100) * dur;
          howl.seek(seekTime);
          setCurrentTime(seekTime);
          setProgress(pendingSeekRef.current);
        }
        pendingSeekRef.current = undefined;
      },
      onplay: () => {
        isPlayingRef.current = true;
        setIsPlaying(true);
        startProgress();
        // Count the play here rather than when the track was requested: on
        // mobile, playback can be deferred or refused after playSong runs, so
        // recording earlier logged plays that never happened. The flag is
        // reset per track, so resuming after a pause is still not recounted.
        if (!playRecordedRef.current) {
          playRecordedRef.current = true;
          recordPlay(song.id);
        }
      },
      onpause: () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        stopProgress();
      },
      onstop: () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        stopProgress();
      },
      onend: () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        stopProgress();
      },
      onloaderror: (_id: number, err: unknown) => {
        console.warn(`Audio file not found: ${song.audio_url}`, err);
      },
    });

    howlRef.current = howl;
    activeSongIdRef.current = song.id;
    playRecordedRef.current = false;
    setActiveSong(song);
    setProgress(seekPercent || 0);
    setCurrentTime(0);
    setDuration(0);
    howl.play();
  }, [startProgress, stopProgress]);

  const pause = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.pause();
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
    stopProgress();
  }, [stopProgress]);

  const toggle = useCallback((song: Song) => {
    // Use ref for immediate comparison (avoids stale closure)
    if (activeSongIdRef.current === song.id) {
      if (howlRef.current) {
        if (howlRef.current.playing()) {
          pause();
        } else {
          howlRef.current.play();
        }
      }
    } else {
      playSong(song);
    }
  }, [pause, playSong]);

  const seek = useCallback((percent: number) => {
    if (howlRef.current) {
      const dur = howlRef.current.duration();
      if (dur > 0) {
        let seekTime = (percent / 100) * dur;
        // Cap at 20s in preview mode
        if (previewLockRef.current && seekTime > 20) {
          seekTime = 20;
          percent = (20 / dur) * 100;
        }
        howlRef.current.seek(seekTime);
        setCurrentTime(seekTime);
        setDuration(dur);
        setProgress(percent);
      }
    }
  }, []);

  const skipForward = useCallback((seconds = 10) => {
    if (howlRef.current) {
      const dur = howlRef.current.duration();
      const cur = readPosition(howlRef.current);
      if (dur > 0) {
        const newTime = Math.min(dur, cur + seconds);
        howlRef.current.seek(newTime);
        setCurrentTime(newTime);
        setProgress((newTime / dur) * 100);
      }
    }
  }, []);

  const skipBack = useCallback((seconds = 10) => {
    if (howlRef.current) {
      const dur = howlRef.current.duration();
      const cur = readPosition(howlRef.current);
      if (dur > 0) {
        const newTime = Math.max(0, cur - seconds);
        howlRef.current.seek(newTime);
        setCurrentTime(newTime);
        setProgress((newTime / dur) * 100);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (howlRef.current) {
        howlRef.current.stop();
        howlRef.current.unload();
      }
      stopProgress();
    };
  }, [stopProgress]);

  return (
    <PlayerContext.Provider value={{
      activeSong, isPlaying, progress, duration, currentTime, previewMode,
      playSong, pause, toggle, seek, skipForward, skipBack, setPreviewMode: updatePreviewMode,
      getFrequencyData,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

/** Seconds → "3:07". Falsy or non-finite input renders as "0:00". */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
