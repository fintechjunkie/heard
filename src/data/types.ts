export interface Song {
  id: number;
  title: string;
  writers: string[];
  writer_ids: number[];
  genre: string;
  bpm: number;
  key: string;
  mood: string[];
  tier1_days_remaining: number;
  days_in_bank: number;
  audio_url: string;
  audio_duration_seconds: number;
  color: string;
  gradient: string;
  status: 'available' | 'reserved' | 'purchased';
  reserved_by: number | null;
  reserved_until: string | null;
  purchased_by: number | null;
  purchased_at: string | null;
  credit_type: 'fixed' | 'open';
  is_new: boolean;
  season_id: number;
  created_at: string;
  artistFlagged: boolean;
  artistFlagTime: string | null;
  artistReaction: string | null;
}

export interface Member {
  id: number;
  name: string;
  initials: string;
  role: string;
  color: string;
  bio: string;
  streams: string;
  awards: string[];
  hits: { t: string; a: string; s: string }[];
  member_type: 'founding' | 'general';
  joined_at: string;
  avatar_url?: string;
  banner_url?: string;
}

export interface Team {
  id: number;
  name: string;
  description: string;
  member_count?: number;
  created_at: string;
}

export interface TeamMember {
  id: number;
  user_id: string;
  role_in_team: string;
  joined_at: string;
  full_name: string;
  email: string;
  role: string;
  tier: string;
  avatar_url?: string;
}

export interface User {
  id: number;
  name: string;
  initials: string;
  email: string;
  role: string;
  tier: 'tier1' | 'tier2';
  user_type: 'manager' | 'ar' | 'artist' | 'label_admin';
  saved_song_ids: number[];
  artist_reactions: Record<number, string>;
  artist_flagged_ids: number[];
}

export interface DealRoomMember {
  initials: string;
  name: string;
  role: string;
  color: string;
  reaction: 'yes' | 'maybe' | 'no' | null;
  note: string | null;
  emoji: string;
  artistFlag?: boolean;
  flagTime?: string;
}

export interface Season {
  id: number;
  name: string;
  type: 'C' | 'P';
  status: 'active' | 'closed' | 'archived';
  platform_take_pct: number;
  songs: number[];
  created_at: string;
}
