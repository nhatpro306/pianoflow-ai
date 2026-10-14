import {
  ALL_REPERTOIRE_SONGS,
  type RepertoireSong,
  type GenreCategory,
  type SongDifficulty,
  getSongById as getSongByIdInternal,
  getSongsByGenre,
  searchRepertoire,
  GENRE_CATEGORIES,
  type GenreFilter,
  isSongFullLength,
  loadSongNoteData,
  fetchFullSongJson,
  getCachedSongNoteData,
  FULL_SONG_IDS,
} from "./songs/index";

export type { SongDifficulty, GenreCategory, RepertoireSong, GenreFilter };
export type DemoSong = RepertoireSong;

/**
 * High-demand Canonical & Common Repertoire ID Aliases
 * Ensures seamless lookup across Anime/Ghibli, Pop/Neoclassical, Film Themes, and Classical monuments.
 */
export const DEMO_SONG_ALIASES: Record<string, string> = {
  // Classical Monuments
  "gymnopedie-no-1": "gymnopedie-1",
  "prelude-in-c": "bach-prelude-c-major",
  "bach-prelude": "bach-prelude-c-major",
  "moonlight": "moonlight-sonata",
  "rondo-alla-turca": "mozart-rondo-alla-turca",
  "chopin-nocturne": "chopin-nocturne-op9-no2",
  "chopin-waltz-a-minor": "chopin-waltz-in-a-minor",

  // Anime & Ghibli Masterpieces
  "sparkle": "sparkle-your-name",
  "sparkle-radwimps": "sparkle-your-name",
  "merry-go-round": "merry-go-round-of-life",
  "howls-moving-castle": "merry-go-round-of-life",
  "spirited-away": "one-summers-day",
  "one-summer-day": "one-summers-day",
  "tokyo-ghoul": "unravel",
  "demon-slayer": "gurenge",
  "naruto-sadness": "sadness-and-sorrow",
  "naruto": "sadness-and-sorrow",
  "evangelion": "a-cruel-angels-thesis",

  // Modern Pop & Neoclassical Hits
  "river-flows": "river-flows-in-you",
  "golden-hour": "golden-hour-jvke",
  "einaudi-nuvole": "nuvole-bianche",

  // Cinematic Film Themes
  "interstellar": "interstellar-main-theme",
  "comptine-dun-autre-ete": "comptine-amelie",
  "amelie": "comptine-amelie",
  "pirates-of-the-caribbean": "hes-a-pirate",
  "pirates": "hes-a-pirate",
  "he-is-a-pirate": "hes-a-pirate",

  // K-Pop Anthems
  "spring-day": "spring-day-bts",
  "bts-spring-day": "spring-day-bts",
  "butter": "butter-bts",
  "dynamite": "dynamite-bts",
  "love-scenario": "love-scenario-ikon",

  // Jazz & Lo-Fi Standards
  "autumn-leaves": "autumn-leaves",
  "autumn-leaves-evans": "autumn-leaves",
  "fly-me-to-the-moon": "fly-me-to-the-moon-jazz",
  "take-five": "take-five",
  "the-girl-from-ipanema": "the-girl-from-ipanema",
  "girl-from-ipanema": "the-girl-from-ipanema",
};

/** Helper to resolve canonical song or fallback */
function resolveSong(id: string): RepertoireSong | undefined {
  const normalized = id.trim().toLowerCase();
  const canonicalId = DEMO_SONG_ALIASES[normalized] || normalized;

  // Direct ID match in all repertoire songs
  let found = ALL_REPERTOIRE_SONGS.find((s) => s.id === canonicalId || s.id === normalized);
  if (found) return found;

  // Internal resolver check
  found = getSongByIdInternal(canonicalId) || getSongByIdInternal(normalized);
  if (found) return found;

  // Substring or title/slug fallback
  return ALL_REPERTOIRE_SONGS.find(
    (s) =>
      s.id.includes(canonicalId) ||
      canonicalId.includes(s.id) ||
      s.title.toLowerCase().replace(/[^a-z0-9]/g, "") ===
        canonicalId.replace(/[^a-z0-9]/g, "")
  );
}

/**
 * Canonical Song Constants
 * Guaranteed non-null exports for landmark pieces across Classical, Anime, K-Pop, Modern Pop, Cinematic, and Jazz genres.
 */
// Classical Monuments
export const FUR_ELISE: DemoSong =
  resolveSong("fur-elise") ?? ALL_REPERTOIRE_SONGS[0];

export const CLAIR_DE_LUNE: DemoSong =
  resolveSong("clair-de-lune") ?? ALL_REPERTOIRE_SONGS[1];

export const GYMNOPEDIE_1: DemoSong =
  resolveSong("gymnopedie-1") ?? ALL_REPERTOIRE_SONGS[2];

export const GYMNOPEDIE_NO_1: DemoSong = {
  ...GYMNOPEDIE_1,
  id: "gymnopedie-no-1",
};

