'use client';

import { Member, Song } from '@/data/types';

interface MemberProfileProps {
  member: Member | null;
  songs: Song[];
  open: boolean;
  onClose: () => void;
  onOpenDetail: (songId: number) => void;
}

export default function MemberProfile({ member, songs, open, onClose, onOpenDetail }: MemberProfileProps) {
  if (!member) return null;

  const memberSongs = songs.filter(s => s.writer_ids.includes(member.id) && s.status !== 'purchased');
  const maxStreams = Math.max(...member.hits.map(h => parseFloat(h.s)));

  return (
    <div
      className="absolute inset-0 z-[160] flex flex-col overflow-hidden"
      style={{
        background: 'var(--cream)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: open
          ? 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Sticky nav */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 sticky top-0 z-10" style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onClose} className="text-[18px] cursor-pointer bg-transparent border-none" style={{ color: 'var(--black)' }}>←</button>
        <span className="text-[14px] font-medium" style={{ fontFamily: "'DM Mono', monospace" }}>{member.name}</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Hero */}
        <div className="relative text-center" style={{ background: 'var(--black)' }}>
          {/* Banner image */}
          {member.banner_url ? (
            <div className="w-full h-[140px] overflow-hidden">
              <img src={member.banner_url} alt="" className="w-full h-full object-cover" style={{ opacity: 0.6 }} />
              <div className="absolute inset-0 h-[140px]" style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--black) 100%)' }} />
            </div>
          ) : (
            <div className="h-[20px]" />
          )}
          <div className={member.banner_url ? "px-5 pb-6 -mt-[40px] relative z-10" : "px-5 py-6"}>
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.name}
              className="w-[64px] h-[64px] rounded-full object-cover mx-auto mb-3"
              style={{ border: `2px solid ${member.color}55` }} />
          ) : (
            <div className="w-[64px] h-[64px] rounded-full flex items-center justify-center text-[18px] font-medium mx-auto mb-3"
              style={{
                fontFamily: "'DM Mono', monospace",
                background: `${member.color}22`,
                color: member.color,
                border: `2px solid ${member.color}55`,
              }}>
              {member.initials}
            </div>
          )}
          <div className="text-[10px] tracking-[1px] uppercase mb-1" style={{ fontFamily: "'DM Mono', monospace", color: member.color }}>{member.role}</div>
          <div className="text-[40px] tracking-[2px] leading-none mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#FFFFFF' }}>{member.name}</div>
          <div className="text-[11px] mb-4" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{member.bio}</div>
          <div className="flex justify-center gap-8">
            {[
              { val: member.streams, label: 'Streams', color: member.color },
              { val: member.awards.length.toString(), label: 'Awards', color: '#FFFFFF' },
              { val: memberSongs.length.toString(), label: 'In Bank', color: '#FFFFFF' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-[22px] tracking-[1px]" style={{ fontFamily: "'Bebas Neue', sans-serif", color: s.color }}>{s.val}</div>
                <div className="text-[7px] tracking-[1.5px] uppercase" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.5)' }}>{s.label}</div>
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Awards */}
          <div className="mb-6">
            <div className="text-[8px] tracking-[2px] uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650', fontWeight: 500 }}>Awards</div>
            <div className="flex flex-wrap gap-2">
              {member.awards.map(a => (
                <div key={a} className="flex items-center gap-[5px] px-[10px] py-[6px] rounded-lg" style={{ background: 'var(--th-white)', border: '1px solid var(--border)' }}>
                  <span className="text-[12px]">🏆</span>
                  <span className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace" }}>{a}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notable Hits */}
          <div className="mb-6">
            <div className="text-[8px] tracking-[2px] uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650', fontWeight: 500 }}>Notable Hits</div>
            {member.hits.map((h, i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <span className="text-[11px] w-[16px] text-center" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--muted-l)' }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate">{h.t}</div>
                  <div className="text-[10px]" style={{ color: '#6a6660' }}>{h.a}</div>
                </div>
                <span className="text-[11px] flex-shrink-0" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--amber)' }}>{h.s}</span>
                <div className="w-[60px] h-[4px] rounded-full overflow-hidden flex-shrink-0" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(parseFloat(h.s) / maxStreams * 100).toFixed(0)}%`, background: 'var(--amber)' }} />
                </div>
              </div>
            ))}
          </div>

          {/* In The Bank */}
          <div className="mb-6">
            <div className="text-[8px] tracking-[2px] uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650', fontWeight: 500 }}>In The Bank</div>
            {memberSongs.length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--muted)', fontWeight: 300 }}>No songs currently in the bank.</p>
            ) : (
              memberSongs.map(s => (
                <div key={s.id} className="rounded-xl p-3 mb-2 cursor-pointer" style={{ background: 'var(--th-white)', border: '1px solid var(--border)' }}
                  onClick={() => { onClose(); setTimeout(() => onOpenDetail(s.id), 100); }}>
                  <div className="text-[16px] tracking-[1px] mb-[2px]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{s.title}</div>
                  <div className="text-[9px] mb-2" style={{ fontFamily: "'DM Mono', monospace", color: '#6a6660' }}>{s.genre} · {s.bpm} BPM · {s.key}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>$85K</span>
                    <button className="px-3 py-1 rounded-md text-[8px] tracking-[1px] uppercase cursor-pointer border-none"
                      style={{ fontFamily: "'DM Mono', monospace", background: 'var(--black)', color: '#FFFFFF' }}>
                      Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="h-[80px]" />
      </div>
    </div>
  );
}
