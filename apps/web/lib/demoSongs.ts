import {
  ALL_REPERTOIRE_SONGS,
  type RepertoireSong,
  type GenreCategory,
  type SongDifficulty,
  getSongById,
  getSongsByGenre,
  searchRepertoire,
  GENRE_CATEGORIES,
  type GenreFilter,
} from "./songs";

export type { SongDifficulty, GenreCategory, RepertoireSong, GenreFilter };
export type DemoSong = RepertoireSong;

export const DEMO_SONGS: DemoSong[] = ALL_REPERTOIRE_SONGS;

export const DEFAULT_DEMO_SONG_ID = "fur-elise";
export const DEFAULT_DEMO_SONG: DemoSong = DEMO_SONGS[0];

export function getDemoSong(id: string): DemoSong | undefined {
  return getSongById(id);
}

export function getDemoSongById(id: string): DemoSong | undefined {
  return getSongById(id);
}

export {
  ALL_REPERTOIRE_SONGS,
  getSongById,
  getSongsByGenre,
  searchRepertoire,
  GENRE_CATEGORIES,
};