export const CANON_IN_D: DemoSong =
  resolveSong("canon-in-d") ?? ALL_REPERTOIRE_SONGS[3];

export const MOONLIGHT_SONATA: DemoSong =
  resolveSong("moonlight-sonata") ?? ALL_REPERTOIRE_SONGS[0];

// Anime & Ghibli Masterpieces
export const MERRY_GO_ROUND_OF_LIFE: DemoSong =
  resolveSong("merry-go-round-of-life") ?? ALL_REPERTOIRE_SONGS[0];

export const ONE_SUMMERS_DAY: DemoSong =
  resolveSong("one-summers-day") ?? ALL_REPERTOIRE_SONGS[0];

export const SPARKLE: DemoSong =
  resolveSong("sparkle-your-name") ?? ALL_REPERTOIRE_SONGS[0];

export const UNRAVEL: DemoSong =
  resolveSong("unravel") ?? ALL_REPERTOIRE_SONGS[0];

// K-Pop Anthems
export const SPRING_DAY: DemoSong =
  resolveSong("spring-day-bts") ?? ALL_REPERTOIRE_SONGS[0];

export const BUTTER: DemoSong =
  resolveSong("butter-bts") ?? ALL_REPERTOIRE_SONGS[0];

export const DYNAMITE: DemoSong =
  resolveSong("dynamite-bts") ?? ALL_REPERTOIRE_SONGS[0];

// Modern Pop & Neoclassical Hits
export const RIVER_FLOWS_IN_YOU: DemoSong =
  resolveSong("river-flows-in-you") ?? ALL_REPERTOIRE_SONGS[0];

export const GOLDEN_HOUR: DemoSong =
  resolveSong("golden-hour-jvke") ?? ALL_REPERTOIRE_SONGS[0];

export const NUVOLE_BIANCHE: DemoSong =
  resolveSong("nuvole-bianche") ?? ALL_REPERTOIRE_SONGS[0];

// Cinematic Film Themes
export const INTERSTELLAR_MAIN_THEME: DemoSong =
  resolveSong("interstellar-main-theme") ?? ALL_REPERTOIRE_SONGS[0];

export const COMPTINE_AMELIE: DemoSong =
  resolveSong("comptine-amelie") ?? ALL_REPERTOIRE_SONGS[0];

export const HES_A_PIRATE: DemoSong =
  resolveSong("hes-a-pirate") ?? ALL_REPERTOIRE_SONGS[0];

// Jazz & Lo-Fi Standards
export const AUTUMN_LEAVES: DemoSong =
  resolveSong("autumn-leaves") ?? ALL_REPERTOIRE_SONGS[0];

export const FLY_ME_TO_THE_MOON: DemoSong =
  resolveSong("fly-me-to-the-moon-jazz") ?? ALL_REPERTOIRE_SONGS[0];

export const TAKE_FIVE: DemoSong =
  resolveSong("take-five") ?? ALL_REPERTOIRE_SONGS[0];

export const THE_GIRL_FROM_IPANEMA: DemoSong =
  resolveSong("the-girl-from-ipanema") ?? ALL_REPERTOIRE_SONGS[0];

/**
 * Generate synthetic alias song entries for DEMO_SONGS array
 * Allows direct lookup via DEMO_SONGS.find(s => s.id === "sparkle") or "golden-hour".
 */
const ALIAS_ENTRIES: DemoSong[] = Object.entries(DEMO_SONG_ALIASES).flatMap(
  ([aliasId, canonicalId]) => {
    const canonicalSong = ALL_REPERTOIRE_SONGS.find((s) => s.id === canonicalId);
    if (!canonicalSong) return [];
    if (ALL_REPERTOIRE_SONGS.some((s) => s.id === aliasId)) return [];
    return [{ ...canonicalSong, id: aliasId }];
  }
);

/**
 * The full canonical DEMO_SONGS collection.
 * Classical masterworks retain positions [0..3], followed by the complete 23+ piece multi-genre catalog
 * plus high-demand alias identifiers for 100% resilient querying.
 */
export const DEMO_SONGS: DemoSong[] = [
  ...ALL_REPERTOIRE_SONGS,
  ...ALIAS_ENTRIES,
];

export const DEFAULT_DEMO_SONG_ID = "fur-elise";
export const DEFAULT_DEMO_SONG: DemoSong = DEMO_SONGS[0];

export function getSongById(id: string): DemoSong | undefined {
  return resolveSong(id);
}

export function getDemoSong(id: string): DemoSong | undefined {
  return resolveSong(id);
}

export function getDemoSongById(id: string): DemoSong | undefined {
  return resolveSong(id);
}

export {
  ALL_REPERTOIRE_SONGS,
  getSongsByGenre,
  searchRepertoire,
  GENRE_CATEGORIES,
  isSongFullLength,
  loadSongNoteData,
  fetchFullSongJson,
  getCachedSongNoteData,
  FULL_SONG_IDS,
};
