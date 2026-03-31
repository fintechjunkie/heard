'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Song } from '@/data/types';
import { createClient } from '@/lib/supabase/client';

interface DealRoomProps {
  song: Song | null;
  open: boolean;
  onClose: () => void;
  onReserve: (songId: number) => void;
  onBuy: (songId: number) => void;
  teamId?: number;
}

interface Reaction {
  id: number;
  user_id: string;
  reaction: string;
  full_name: string;
  avatar_url: string;
}

interface Comment {
  id: number;
  user_id: string | null;
  is_admin_response: boolean;
  is_admin_question: boolean;
  content: string;
  created_at: string;
  full_name: string;
  avatar_url: string;
}

export default function DealRoom({ song, open, onClose, onReserve, onBuy, teamId }: DealRoomProps) {
  const [dealRoomId, setDealRoomId] = useState<number | null>(null);
  const [dealRoomExists, setDealRoomExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isAdminQuestion, setIsAdminQuestion] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Get current user
  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (data) setUserName(data.full_name);
      }
    }
    getUser();
  }, []);

  // Check if deal room exists for this song+team
  const checkDealRoom = useCallback(async () => {
    if (!song || !teamId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/dealrooms?songId=${song.id}&teamId=${teamId}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setDealRoomId(data.id);
          setDealRoomExists(true);
        } else {
          setDealRoomId(null);
          setDealRoomExists(false);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [song, teamId]);

  // Load reactions and comments
  const loadData = useCallback(async () => {
    if (!dealRoomId) return;
    try {
      const [reactionsRes, commentsRes] = await Promise.all([
        fetch(`/api/dealrooms/reactions?dealRoomId=${dealRoomId}`),
        fetch(`/api/dealrooms/comments?dealRoomId=${dealRoomId}`),
      ]);
      if (reactionsRes.ok) {
        const r = await reactionsRes.json();
        setReactions(r);
        const mine = r.find((rx: Reaction) => rx.user_id === userId);
        if (mine) setMyReaction(mine.reaction);
      }
      if (commentsRes.ok) setComments(await commentsRes.json());
    } catch { /* ignore */ }
  }, [dealRoomId, userId]);

  useEffect(() => { if (open) checkDealRoom(); }, [open, checkDealRoom]);
  useEffect(() => { if (dealRoomId) loadData(); }, [dealRoomId, loadData]);
  useEffect(() => { commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);

  const startDealRoom = async () => {
    if (!song || !teamId) return;
    const res = await fetch('/api/dealrooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId: song.id, teamId, createdBy: userId }),
    });
    if (res.ok) {
      const data = await res.json();
      setDealRoomId(data.id);
      setDealRoomExists(true);
    }
  };

  const submitReaction = async (reaction: string) => {
    if (!dealRoomId || !userId) return;
    const newReaction = myReaction === reaction ? null : reaction;
    if (newReaction) {
      await fetch('/api/dealrooms/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealRoomId, userId, reaction: newReaction }),
      });
    }
    setMyReaction(newReaction);
    loadData();
  };

  const submitComment = async () => {
    if (!dealRoomId || !commentText.trim()) return;
    await fetch('/api/dealrooms/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealRoomId, userId, content: commentText, isAdminQuestion }),
    });
    setCommentText('');
    setIsAdminQuestion(false);
    loadData();
  };

  if (!song) return null;

  const isHeld = song.status === 'reserved';
  const yesCt = reactions.filter(r => r.reaction === 'yes').length;
  const maybeCt = reactions.filter(r => r.reaction === 'maybe').length;
  const passCt = reactions.filter(r => r.reaction === 'pass').length;
  const totalReactions = reactions.length;

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
          <span className="text-[14px] font-medium" style={{ fontFamily: "'DM Mono', monospace", color: '#FFFFFF' }}>Deal Room</span>
        </div>
        <button onClick={onClose} className="w-[28px] h-[28px] rounded-full flex items-center justify-center cursor-pointer border-none text-[12px]"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
          ✕
        </button>
      </div>

      {/* Song header */}
      <div className="px-5 py-4" style={{ background: 'var(--black)' }}>
        <div className="text-[8px] tracking-[2px] uppercase mb-1" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.45)' }}>Evaluating</div>
        <div className="text-[32px] tracking-[2px] leading-none mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#FFFFFF' }}>{song.title}</div>
        <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>{song.writers.join(' · ')}</div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-[140px]">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : !dealRoomExists ? (
          /* No deal room yet */
          <div className="py-12 text-center px-8">
            <div className="text-[32px] mb-3" style={{ opacity: 0.3 }}>🤝</div>
            <p className="text-[11px] leading-relaxed mb-4" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--muted)' }}>
              No deal room exists for this song yet. Start one to collaborate with your team.
            </p>
            <button onClick={startDealRoom}
              className="px-6 py-3 rounded-xl text-[10px] tracking-[1.5px] uppercase cursor-pointer border-none"
              style={{ fontFamily: "'DM Mono', monospace", background: 'var(--sky)', color: 'var(--black)' }}>
              Start Deal Room
            </button>
          </div>
        ) : (
          <>
            {/* Consensus */}
            {totalReactions > 0 && (
              <div className="mx-5 mt-4 rounded-xl p-4" style={{ background: 'var(--th-white)', border: '1px solid var(--border)' }}>
                <div className="text-[8px] tracking-[2px] uppercase mb-2" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650' }}>
                  Team Consensus · {totalReactions} vote{totalReactions !== 1 ? 's' : ''}
                </div>
                <div className="flex gap-[2px] mb-2 rounded-full overflow-hidden" style={{ height: 8 }}>
                  {yesCt > 0 && <div style={{ flex: yesCt, background: '#2a7a2a' }} />}
                  {maybeCt > 0 && <div style={{ flex: maybeCt, background: 'var(--amber)' }} />}
                  {passCt > 0 && <div style={{ flex: passCt, background: 'var(--coral)' }} />}
                </div>
                <div className="flex gap-4 text-[8px]" style={{ fontFamily: "'DM Mono', monospace", color: '#6a6660' }}>
                  <span>● Yes {yesCt}</span>
                  <span>● Maybe {maybeCt}</span>
                  <span>● Pass {passCt}</span>
                </div>
              </div>
            )}

            {/* Team reactions */}
            <div className="mx-5 mt-4">
              <div className="text-[8px] tracking-[2px] uppercase mb-2" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650' }}>Team</div>
              {reactions.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 px-3 mb-2 rounded-xl"
                  style={{ background: 'var(--th-white)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[9px] font-medium"
                      style={{ background: 'rgba(90,180,255,0.12)', color: 'var(--sky)', fontFamily: "'DM Mono', monospace" }}>
                      {r.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <span className="text-[12px] font-medium">{r.full_name}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-[8px] tracking-[1px] uppercase ${
                    r.reaction === 'yes' ? 'bg-green-50 text-green-700' :
                    r.reaction === 'maybe' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-600'
                  }`} style={{ fontFamily: "'DM Mono', monospace" }}>
                    {r.reaction === 'yes' ? '✓ Yes' : r.reaction === 'maybe' ? '∼ Maybe' : '✕ Pass'}
                  </span>
                </div>
              ))}
            </div>

            {/* My reaction */}
            <div className="mx-5 mt-4">
              <div className="text-[8px] tracking-[2px] uppercase mb-2" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650' }}>
                My Reaction
              </div>
              <div className="flex gap-2">
                {[
                  { key: 'yes', label: '✓ Yes', color: '#2a7a2a', bg: 'rgba(42,122,42,0.1)', border: 'rgba(42,122,42,0.3)' },
                  { key: 'maybe', label: '∼ Maybe', color: 'var(--amber)', bg: 'rgba(255,184,48,0.1)', border: 'rgba(255,184,48,0.3)' },
                  { key: 'pass', label: '✕ Pass', color: 'var(--coral)', bg: 'rgba(255,104,72,0.1)', border: 'rgba(255,104,72,0.3)' },
                ].map(r => (
                  <button key={r.key} onClick={() => submitReaction(r.key)}
                    className="flex-1 py-[10px] rounded-xl text-[9px] tracking-[1px] uppercase text-center cursor-pointer"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      background: myReaction === r.key ? r.bg : 'var(--th-white)',
                      border: myReaction === r.key ? `1.5px solid ${r.border}` : '1px solid var(--border)',
                      color: myReaction === r.key ? r.color : '#6a6660',
                    }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div className="mx-5 mt-4">
              <div className="text-[8px] tracking-[2px] uppercase mb-2" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650' }}>
                Discussion ({comments.length})
              </div>
              <div className="space-y-2 mb-3">
                {comments.map(c => (
                  <div key={c.id} className={`rounded-xl px-3 py-2 ${c.is_admin_response ? 'ml-0' : c.user_id === userId ? 'ml-8' : 'mr-8'}`}
                    style={{
                      background: c.is_admin_response ? 'rgba(200,255,69,0.08)' : 'var(--th-white)',
                      border: c.is_admin_response ? '1px solid rgba(200,255,69,0.3)' : '1px solid var(--border)',
                    }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-medium" style={{ color: c.is_admin_response ? 'var(--acid)' : 'var(--black)' }}>
                        {c.is_admin_response ? '★ Heard Admin' : c.full_name}
                      </span>
                      <span className="text-[7px]" style={{ color: '#999' }}>
                        {new Date(c.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {c.is_admin_question && !c.is_admin_response && (
                        <span className="text-[7px] px-1 py-[1px] rounded" style={{ background: 'rgba(200,255,69,0.15)', color: 'var(--acid)' }}>To Admin</span>
                      )}
                    </div>
                    <div className="text-[11px] leading-relaxed" style={{ color: '#333' }}>{c.content}</div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-[11px] text-center py-4" style={{ color: '#999' }}>No comments yet. Start the conversation.</div>
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Comment input */}
              <div className="flex gap-2 mb-2">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                  placeholder={isAdminQuestion ? 'Message to Heard admin...' : 'Add a comment...'}
                  className="flex-1 px-3 py-2 rounded-lg text-[11px] outline-none"
                  style={{ background: 'var(--th-white)', border: '1px solid var(--border)', fontFamily: "'DM Sans', sans-serif" }}
                />
                <button onClick={submitComment}
                  className="px-3 py-2 rounded-lg text-[9px] tracking-[1px] uppercase cursor-pointer border-none"
                  style={{ fontFamily: "'DM Mono', monospace", background: 'var(--black)', color: '#FFFFFF' }}>
                  Send
                </button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isAdminQuestion} onChange={e => setIsAdminQuestion(e.target.checked)} />
                <span className="text-[9px]" style={{ fontFamily: "'DM Mono', monospace", color: '#6a6660' }}>Send to Heard admin for response</span>
              </label>
            </div>
          </>
        )}
      </div>

      {/* Footer CTAs */}
      {dealRoomExists && (
        <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 px-5 pb-5 pt-3" style={{ background: '#F2EDE3', borderTop: '1px solid var(--border)', boxShadow: '0 -8px 20px rgba(0,0,0,0.08)' }}>
          <button
            onClick={() => { onClose(); setTimeout(() => onReserve(song.id), 100); }}
            className="w-full py-[12px] rounded-xl text-[10px] tracking-[1.5px] uppercase cursor-pointer border-none"
            style={{ fontFamily: "'DM Mono', monospace", background: 'var(--sky)', color: 'var(--black)', opacity: isHeld ? 0.5 : 1 }}
            disabled={isHeld}
          >
            {isHeld ? '⏱ Hold Active' : 'Reserve · 72-Hour Hold'}
          </button>
          <button
            onClick={() => { onClose(); setTimeout(() => onBuy(song.id), 100); }}
            className="w-full py-[12px] rounded-xl text-[10px] tracking-[1.5px] uppercase cursor-pointer border-none"
            style={{ fontFamily: "'DM Mono', monospace", background: 'var(--coral)', color: 'white' }}>
            Buy Now — $85,000
          </button>
        </div>
      )}
    </div>
  );
}
