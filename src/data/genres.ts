/**
 * The canonical genre list — the single source for both the admin song form's
 * dropdown and the filter chips in the app.
 *
 * These were previously two separate hardcoded arrays. Adding a genre in one
 * and not the other produced songs that could be created but never filtered to,
 * so keep this as the only place the list is written down.
 *
 * `label` is what the chip shows when the full name is too wide for a phone;
 * `value` is what gets stored on the song row, so renaming one means migrating
 * existing rows.
 */

export interface Genre {
  value: string;
  label: string;
}

export const GENRES: Genre[] = [
  { value: 'Pop', label: 'Pop' },
  { value: 'R&B', label: 'R&B' },
  { value: 'Hip-Hop', label: 'Hip-Hop' },
  { value: 'Country', label: 'Country' },
  { value: 'Rock', label: 'Rock' },
  { value: 'Alternative', label: 'Alt' },
  { value: 'Dance / EDM', label: 'EDM' },
  { value: 'K-Pop', label: 'K-Pop' },
  { value: 'Latin', label: 'Latin' },
  { value: 'Afrobeats', label: 'Afrobeats' },
  { value: 'Folk / Americana', label: 'Folk' },
  { value: 'Jazz', label: 'Jazz' },
  { value: 'Gospel / Christian', label: 'Gospel' },
  { value: 'Reggae / Dancehall', label: 'Reggae' },
  { value: 'Soundtrack', label: 'Soundtrack' },
];

export const GENRE_VALUES = GENRES.map(g => g.value);

/** Chip label for a stored genre value, falling back to the value itself so a
 *  genre added directly in the database still renders sensibly. */
export function genreLabel(value: string): string {
  return GENRES.find(g => g.value === value)?.label ?? value;
}
