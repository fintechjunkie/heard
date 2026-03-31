'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Song } from '@/data/types';
import { createClient } from '@/lib/supabase/client';
import HoldCountdown from './HoldCountdown';

interface DealRoomProps {
  song: Song | null;
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  onReserve: (songId: number) => void;
  onBuy: (songId: number) => void;
  teamId?: number;
  pocketReaction?: string | null;
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

const DEAL_REACTIONS = [
  { key: 'musthave', emoji: '🔥', label: 'Must Have', color: '#FF6848', bg: 'rgba(255,104,72,0.12)', bgLight: 'rgba(255,104,72,0.05)', border: 'rgba(255,104,72,0.3)' },
  { key: 'hit', emoji: '⚡', label: 'Hit', color: '#FFB830', bg: 'rgba(255,184,48,0.12)', bgLight: 'rgba(255,184,48,0.05)', border: 'rgba(255,184,48,0.3)' },
  { key: 'love', emoji: '♥', label: 'Love', color: '#B57BFF', bg: 'rgba(181,123,255,0.12)', bgLight: 'rgba(181,123,255,0.05)', border: 'rgba(181,123,255,0.3)' },
  { key: 'notsure', emoji: '〰', label: 'Not Sure', color: '#6a6660', bg: 'rgba(106,102,96,0.12)', bgLight: 'rgba(106,102,96,0.05)', border: 'rgba(106,102,96,0.3)' },
  { key: 'notforme', emoji: '✕', label: 'Pass', color: '#FF6848', bg: 'rgba(255,104,72,0.1)', bgLight: 'rgba(255,104,72,0.04)', border: 'rgba(255,104,72,0.2)' },
];

export default function DealRoom({ song, open, onClose, onBack, onReserve, onBuy, teamId, pocketReaction }: DealRoomProps) {
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
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get current user — try on mount and keep trying
  const getUserId = useCallback(async (): Promise<{ id: string; name: string } | null> => {
    if (userId && userName) return { id: userId, name: userName };
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const name = data?.full_name || 'You';
      setUserName(name);
      return { id: user.id, name };
    }
    return null;
  }, [userId, userName]);

  useEffect(() => { getUserId(); }, [getUserId]);

  // Check if deal room exists for this song+team
  const checkDealRoom = useCallback(async () => {
    if (!song || !teamId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/dealrooms?songId=${song.id}&teamId=${teamId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.status !== 'closed') {
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
        // Match my reaction if userId is known
        if (userId) {
          const mine = r.find((rx: Reaction) => rx.user_id === userId);
          setMyReaction(mine ? mine.reaction : null);
        }
      }
      if (commentsRes.ok) setComments(await commentsRes.json());
    } catch { /* ignore */ }
  }, [dealRoomId, userId]);

  useEffect(() => { if (open) checkDealRoom(); }, [open, checkDealRoom]);
  useEffect(() => { if (dealRoomId) loadData(); }, [dealRoomId, loadData]);

  // Re-load when userId becomes available (auth finishes after initial load)
  useEffect(() => { if (dealRoomId && userId) loadData(); }, [userId, dealRoomId, loadData]);

