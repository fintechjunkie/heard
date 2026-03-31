'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Song } from '@/data/types';
import { SONGS as SEED_SONGS } from '@/data/songs';

interface StoreState {
  songs: Song[];
  savedSongIds: number[];
  activeTab: string;
  searchQuery: string;
  searchOpen: boolean;
  activeGenre: string;
  sortMode: string;
  toastMessage: string | null;
  artistReactions: Record<number, string>;
  dealRoomReaction: string | null;
  dealRoomNote: string;
}

interface StoreActions {
  setSongs: (songs: Song[]) => void;
  toggleSave: (songId: number) => void;
  reserveSong: (songId: number) => void;
  purchaseSong: (songId: number) => void;
  releaseReserve: (songId: number) => void;
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
  setActiveGenre: (genre: string) => void;
  setSortMode: (mode: string) => void;
  showToast: (message: string) => void;
  setArtistReaction: (songId: number, reaction: string | null) => void;
  setDealRoomReaction: (reaction: string | null) => void;
  setDealRoomNote: (note: string) => void;
  getFilteredSongs: () => Song[];
  getStats: () => { available: number; held: number; bought: number };
}

const StoreContext = createContext<(StoreState & StoreActions) | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(`theheard_${key}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`theheard_${key}`, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [songs, setSongsState] = useState<Song[]>(() => {
    const stored = loadFromStorage<Song[]>('songs', SEED_SONGS);
    // Validate stored songs have proper ids; fall back to seed if broken
    const validStored = stored.filter(s => s.id != null && !isNaN(s.id));
    if (validStored.length === 0 && SEED_SONGS.length > 0) return SEED_SONGS;
    return validStored.length > 0 ? validStored : SEED_SONGS;
  });
  const [savedSongIds, setSavedSongIds] = useState<number[]>(() => loadFromStorage('saved', [1, 2, 6]));
  const [activeTab, setActiveTab] = useState('bank');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeGenre, setActiveGenre] = useState('all');
  const [sortMode, setSortMode] = useState('default');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [artistReactions, setArtistReactionsState] = useState<Record<number, string>>(
    () => loadFromStorage('artistReactions', { 1: 'musthave' })
  );
  const [dealRoomReaction, setDealRoomReaction] = useState<string | null>(null);
  const [dealRoomNote, setDealRoomNote] = useState('');

  // Persist to localStorage
  useEffect(() => { saveToStorage('songs', songs); }, [songs]);
  useEffect(() => { saveToStorage('saved', savedSongIds); }, [savedSongIds]);
  useEffect(() => { saveToStorage('artistReactions', artistReactions); }, [artistReactions]);

  const setSongs = useCallback((newSongs: Song[]) => {
    setSongsState(newSongs);
  }, []);

  const toggleSave = useCallback((songId: number) => {
    setSavedSongIds(prev => {
      const next = prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId];
      return next;
    });
  }, []);

  const reserveSong = useCallback((songId: number) => {
    setSongsState(prev => prev.map(s =>
      s.id === songId
        ? {
            ...s,
            status: 'reserved' as const,
            reserved_by: 1,
            reserved_until: new Date(Date.now() + 72 * 3600000).toISOString(),
          }
        : s
    ));
  }, []);

  const purchaseSong = useCallback((songId: number) => {
    setSongsState(prev => prev.map(s =>
      s.id === songId
        ? {
            ...s,
            status: 'purchased' as const,
            reserved_by: null,
            reserved_until: null,
            purchased_by: 1,
            purchased_at: new Date().toISOString(),
          }
        : s
    ));
  }, []);

  const releaseReserve = useCallback((songId: number) => {
    setSongsState(prev => prev.map(s =>
      s.id === songId
        ? {
            ...s,
            status: 'available' as const,
            reserved_by: null,
            reserved_until: null,
          }
        : s
    ));
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2800);
  }, []);

  const setArtistReaction = useCallback((songId: number, reaction: string | null) => {
    setArtistReactionsState(prev => {
      const next = { ...prev };
      if (reaction === null) {
        delete next[songId];
      } else {
        next[songId] = reaction;
      }
      return next;
    });

    // Auto-flag song for positive reactions
    if (reaction && ['musthave', 'hit', 'love'].includes(reaction)) {
      setSongsState(prev => prev.map(s =>
        s.id === songId
          ? { ...s, artistFlagged: true, artistFlagTime: 'Just now' }
          : s
      ));
    }
  }, []);

  const getFilteredSongs = useCallback(() => {
    let filtered = [...songs];

    // Tab filter
    if (activeTab === 'saved') {
      filtered = filtered.filter(s => savedSongIds.includes(s.id));
    } else if (activeTab === 'reserved') {
      filtered = filtered.filter(s => s.status === 'reserved');
    } else if (activeTab === 'purchased') {
      filtered = filtered.filter(s => s.status === 'purchased');
    }

    // Genre filter
    if (activeGenre === 'new') {
      filtered = filtered.filter(s => s.days_in_bank <= 30 && s.status !== 'purchased');
    } else if (activeGenre !== 'all') {
      filtered = filtered.filter(s => s.genre === activeGenre);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.writers.some(w => w.toLowerCase().includes(q)) ||
        s.genre.toLowerCase().includes(q) ||
        s.mood.some(m => m.toLowerCase().includes(q)) ||
        s.bpm.toString() === q ||
        s.key.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortMode) {
      case 'closing':
        filtered.sort((a, b) => a.tier1_days_remaining - b.tier1_days_remaining);
        break;
      case 'bpm-low':
        filtered.sort((a, b) => a.bpm - b.bpm);
        break;
      case 'bpm-high':
        filtered.sort((a, b) => b.bpm - a.bpm);
        break;
      case 'writer-az':
        filtered.sort((a, b) => a.writers[0].localeCompare(b.writers[0]));
        break;
    }

    return filtered;
  }, [songs, activeTab, savedSongIds, activeGenre, searchQuery, sortMode]);

  const getStats = useCallback(() => {
    return {
      available: songs.filter(s => s.status === 'available').length,
      held: songs.filter(s => s.status === 'reserved').length,
      bought: songs.filter(s => s.status === 'purchased').length,
    };
  }, [songs]);

  return (
    <StoreContext.Provider value={{
      songs, savedSongIds, activeTab, searchQuery, searchOpen,
      activeGenre, sortMode, toastMessage, artistReactions,
      dealRoomReaction, dealRoomNote,
      setSongs, toggleSave, reserveSong, purchaseSong, releaseReserve,
      setActiveTab, setSearchQuery, setSearchOpen, setActiveGenre,
      setSortMode, showToast, setArtistReaction, setDealRoomReaction,
      setDealRoomNote, getFilteredSongs, getStats,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
