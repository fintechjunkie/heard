'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { MEMBERS } from '@/data/members';
import TopNav from '@/components/TopNav';
import BottomTabBar from '@/components/BottomTabBar';
import Toast from '@/components/Toast';
import SongCard from '@/components/SongCard';
import StatsStrip from '@/components/StatsStrip';
import WritersTab from '@/components/WritersTab';
import SongDetailSheet from '@/components/SongDetailSheet';
import ReserveSheet from '@/components/ReserveSheet';
import BuyFlowSheet from '@/components/BuyFlowSheet';
import RightsPassportSheet from '@/components/RightsPassportSheet';
import SortSheet from '@/components/SortSheet';
import MemberProfile from '@/components/MemberProfile';
import DealRoom from '@/components/DealRoom';
import DealRoomsList from '@/components/DealRoomsList';
import ArtistMode from '@/components/ArtistMode';
import TeamPicker from '@/components/TeamPicker';

export default function Home() {
  const store = useStore();
  const { songs, activeTab, getFilteredSongs, reserveSong, purchaseSong, showToast } = store;

  // Splash screen
  const [showSplash, setShowSplash] = useState(true);

  // Sheet states
  const [detailSongId, setDetailSongId] = useState<number | null>(null);
  const [reserveSongId, setReserveSongId] = useState<number | null>(null);
  const [buySongId, setBuySongId] = useState<number | null>(null);
  const [rightsSongId, setRightsSongId] = useState<number | null>(null);
  const [sortOpen, setSortOpen] = useState(false);

  // Panel states
  const [profileMemberId, setProfileMemberId] = useState<number | null>(null);
  const [dealRoomSongId, setDealRoomSongId] = useState<number | null>(null);
  const [detailOpenedFromPocket, setDetailOpenedFromPocket] = useState(false);
  const [showDealRoomsList, setShowDealRoomsList] = useState(false);

  // Team state
  const [activeTeam, setActiveTeam] = useState<{ id: number; name: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('theheard_activeTeam');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [showTeamPicker, setShowTeamPicker] = useState(!activeTeam);

  const handleTeamSelect = useCallback((teamId: number, teamName: string) => {
    const team = { id: teamId, name: teamName };
    setActiveTeam(team);
    setShowTeamPicker(false);
    localStorage.setItem('theheard_activeTeam', JSON.stringify(team));
  }, []);

  // Sync Pocket Songs reactions → Deal Room
  const prevReactionsRef = useRef(store.artistReactions);
  useEffect(() => {
    const prev = prevReactionsRef.current;
    const curr = store.artistReactions;
    prevReactionsRef.current = curr;

    if (!activeTeam) return;

    // Find which song IDs changed
    const allIds = new Set([...Object.keys(prev), ...Object.keys(curr)]);
    for (const idStr of allIds) {
      const songId = Number(idStr);
      if (prev[songId] !== curr[songId] && curr[songId]) {
        // Reaction was added or changed — sync to deal room
        (async () => {
          try {
            // Check if a deal room exists for this song+team
            const drRes = await fetch(`/api/dealrooms?songId=${songId}&teamId=${activeTeam.id}`);
            if (!drRes.ok) return;
            const dr = await drRes.json();
            if (!dr?.id) return;

            // Get current user ID
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Upsert the reaction
            await fetch('/api/dealrooms/reactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dealRoomId: dr.id, userId: user.id, reaction: curr[songId] }),
            });
          } catch { /* ignore sync errors */ }
        })();
      }
    }
  }, [store.artistReactions, activeTeam]);

  const filteredSongs = getFilteredSongs();

  const findSong = (id: number | null) => id ? songs.find(s => s.id === id) || null : null;
  const findMember = (id: number | null) => id ? MEMBERS.find(m => m.id === id) || null : null;

  const MAX_RESERVES_PER_TEAM = 2;
  const teamReservedCount = songs.filter(s => s.status === 'reserved').length;

  const handleReserveConfirm = useCallback((songId: number) => {
    const currentReserved = songs.filter(s => s.status === 'reserved').length;
    if (currentReserved >= MAX_RESERVES_PER_TEAM) {
      showToast(`Reserve limit reached (${MAX_RESERVES_PER_TEAM} per team). Release a hold first.`);
      setReserveSongId(null);
      return;
    }
    reserveSong(songId);
    setReserveSongId(null);
    const song = songs.find(s => s.id === songId);
    showToast(`"${song?.title}" reserved. 72-hour hold active.`);
    setTimeout(() => setDealRoomSongId(songId), 400);
  }, [reserveSong, showToast, songs]);

  const handlePurchaseComplete = useCallback((songId: number) => {
    purchaseSong(songId);
    const song = songs.find(s => s.id === songId);
    showToast(`"${song?.title}" purchased. Contract sent to your inbox.`);
  }, [purchaseSong, showToast, songs]);

  const tabTitle = activeTab === 'bank' ? 'Song Bank' : activeTab === 'reserved' ? 'Reserved' : activeTab === 'purchased' ? 'Purchased' : '';

  if (showSplash) {
    return (
      <div
        className="splash-screen"
        onClick={() => setShowSplash(false)}
      >
        <div className="splash-content">
          <div className="splash-logo">HEARD</div>
          <div className="splash-pip" />
          <div className="splash-enter">enter now</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--cream)' }}>
      {showTeamPicker && <TeamPicker onSelect={handleTeamSelect} />}
      {activeTab !== 'pocket' && <TopNav onArtistMode={() => {}} teamName={activeTeam?.name} onSwitchTeam={() => setShowTeamPicker(true)} onOpenDealRooms={() => setShowDealRoomsList(true)} />}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ paddingBottom: activeTab === 'pocket' ? 60 : 140 }}>
        {activeTab === 'pocket' ? (
          <ArtistMode open={true} onClose={() => store.setActiveTab('bank')} onOpenProfile={setProfileMemberId} onOpenDetail={(songId) => { setDetailOpenedFromPocket(true); setDetailSongId(songId); }} inline />
        ) : activeTab === 'writers' ? (
          <WritersTab onOpenProfile={setProfileMemberId} />
        ) : (
          <>
            {/* Page header */}
            <div className="flex items-end justify-between px-5 pt-[18px] pb-2">
              <div>
                <div className="text-[38px] tracking-[2px] leading-[0.95]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  {tabTitle}
                </div>
                <div className="text-[11px] mt-[3px]" style={{ color: '#6a6660' }}>
                  Tier 1 · {filteredSongs.filter(s => s.status === 'available').length} available
                </div>
              </div>
            </div>

            {activeTab === 'bank' && <StatsStrip />}

            {/* Sort row */}
            <div className="flex items-center justify-between px-5 pb-[10px]">
              <div className="text-[11px]" style={{ color: '#5a5650' }}>{filteredSongs.length} songs</div>
              <button onClick={() => setSortOpen(true)}
                className="flex items-center gap-[5px] px-[11px] py-[6px] rounded-md cursor-pointer"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  background: 'var(--th-white)',
                  border: '1px solid var(--border)',
                }}>
                ⇅ Sort
              </button>
            </div>

            {/* Song list */}
            <div className="mx-5 rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--border)' }}>
              {filteredSongs.length === 0 ? (
                <div className="py-12 text-center" style={{ background: 'var(--th-white)' }}>
                  <p className="text-[24px] tracking-[2px]" style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'var(--muted-l)' }}>No Songs</p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
                    {activeTab === 'reserved' ? 'Reserve a song to hold it for 72 hours.' :
                     activeTab === 'purchased' ? 'Purchased songs will appear here.' :
                     'No songs match your filters.'}
                  </p>
                </div>
              ) : (
                filteredSongs.map((song, i) => (
                  <div key={song.id} style={{ borderBottom: i < filteredSongs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <SongCard
                      song={song}
                      index={i}
                      onOpenDetail={setDetailSongId}
                      onOpenDealRoom={setDealRoomSongId}
                      onOpenRightsPassport={setRightsSongId}
                      onOpenProfile={setProfileMemberId}
                      onReserve={setReserveSongId}
                    />
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>


      {/* Bottom Tab Bar */}
      <BottomTabBar />

      {/* Toast */}
      <Toast />

      {/* Sheets */}
      <SongDetailSheet
        song={findSong(detailSongId)}
        open={detailSongId !== null}
        onClose={() => {
          setDetailSongId(null);
          if (detailOpenedFromPocket) {
            setDetailOpenedFromPocket(false);
            store.setActiveTab('pocket');
          }
        }}
        onReserve={setReserveSongId}
        onBuy={setBuySongId}
        onOpenProfile={(mid) => { setDetailSongId(null); setDetailOpenedFromPocket(false); setTimeout(() => setProfileMemberId(mid), 100); }}
      />
      <ReserveSheet
        song={findSong(reserveSongId)}
        open={reserveSongId !== null}
        onClose={() => setReserveSongId(null)}
        onConfirm={handleReserveConfirm}
        teamReservedCount={teamReservedCount}
        maxReserves={MAX_RESERVES_PER_TEAM}
      />
      <BuyFlowSheet
        song={findSong(buySongId)}
        open={buySongId !== null}
        onClose={() => setBuySongId(null)}
        onComplete={handlePurchaseComplete}
      />
      <RightsPassportSheet
        song={findSong(rightsSongId)}
        open={rightsSongId !== null}
        onClose={() => setRightsSongId(null)}
      />
      <SortSheet open={sortOpen} onClose={() => setSortOpen(false)} />

      {/* Full-screen panels */}
      <MemberProfile
        member={findMember(profileMemberId)}
        songs={songs}
        open={profileMemberId !== null}
        onClose={() => setProfileMemberId(null)}
        onOpenDetail={setDetailSongId}
      />
      <DealRoom
        song={findSong(dealRoomSongId)}
        open={dealRoomSongId !== null}
        onClose={() => setDealRoomSongId(null)}
        onReserve={setReserveSongId}
        onBuy={setBuySongId}
        teamId={activeTeam?.id}
        pocketReaction={dealRoomSongId ? store.artistReactions[dealRoomSongId] || null : null}
      />
      <DealRoomsList
        open={showDealRoomsList}
        onClose={() => setShowDealRoomsList(false)}
        onOpenDealRoom={setDealRoomSongId}
        teamId={activeTeam?.id}
        songs={songs}
      />
    </div>
  );
}
