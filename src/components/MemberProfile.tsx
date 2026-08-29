'use client';

import { Member, Song } from '@/data/types';
import { FEATURES } from '@/lib/features';

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
            /* object-cover crops to fill, which decapitates a portrait-shaped
               photo. Show the whole image with object-contain instead, and fill
               the leftover space with a blurred, zoomed copy of itself so the
               frame still reads as a designed banner rather than letterboxing. */
            <div className="relative w-full overflow-hidden" style={{ height: 190 }}>
              <img
                src={member.banner_url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'blur(22px)', transform: 'scale(1.2)', opacity: 0.45 }}
              />
              <img
                src={member.banner_url}
                alt=""
                className="relative w-full h-full object-contain"
                style={{ opacity: 0.9 }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, transparent 45%, var(--black) 100%)' }}
              />
            </div>
          ) : (
            <div className="h-[20px]" />
          )}
          <div className={member.banner_url ? "px-5 pb-6 -mt-[18px] relative z-10" : "px-5 py-6"}>
          {/* No avatar bubble: the banner already shows the artist, and a second
              portrait on top of it competed with it. Kept behind the flag so the
              full build still gets an avatar when there is no banner. */}
          {FEATURES.memberCredentials && (member.avatar_url ? (
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
          ))}
          <div className="text-label tracking-[1px] uppercase mb-1" style={{ fontFamily: "'DM Mono', monospace", color: member.color }}>{member.role}</div>
          <div className="text-[40px] tracking-[2px] leading-none mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#FFFFFF' }}>{member.name}</div>
          <div className="text-body mb-4" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{member.bio}</div>
          {/* The whole counter row goes with the credentials — In Bank was the
              only one left and the space is better spent on the photo. */}
          {FEATURES.memberCredentials && <div className="flex justify-center gap-8">
            {[
              { val: member.streams, label: 'Streams', color: member.color },
              { val: member.awards.length.toString(), label: 'Awards', color: '#FFFFFF' },
              { val: memberSongs.length.toString(), label: 'In Bank', color: '#FFFFFF' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-[22px] tracking-[1px]" style={{ fontFamily: "'Bebas Neue', sans-serif", color: s.color }}>{s.val}</div>
                <div className="text-micro tracking-[1.5px] uppercase" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.5)' }}>{s.label}</div>
              </div>
            ))}
          </div>}
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Awards */}
          {FEATURES.memberCredentials && <div className="mb-6">
            <div className="text-caption tracking-[2px] uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650', fontWeight: 500 }}>Awards</div>
            <div className="flex flex-wrap gap-2">
              {member.awards.map(a => (
                <div key={a} className="flex items-center gap-[5px] px-[10px] py-[6px] rounded-lg" style={{ background: 'var(--th-white)', border: '1px solid var(--border)' }}>
                  <span className="text-[12px]">🏆</span>
                  <span className="text-label" style={{ fontFamily: "'DM Mono', monospace" }}>{a}</span>
                </div>
              ))}
            </div>
          </div>}

          {/* Notable Hits */}
          {FEATURES.memberCredentials && <div className="mb-6">
            <div className="text-caption tracking-[2px] uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650', fontWeight: 500 }}>Notable Hits</div>
            {member.hits.map((h, i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <span className="text-body w-[16px] text-center" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--muted-l)' }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate">{h.t}</div>
                  <div className="text-label" style={{ color: '#6a6660' }}>{h.a}</div>
                </div>
                <span className="text-body flex-shrink-0" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--amber)' }}>{h.s}</span>
                <div className="w-[60px] h-[4px] rounded-full overflow-hidden flex-shrink-0" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(parseFloat(h.s) / maxStreams * 100).toFixed(0)}%`, background: 'var(--amber)' }} />
                </div>
              </div>
            ))}
          </div>}

          {/* In The Bank */}
          <div className="mb-6">
            <div className="text-caption tracking-[2px] uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650', fontWeight: 500 }}>In The Bank</div>
            {memberSongs.length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--muted)', fontWeight: 300 }}>No songs currently in the bank.</p>
            ) : (
              memberSongs.map((s, i) => (
                <div key={s.id}
                  className="rounded-xl p-3 mb-2 cursor-pointer border-l-[3px] overflow-hidden"
                  style={{
                    // Tinted toward the writer's own colour and staggered, so a
                    // long list reads as separate songs rather than one slab.
                    background: i % 2 === 0
                      ? `linear-gradient(90deg, ${member.color}14, ${member.color}00 60%), var(--th-white)`
                      : `linear-gradient(90deg, ${member.color}14, ${member.color}00 60%), #F6F2E8`,
                    border: '1px solid var(--border)',
                    borderLeftColor: member.color,
                  }}
                  onClick={() => { onClose(); setTimeout(() => onOpenDetail(s.id), 100); }}>
                  <div className="flex items-baseline gap-2 mb-[2px]">
                    <span className="text-micro flex-shrink-0" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--muted-l)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[16px] tracking-[1px] truncate" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{s.title}</span>
                  </div>
                  <div className="flex items-center gap-[5px] flex-wrap mb-2">
                    <span className="px-[7px] py-[2px] rounded-full text-micro tracking-[1px] uppercase"
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        background: `${member.color}1f`,
                        color: member.color,
                        border: `1px solid ${member.color}44`,
                      }}>
                      {s.genre}
                    </span>
                    <span className="text-caption" style={{ fontFamily: "'DM Mono', monospace", color: '#6a6660' }}>
                      {s.bpm} BPM · {s.key}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    {FEATURES.pricing
                      ? <span className="text-[14px] font-medium" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>$85K</span>
                      : <span />}
                    <button className="px-3 py-1 rounded-md text-caption tracking-[1px] uppercase cursor-pointer border-none"
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
