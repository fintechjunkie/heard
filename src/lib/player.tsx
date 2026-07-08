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

  // ── Web Audio analyser (for audio-reactive visualizers) ──
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const connectedNodeRef = useRef<HTMLMediaElement | null>(null);

  // Lazily build a shared AudioContext + AnalyserNode and splice the playing
  // <audio> element into it: source → analyser → destination. Wrapped in
  // try/catch so any failure (no Web Audio, CORS-tainted stream) leaves the
  // analyser null and the visualizer falls back to a synthetic signal.
  const setupAnalyser = useCallback((howl: Howl) => {
    try {
      const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const AC = w.AudioContext || w.webkitAudioContext;
      if (!AC) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const actx = audioCtxRef.current;
      if (actx.state === 'suspended') actx.resume();
      if (!analyserRef.current) {
        const an = actx.createAnalyser();
        an.fftSize = 128; // 64 frequency bins
        an.smoothingTimeConstant = 0.82;
        an.connect(actx.destination);
        analyserRef.current = an;
        freqRef.current = new Uint8Array(an.frequencyBinCount);
      }
      // Howler's HTML5 audio element lives on a private field.
      const node = (howl as unknown as { _sounds?: Array<{ _node?: HTMLMediaElement }> })
        ._sounds?.[0]?._node;
      if (node && node !== connectedNodeRef.current) {
        try { node.crossOrigin = 'anonymous'; } catch { /* ignore */ }
        const src = actx.createMediaElementSource(node);
        src.connect(analyserRef.current);
        connectedNodeRef.current = node;
      }
    } catch { /* analyser unavailable — visualizer uses synthetic fallback */ }
  }, []);

  const getFrequencyData = useCallback((): Uint8Array | null => {
    const an = analyserRef.current;
    if (!an || !freqRef.current) return null;
    an.getByteFrequencyData(freqRef.current);
    return freqRef.current;
  }, []);

  // Keep ref in sync with state
  const updatePreviewMode = useCallback((preview: boolean) => {
    setPreviewMode(preview);
    previewModeRef.current = preview;
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
      if (howlRef.current) {
        const playing = howlRef.current.playing();
        const seekPos = howlRef.current.seek() as number;
        const dur = howlRef.current.duration();
        if (dur > 0) {
          setCurrentTime(seekPos);
          setDuration(dur);
          setProgress((seekPos / dur) * 100);

          // 20-second preview limit on main page
          if (previewModeRef.current && seekPos >= 20) {
            howlRef.current.pause();
            setIsPlaying(false);
            return; // Stop the animation loop
          }
        }
        if (playing) {
          rafRef.current = requestAnimationFrame(update);
        }
      }
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
        setIsPlaying(true);
        startProgress();
        setupAnalyser(howl);
      },
      onpause: () => {
        setIsPlaying(false);
        stopProgress();
      },
      onend: () => {
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
    setActiveSong(song);
    setProgress(seekPercent || 0);
    setCurrentTime(0);
    setDuration(0);
    howl.play();
  }, [startProgress, stopProgress, setupAnalyser]);

  const pause = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.pause();
    }
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
        if (previewModeRef.current && seekTime > 20) {
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
      const cur = howlRef.current.seek() as number;
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
      const cur = howlRef.current.seek() as number;
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
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
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

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
