import { User, DealRoomMember } from './types';

export const CURRENT_USER: User = {
  id: 1,
  name: 'Marcus Johnson',
  initials: 'MJ',
  email: 'marcus@mgmt.co',
  role: 'Artist Manager',
  tier: 'tier1',
  user_type: 'manager',
  saved_song_ids: [1, 2, 6],
  artist_reactions: {},
  artist_flagged_ids: [],
};

export const DEAL_ROOM_TEAM: DealRoomMember[] = [
  {
    initials: 'SA',
    name: 'Sarah A.',
    role: 'A&R \u00B7 Atlantic',
    color: '#5AB4FF',
    reaction: 'maybe',
    note: 'Strong chorus, might not be right vibe for current project. Worth playing for the artist.',
    emoji: '\u301C',
  },
  {
    initials: 'DL',
    name: 'David L.',
    role: 'Artist Manager (Co.)',
    color: '#FFB830',
    reaction: 'yes',
    note: 'This could be the one for the summer drop. The hook is undeniable.',
    emoji: '\u2713',
  },
  {
    initials: 'JK',
    name: 'Jordan K.',
    role: 'The Artist',
    color: '#B57BFF',
    reaction: null,
    note: null,
    emoji: '',
    artistFlag: true,
    flagTime: '12m ago',
  },
];
