'use client';

import { useState, useEffect, useCallback } from 'react';
import { Song } from '@/data/types';

interface DealRoomEntry {
  id: number;
  song_id: number;
  team_id: number;
  status: string;
  created_at: string;
  song_title: string;
  song_writers: string[];
  reaction_count: number;
  comment_count: number;
}

interface DealRoomsListProps {
  open: boolean;
  onClose: () => void;
  onOpenDealRoom: (songId: number) => void;
  teamId?: number;
  songs: Song[];
}

export default function DealRoomsList({ open, onClose, onOpenDealRoom, teamId, songs }: DealRoomsListProps) {
  const [dealRooms, setDealRooms] = useState<DealRoomEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDealRooms = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      // Fetch all deal rooms for this team by checking each song
      const rooms: DealRoomEntry[] = [];
      // Batch: check all songs that might have deal rooms
      const checks = songs.map(async (song) => {
        try {
          const res = await fetch(`/api/dealrooms?songId=${song.id}&teamId=${teamId}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.id && data.status !== 'closed') {
              // Get reaction and comment counts
              const [reactionsRes, commentsRes] = await Promise.all([
                fetch(`/api/dealrooms/reactions?dealRoomId=${data.id}`),
                fetch(`/api/dealrooms/comments?dealRoomId=${data.id}`),
              ]);
              const reactions = reactionsRes.ok ? await reactionsRes.json() : [];
              const comments = commentsRes.ok ? await commentsRes.json() : [];

              rooms.push({
                id: data.id,
                song_id: song.id,
                team_id: data.team_id,
                status: data.status || 'active',
                created_at: data.created_at,
                song_title: song.title,
                song_writers: song.writers,
                reaction_count: reactions.length,
                comment_count: comments.length,
              });
            }
          }
        } catch { /* ignore individual failures */ }
      });
      await Promise.all(checks);
      rooms.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setDealRooms(rooms);
    } catch { /* ignore */ }
    setLoading(false);
  }, [teamId, songs]);

  useEffect(() => {
    if (open) loadDealRooms();
  }, [open, loadDealRooms]);

  return (
    <div
      className="absolute inset-0 z-[160] flex flex-col overflow-hidden"
      style={{
        background: 'var(--cream)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: open
          ? 'transform 380ms cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Nav */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3" style={{ background: 'var(--black)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-[18px] cursor-pointer bg-transparent border-none" style={{ color: '#FFFFFF' }}>←</button>
          <span className="text-[14px] font-medium" style={{ fontFamily: "'DM Mono', monospace", color: '#FFFFFF' }}>Deal Rooms</span>
        </div>
        <button onClick={onClose} className="w-[28px] h-[28px] rounded-full flex items-center justify-center cursor-pointer border-none text-[12px]"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
          ✕
        </button>
      </div>

      {/* Header */}
      <div className="px-5 py-4" style={{ background: 'var(--black)' }}>
        <div className="text-[32px] tracking-[2px] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#FFFFFF' }}>
          Active Deals
        </div>
        <div className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {dealRooms.length} open deal room{dealRooms.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pt-4 pb-8">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : dealRooms.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-[32px] mb-3" style={{ opacity: 0.3 }}>🤝</div>
            <p className="text-[11px] leading-relaxed" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--muted)' }}>
              No active deal rooms yet. Open a song and start one to collaborate with your team.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dealRooms.map(dr => {
              const song = songs.find(s => s.id === dr.song_id);
              return (
                <button
                  key={dr.id}
                  onClick={() => { onClose(); setTimeout(() => onOpenDealRoom(dr.song_id), 100); }}
                  className="w-full text-left rounded-xl p-4 cursor-pointer border-none"
                  style={{ background: '#FAFAF7', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-[22px] tracking-[1.5px] leading-none"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'var(--black)' }}>
                        {dr.song_title}
                      </div>
                      <div className="text-[10px] mt-[3px]" style={{ color: '#6a6660' }}>
                        {dr.song_writers.join(' · ')}
                      </div>
                    </div>
                    {song && (
                      <span className={`px-2 py-1 rounded-full text-[7px] tracking-[1px] uppercase ${
                        song.status === 'reserved' ? 'bg-blue-50 text-blue-700' :
                        song.status === 'purchased' ? 'bg-purple-50 text-purple-700' :
                        'bg-green-50 text-green-700'
                      }`} style={{ fontFamily: "'DM Mono', monospace" }}>
                        {song.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[9px]" style={{ fontFamily: "'DM Mono', monospace", color: '#6a6660' }}>
                    <span>{dr.reaction_count} vote{dr.reaction_count !== 1 ? 's' : ''}</span>
                    <span>{dr.comment_count} comment{dr.comment_count !== 1 ? 's' : ''}</span>
                    <span className="ml-auto" style={{ color: 'var(--sky)' }}>Open →</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