  // Sync Pocket reaction → Deal Room on open
  const pocketSyncedRef = useRef(false);
  useEffect(() => {
    if (!open) { pocketSyncedRef.current = false; return; }
    if (!dealRoomId || !pocketReaction || myReaction || pocketSyncedRef.current) return;
    pocketSyncedRef.current = true;
    (async () => {
      const user = await getUserId();
      if (!user) return;
      try {
        await fetch('/api/dealrooms/reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dealRoomId, userId: user.id, reaction: pocketReaction }),
        });
        setMyReaction(pocketReaction);
        setReactions(prev => {
          const without = prev.filter(r => r.user_id !== user.id);
          return [...without, { id: Date.now(), user_id: user.id, reaction: pocketReaction, full_name: user.name, avatar_url: '' }];
        });
        setTimeout(() => loadData(), 500);
      } catch (err) {
        console.error('Pocket sync error:', err);
      }
    })();
  }, [open, dealRoomId, pocketReaction, myReaction, getUserId, loadData]);
  useEffect(() => {
    // Scroll only the DealRoom's own scroll container — NOT parent containers
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [comments]);

  const startDealRoom = async () => {
    if (!song || !teamId) return;
    const user = await getUserId();
    const res = await fetch('/api/dealrooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId: song.id, teamId, createdBy: user?.id || null }),
    });
    if (res.ok) {
      const data = await res.json();
      setDealRoomId(data.id);
      setDealRoomExists(true);
    }
  };

  const submitReaction = async (reaction: string) => {
    if (!dealRoomId) return;
    const user = await getUserId();
    if (!user) { console.error('Not authenticated — cannot vote'); return; }

    const newReaction = myReaction === reaction ? null : reaction;

    // Optimistic update — update counts immediately
    setMyReaction(newReaction);
    if (newReaction) {
      setReactions(prev => {
        const without = prev.filter(r => r.user_id !== user.id);
        return [...without, { id: Date.now(), user_id: user.id, reaction: newReaction, full_name: user.name, avatar_url: '' }];
      });
    } else {
      setReactions(prev => prev.filter(r => r.user_id !== user.id));
    }

    // Persist to server
    try {
      if (newReaction) {
        const res = await fetch('/api/dealrooms/reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dealRoomId, userId: user.id, reaction: newReaction }),
        });
        if (!res.ok) console.error('Reaction post failed:', await res.text());
      }
    } catch (err) {
      console.error('Reaction error:', err);
    }
    // Reload from server after a moment
    setTimeout(() => loadData(), 500);
  };

  const submitComment = async () => {
    if (!dealRoomId || !commentText.trim()) return;
    const user = await getUserId();
    const text = commentText;
    const isAdminQ = isAdminQuestion;

    // Optimistic update — show comment immediately
    const optimisticComment: Comment = {
      id: Date.now(),
      user_id: user?.id || null,
      is_admin_response: false,
      is_admin_question: isAdminQ,
      content: text,
      created_at: new Date().toISOString(),
      full_name: user?.name || 'You',
      avatar_url: '',
    };
    setComments(prev => [...prev, optimisticComment]);
    setCommentText('');
    setIsAdminQuestion(false);

    try {
      const res = await fetch('/api/dealrooms/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealRoomId, userId: user?.id || null, content: text, isAdminQuestion: isAdminQ }),
      });
      if (!res.ok) {
        console.error('Comment post failed:', await res.text());
      }
    } catch (err) {
      console.error('Comment post error:', err);
    }
    // Delay reload to let Supabase commit the write
    setTimeout(() => loadData(), 1000);
  };

  const deactivateDealRoom = async () => {
    if (!dealRoomId) return;
    await fetch('/api/dealrooms', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dealRoomId, status: 'closed' }),
    });
    setDealRoomExists(false);
    setDealRoomId(null);
    setReactions([]);
    setComments([]);
    setShowDeactivateConfirm(false);
    onClose();
  };

  if (!song) return null;

  const isHeld = song.status === 'reserved';
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
          <button onClick={onBack || onClose} className="text-[18px] cursor-pointer bg-transparent border-none" style={{ color: '#FFFFFF' }}>←</button>
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
        <div className="text-[11px] mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{song.writers.join(' · ')}</div>
        {isHeld && <HoldCountdown reservedUntil={song.reserved_until} />}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 py-12 text-center text-gray-400 text-sm">Loading...</div>
      ) : !dealRoomExists ? (
        /* No deal room yet */
        <div className="flex-1 py-12 text-center px-8">
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
          {/* Team Reactions — pinned, not scrollable */}
          <div className="flex-shrink-0 mx-5 mt-4">
              <div className="text-[8px] tracking-[2px] uppercase mb-2" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650' }}>
                Team Reactions · {totalReactions} vote{totalReactions !== 1 ? 's' : ''}
              </div>
              <div className="grid grid-cols-5 gap-[6px]">
                {DEAL_REACTIONS.map(r => {
                  const count = reactions.filter(rx => rx.reaction === r.key).length;
                  const isMine = myReaction === r.key;
                  const voters = reactions.filter(rx => rx.reaction === r.key);
                  return (
                    <button key={r.key} onClick={() => submitReaction(r.key)}
                      className="py-[10px] rounded-xl text-center cursor-pointer transition-all duration-150"
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        background: isMine ? r.bg : count > 0 ? r.bgLight : '#FAFAF7',
                        border: isMine ? `2px solid ${r.border}` : count > 0 ? `1px solid ${r.border}` : '1px solid var(--border)',
                        color: isMine ? r.color : count > 0 ? r.color : '#6a6660',
                        boxShadow: isMine ? `0 0 8px ${r.border}` : 'none',
                      }}
                      title={voters.length > 0 ? voters.map(v => v.full_name).join(', ') : undefined}
                    >
                      <span className="text-[18px] block">{r.emoji}</span>
                      <span className="text-[12px] font-bold block mt-[1px]">{count > 0 ? count : ''}</span>
                      <span className="text-[6px] tracking-[0.5px] uppercase block mt-[1px]">{r.label}</span>
                    </button>
                  );
                })}
              </div>
              {/* Who voted — expandable list under the buttons */}
              {totalReactions > 0 && (
                <div className="flex flex-wrap gap-[6px] mt-3">
                  {reactions.map(r => {
                    const rxDef = DEAL_REACTIONS.find(dr => dr.key === r.reaction);
                    return (
                      <div key={r.id} className="flex items-center gap-[4px] px-[8px] py-[4px] rounded-full"
                        style={{ background: rxDef ? rxDef.bg : '#f5f5f5', border: `1px solid ${rxDef ? rxDef.border : 'var(--border)'}` }}>
                        <span className="text-[10px]">{rxDef?.emoji}</span>
                        <span className="text-[8px] font-medium" style={{ color: rxDef?.color || '#6a6660' }}>
                          {r.full_name.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          {/* Comments — this section scrolls */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="mx-5 mt-3 pb-4">
              <div className="text-[8px] tracking-[2px] uppercase mb-2" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650' }}>
                Discussion ({comments.length})
              </div>
              <div className="space-y-2">
                {comments.map(c => (
                  <div key={c.id} className={`rounded-xl px-3 py-2 ${c.is_admin_response ? 'ml-0' : c.user_id === userId ? 'ml-8' : 'mr-8'}`}
                    style={{
                      background: c.is_admin_response ? 'rgba(200,255,69,0.08)' : '#FAFAF7',
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
            </div>
          </div>
        </>
      )}

      {/* Comment input — fixed above CTAs so it never scrolls away */}
      {dealRoomExists && (
        <div className="flex-shrink-0 px-5 pt-3 pb-2" style={{ background: '#F2EDE3', borderTop: '1px solid var(--border)' }}>
          <div className="flex gap-2 mb-2">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
              placeholder={isAdminQuestion ? 'Message to Heard admin...' : 'Add a comment...'}
              className="flex-1 px-3 py-2 rounded-lg outline-none"
              style={{ background: '#FAFAF7', border: '1px solid var(--border)', fontFamily: "'DM Sans', sans-serif", fontSize: 16, minHeight: 36, color: 'var(--black)' }}
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
      )}

      {/* Footer CTAs */}
      {dealRoomExists && (
        <div className="flex-shrink-0 flex flex-col gap-2 px-5 pb-5 pt-2" style={{ background: '#F2EDE3' }}>
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
          {!showDeactivateConfirm ? (
            <button
              onClick={() => setShowDeactivateConfirm(true)}
              className="w-full py-[8px] text-[8px] tracking-[1px] uppercase cursor-pointer bg-transparent border-none"
              style={{ fontFamily: "'DM Mono', monospace", color: 'var(--muted)' }}>
              Close Deal Room
            </button>
          ) : (
            <div className="rounded-xl p-3 mt-1" style={{ background: 'rgba(255,104,72,0.06)', border: '1px solid rgba(255,104,72,0.2)' }}>
              <p className="text-[10px] text-center mb-2" style={{ color: '#FF6848' }}>
                Are you sure? This will close the deal room for your team.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeactivateConfirm(false)}
                  className="flex-1 py-[8px] rounded-lg text-[9px] tracking-[1px] uppercase cursor-pointer"
                  style={{ fontFamily: "'DM Mono', monospace", background: '#FAFAF7', border: '1px solid var(--border)', color: '#6a6660' }}>
                  Cancel
                </button>
                <button onClick={deactivateDealRoom}
                  className="flex-1 py-[8px] rounded-lg text-[9px] tracking-[1px] uppercase cursor-pointer border-none"
                  style={{ fontFamily: "'DM Mono', monospace", background: '#FF6848', color: 'white' }}>
                  Yes, Close It
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
