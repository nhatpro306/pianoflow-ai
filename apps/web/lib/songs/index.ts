import type { GenreCategory, RepertoireSong } from "./types";
import { CLASSICAL_SONGS } from "./classical";
import { ANIME_SONGS } from "./anime";
import { KPOP_SONGS } from "./kpop";
import { MODERN_POP_SONGS } from "./modernPop";
import { CINEMATIC_GAME_SONGS } from "./cinematicGame";

export * from "./types";
export { CLASSICAL_SONGS } from "./classical";
export { ANIME_SONGS } from "./anime";
export { KPOP_SONGS } from "./kpop";
export { MODERN_POP_SONGS } from "./modernPop";
export { CINEMATIC_GAME_SONGS } from "./cinematicGame";

export const ALL_REPERTOIRE_SONGS: RepertoireSong[] = [
  ...CLASSICAL_SONGS,
  ...ANIME_SONGS,
  ...KPOP_SONGS,
  ...MODERN_POP_SONGS,
  ...CINEMATIC_GAME_SONGS,
];

export const GENRE_CATEGORIES = [
  "All",
  "Anime & Ghibli",
  "K-Pop",
  "Modern & Pop",
  "Cinematic & Game",
  "Classical",
] as const;

export type GenreFilter = (typeof GENRE_CATEGORIES)[number];

export function getSongsByGenre(genre: GenreCategory | "All"): RepertoireSong[] {
  if (genre === "All") {
    return ALL_REPERTOIRE_SONGS;
  }
  return ALL_REPERTOIRE_SONGS.filter((song) => song.genre === genre);
}

export function searchRepertoire(
  query: string,
  genre: GenreCategory | "All" = "All"
): RepertoireSong[] {
  const normalized = query.trim().toLowerCase();
  const pool = getSongsByGenre(genre);
  if (!normalized) return pool;

  return pool.filter((song) => {
    return (
      song.title.toLowerCase().includes(normalized) ||
      song.composer.toLowerCase().includes(normalized) ||
      song.key.toLowerCase().includes(normalized) ||
      song.period.toLowerCase().includes(normalized) ||
      song.tags?.some((t) => t.toLowerCase().includes(normalized))
    );
  });
}

export function getSongById(id: string): RepertoireSong | undefined {
  return ALL_REPERTOIRE_SONGS.find(
    (s) => s.id === id || (id === "gymnopedie-no-1" && s.id === "gymnopedie-1")
  );
}
