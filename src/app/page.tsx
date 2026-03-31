'use client';

import { useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { MEMBERS } from '@/data/members';
import TopNav from '@/components/TopNav';
import BottomTabBar from '@/components/BottomTabBar';
import MiniPlayer from '@/components/MiniPlayer';
import Toast from '@/components/Toast';
import SongCard from '@/components/SongCard';
import StatsStrip from '@/components/StatsStrip';
import WritersTab from '@/components/WritersTab';
import SongDetailSheet from '@/components/SongDetailSheet';
import ReserveSheet from '@/components/ReserveSheet';
import BuyFlowSheet from '@/components/BuyFlowSheet';
import ShareSheet from '@/components/ShareSheet';
import RightsPassportSheet from '@/components/RightsPassportSheet';
import SortSheet from '@/components/SortSheet';
import MemberProfile from '@/components/MemberProfile';
import DealRoom from '@/components/DealRoom';
import ArtistMode from '@/components/ArtistMode';

export default function Home() {
  const store = useStore();
  const { songs, activeTab, getFilteredSongs, reserveSong, purchaseSong, showToast } = store;

  // Splash screen
  const [showSplash, setShowSplash] = useState(true);

  // Sheet states
  const [detailSongId, setDetailSongId] = useState<number | null>(null);
  const [reserveSongId, setReserveSongId] = useState<number | null>(null);
  const [buySongId, setBuySongId] = useState<number | null>(null);
  const [shareSongId, setShareSongId] = useState<number | null>(null);
  const [rightsSongId, setRightsSongId] = useState<number | null>(null);
  const [sortOpen, setSortOpen] = useState(false);

  // Panel states
  const [profileMemberId, setProfileMemberId] = useState<number | null>(null);
  const [dealRoomSongId, setDealRoomSongId] = useState<number | null>(null);

  const filteredSongs = getFilteredSongs();

  const findSong = (id: number | null) => id ? songs.find(s => s.id === id) || null : null;
  const findMember = (id: number | null) => id ? MEMBERS.find(m => m.id === id) || null : null;

  const handleReserveConfirm = useCallback((songId: number) => {
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
      <TopNav onArtistMode={() => {}} />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ paddingBottom: activeTab === 'pocket' ? 60 : 140 }}>
        {activeTab === 'pocket' ? (
          <ArtistMode open={true} onClose={() => store.setActiveTab('bank')} onOpenProfile={setProfileMemberId} inline />
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
              <button
                onClick={() => setShareSongId(0)}
                className="flex items-center gap-[5px] px-3 py-[7px] rounded-md cursor-pointer"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 8,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  border: '1px solid var(--sky)',
                  color: 'var(--sky)',
                  background: 'transparent',
                }}>
                ⊕ Share
              </button>
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
                      onOpenShare={setShareSongId}
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

      {/* Mini Player */}
      <MiniPlayer
        onOpenDetail={setDetailSongId}
        onReserve={setReserveSongId}
        onBuy={setBuySongId}
      />

      {/* Bottom Tab Bar */}
      <BottomTabBar />

      {/* Toast */}
      <Toast />

      {/* Sheets */}
      <SongDetailSheet
        song={findSong(detailSongId)}
        open={detailSongId !== null}
        onClose={() => setDetailSongId(null)}
        onReserve={setReserveSongId}
        onBuy={setBuySongId}
        onShare={setShareSongId}
        onOpenProfile={(mid) => { setDetailSongId(null); setTimeout(() => setProfileMemberId(mid), 100); }}
      />
      <ReserveSheet
        song={findSong(reserveSongId)}
        open={reserveSongId !== null}
        onClose={() => setReserveSongId(null)}
        onConfirm={handleReserveConfirm}
      />
      <BuyFlowSheet
        song={findSong(buySongId)}
        open={buySongId !== null}
        onClose={() => setBuySongId(null)}
        onComplete={handlePurchaseComplete}
      />
      <ShareSheet
        song={shareSongId === 0 ? null : findSong(shareSongId)}
        open={shareSongId !== null}
        onClose={() => setShareSongId(null)}
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
      />
    </div>
  );
}
