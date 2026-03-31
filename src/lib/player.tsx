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
}

interface PlayerActions {
  playSong: (song: Song, seekPercent?: number) => void;
  pause: () => void;
  toggle: (song: Song) => void;
  seek: (percent: number) => void;
}

const PlayerContext = createContext<(PlayerState & PlayerActions) | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const howlRef = useRef<Howl | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopProgress = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    stopProgress();
    const update = () => {
      if (howlRef.current && howlRef.current.playing()) {
        const seek = howlRef.current.seek() as number;
        const dur = howlRef.current.duration();
        setCurrentTime(seek);
        setDuration(dur);
        setProgress(dur > 0 ? (seek / dur) * 100 : 0);
        rafRef.current = requestAnimationFrame(update);
      }
    };
    rafRef.current = requestAnimationFrame(update);
  }, [stopProgress]);

  const playSong = useCallback((song: Song, seekPercent?: number) => {
    // Stop existing
    if (howlRef.current) {
      howlRef.current.stop();
      howlRef.current.unload();
    }
    stopProgress();

    // Extract format hint from file extension
    const ext = song.audio_url.split('.').pop()?.toLowerCase();
    const format = ext && ['wav', 'mp3', 'ogg', 'webm', 'flac', 'aac'].includes(ext) ? [ext] : undefined;

    const howl = new Howl({
      src: [song.audio_url],
      html5: true,
      format,
      onplay: () => {
        setIsPlaying(true);
        // If an initial seek was requested, apply it once playback starts
        if (seekPercent !== undefined && seekPercent > 0) {
          const dur = howl.duration();
          if (dur > 0) {
            const seekTime = (seekPercent / 100) * dur;
            howl.seek(seekTime);
            setCurrentTime(seekTime);
            setProgress(seekPercent);
          }
        }
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
      onloaderror: () => {
        // If audio file not found, still set as active for UI demo
        console.warn(`Audio file not found: ${song.audio_url}`);
      },
    });

    howlRef.current = howl;
    setActiveSong(song);
    setProgress(seekPercent || 0);
    setCurrentTime(0);
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
    if (activeSong?.id === song.id) {
      if (isPlaying) {
        pause();
      } else if (howlRef.current) {
        howlRef.current.play();
      }
    } else {
      playSong(song);
    }
  }, [activeSong, isPlaying, pause, playSong]);

  const seek = useCallback((percent: number) => {
    if (howlRef.current && duration > 0) {
      const seekTime = (percent / 100) * duration;
      howlRef.current.seek(seekTime);
      setCurrentTime(seekTime);
      setProgress(percent);
    }
  }, [duration]);

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
      activeSong, isPlaying, progress, duration, currentTime,
      playSong, pause, toggle, seek,
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
