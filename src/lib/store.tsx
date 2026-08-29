'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Song, Member } from '@/data/types';
import { SONGS as SEED_SONGS } from '@/data/songs';
import { MEMBERS as SEED_MEMBERS } from '@/data/members';

interface StoreState {
  songs: Song[];
  members: Member[];
  savedSongIds: number[];
  artistQueue: number[];
  /** Songs the user has waved off. They stay in the bank, collapsed and
   *  pushed below the live list, and can be restored at any time. */
  noInterestIds: number[];
  /** Pocket Songs player appearance. Persisted so a chosen look survives
   *  leaving the tab, which unmounts the player. */
  pocketTheme: string;
  pocketVizMode: string;
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
  setMembers: (members: Member[]) => void;
  toggleSave: (songId: number) => void;
  toggleNoInterest: (songId: number) => void;
  setPocketTheme: (theme: string) => void;
  setPocketVizMode: (mode: string) => void;
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
  toggleArtistQueue: (songId: number) => void;
  clearArtistQueue: () => void;
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
  const [songs, setSongsState] = useState<Song[]>(SEED_SONGS);
  // Seeded from the static file, then replaced by the DB rows — which is where
  // admin-uploaded avatar_url / banner_url live.
  const [members, setMembersState] = useState<Member[]>(SEED_MEMBERS);
  const [savedSongIds, setSavedSongIds] = useState<number[]>(() => loadFromStorage('saved', []));
  const [noInterestIds, setNoInterestIds] = useState<number[]>(() => loadFromStorage('noInterest', []));
  const [pocketTheme, setPocketTheme] = useState<string>(() => loadFromStorage('pocketTheme', 'default'));
  const [pocketVizMode, setPocketVizMode] = useState<string>(() => loadFromStorage('pocketVizMode', 'waveform'));
  const [activeTab, setActiveTab] = useState('bank');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeGenre, setActiveGenre] = useState('all');
  const [sortMode, setSortMode] = useState('default');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [artistReactions, setArtistReactionsState] = useState<Record<number, string>>(
    () => loadFromStorage('artistReactions', { 1: 'musthave' })
  );
  const [artistQueue, setArtistQueue] = useState<number[]>(() => loadFromStorage('artistQueue', []));
  const [dealRoomReaction, setDealRoomReaction] = useState<string | null>(null);
  const [dealRoomNote, setDealRoomNote] = useState('');

  // Load songs from API on mount
  useEffect(() => {
    async function fetchSongs() {
      try {
        const res = await fetch('/api/songs');
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) setSongsState(data);
        }
      } catch {
        // Keep seed data on error
      }
    }
    fetchSongs();
  }, []);

  // Load members from API on mount
  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/members');
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) setMembersState(data);
        }
      } catch {
        // Keep seed data on error
      }
    }
    fetchMembers();
  }, []);

  // Persist local preferences to localStorage
  useEffect(() => { saveToStorage('saved', savedSongIds); }, [savedSongIds]);
  useEffect(() => { saveToStorage('artistReactions', artistReactions); }, [artistReactions]);
  useEffect(() => { saveToStorage('artistQueue', artistQueue); }, [artistQueue]);
  useEffect(() => { saveToStorage('noInterest', noInterestIds); }, [noInterestIds]);
  useEffect(() => { saveToStorage('pocketTheme', pocketTheme); }, [pocketTheme]);
  useEffect(() => { saveToStorage('pocketVizMode', pocketVizMode); }, [pocketVizMode]);

  const setSongs = useCallback((newSongs: Song[]) => {
    setSongsState(newSongs);
  }, []);

  const setMembers = useCallback((newMembers: Member[]) => {
    setMembersState(newMembers);
  }, []);

  const toggleSave = useCallback((songId: number) => {
    setSavedSongIds(prev => {
      const next = prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId];
      return next;
    });
  }, []);

  const toggleNoInterest = useCallback((songId: number) => {
    setNoInterestIds(prev =>
      prev.includes(songId) ? prev.filter(id => id !== songId) : [...prev, songId]
    );
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

  const toggleArtistQueue = useCallback((songId: number) => {
    setArtistQueue(prev =>
      prev.includes(songId) ? prev.filter(id => id !== songId) : [...prev, songId]
    );
  }, []);

  const clearArtistQueue = useCallback(() => {
    setArtistQueue([]);
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

    // Sort. Comparisons fall back to title so equal keys keep a stable,
    // predictable order rather than whatever the source array happened to be.
    const byTitle = (a: Song, b: Song) => a.title.localeCompare(b.title);

    switch (sortMode) {
      case 'closing':
        filtered.sort((a, b) => a.tier1_days_remaining - b.tier1_days_remaining);
        break;
      case 'title-az':
        filtered.sort(byTitle);
        break;
      case 'genre':
        filtered.sort((a, b) => (a.genre || '').localeCompare(b.genre || '') || byTitle(a, b));
        break;
      case 'pocket':
        filtered.sort((a, b) => {
          const aq = artistQueue.includes(a.id) ? 0 : 1;
          const bq = artistQueue.includes(b.id) ? 0 : 1;
          return aq - bq || byTitle(a, b);
        });
        break;
      case 'bpm-low':
        filtered.sort((a, b) => a.bpm - b.bpm || byTitle(a, b));
        break;
      case 'bpm-high':
        filtered.sort((a, b) => b.bpm - a.bpm || byTitle(a, b));
        break;
      case 'writer-az':
        filtered.sort((a, b) => (a.writers[0] || '').localeCompare(b.writers[0] || '') || byTitle(a, b));
        break;
    }

    return filtered;
  }, [songs, activeTab, savedSongIds, activeGenre, searchQuery, sortMode, artistQueue]);

  const getStats = useCallback(() => {
    return {
      available: songs.filter(s => s.status === 'available').length,
      held: songs.filter(s => s.status === 'reserved').length,
      bought: songs.filter(s => s.status === 'purchased').length,
    };
  }, [songs]);

  return (
    <StoreContext.Provider value={{
      songs, members, savedSongIds, artistQueue, noInterestIds, pocketTheme, pocketVizMode,
      activeTab, searchQuery, searchOpen,
      activeGenre, sortMode, toastMessage, artistReactions,
      dealRoomReaction, dealRoomNote,
      setSongs, setMembers, toggleSave, toggleNoInterest, toggleArtistQueue, clearArtistQueue,
      setPocketTheme, setPocketVizMode,
      reserveSong, purchaseSong, releaseReserve,
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
