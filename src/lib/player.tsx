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
  }, [startProgress, stopProgress]);

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
    };
  }, [stopProgress]);

  return (
    <PlayerContext.Provider value={{
      activeSong, isPlaying, progress, duration, currentTime, previewMode,
      playSong, pause, toggle, seek, skipForward, skipBack, setPreviewMode: updatePreviewMode,
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
