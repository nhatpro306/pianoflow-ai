import type { Note, NoteData } from "@pianoflow/shared-types";
import type {
  GenreCategory,
  RepertoireSong,
  SongDifficulty,
} from "./types";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function pitchToName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  const name = NOTE_NAMES[((pitch % 12) + 12) % 12];
  return `${name}${octave}`;
}

export interface MotifSongInput {
  id: string;
  title: string;
  composer: string;
  period: string;
  genre: GenreCategory;
  difficulty: SongDifficulty;
  bpm: number;
  time_signature?: string;
  key: string;
  description: string;
  coverGradient: string;
  tags?: string[];
  // Musical styling
  rootPitch?: number;
  scale?: "major" | "minor" | "pentatonic" | "dorian";
  pattern?:
    | "ballad"
    | "waltz"
    | "pop"
    | "arpeggio"
    | "cinematic"
    | "energetic"
    | "alberti"
    | "walking_bass"
    | "pop_groove"
    | "ballad_arpeggio"
    | "anime_run";
  bars?: number;
  chordRoots?: number[];
  melodyContour?: number[];
}

const KEY_TO_ROOT: Record<string, number> = {
  C: 60,
  "C#": 61,
  Db: 61,
  D: 62,
  "D#": 63,
  Eb: 63,
  E: 64,
  F: 65,
  "F#": 66,
  Gb: 66,
  G: 67,
  "G#": 68,
  Ab: 68,
  A: 69,
  "A#": 70,
  Bb: 70,
  B: 71,
};

export function getKeyRootPitch(keyStr: string): { rootPitch: number; isMinor: boolean } {
  const parts = keyStr.trim().split(/\s+/);
  const notePart = parts[0] || "C";
  const typePart = (parts[1] || "").toLowerCase();
  const root = KEY_TO_ROOT[notePart] ?? 60;
  const isMinor = typePart.startsWith("m") || typePart.includes("min");
  return { rootPitch: root, isMinor };
}

/**
 * Deterministic 32-bit FNV-1a hash of string
 */
export function hashSongId(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

type AccompanimentStyle =
  | "alberti"
  | "walking_bass"
  | "pop_groove"
  | "ballad_arpeggio"
  | "waltz"
  | "anime_run";

function resolveAccompanimentStyle(
  inputPattern: MotifSongInput["pattern"],
  isWaltz: boolean,
  genre: GenreCategory,
  difficulty: SongDifficulty,
  hash: number
): AccompanimentStyle {
  if (inputPattern) {
    switch (inputPattern) {
      case "alberti":
        return "alberti";
      case "walking_bass":
        return "walking_bass";
      case "pop":
      case "pop_groove":
        return "pop_groove";
      case "waltz":
        return "waltz";
      case "energetic":
      case "anime_run":
        return "anime_run";
      case "ballad":
      case "arpeggio":
      case "cinematic":
      case "ballad_arpeggio":
      default:
        return "ballad_arpeggio";
    }
  }

  if (isWaltz) {
    return "waltz";
  }

  if (genre === "Jazz & Lo-Fi") {
    return "walking_bass";
  }

  if (genre === "Classical") {
    return difficulty === "Beginner" ? "ballad_arpeggio" : "alberti";
  }

  if (genre === "Anime & Ghibli") {
    if (difficulty === "Master") return "anime_run";
    return hash % 2 === 0 ? "anime_run" : "ballad_arpeggio";
  }

  if (genre === "K-Pop") {
    return "pop_groove";
  }

  if (genre === "Modern & Pop") {
    return hash % 2 === 0 ? "pop_groove" : "ballad_arpeggio";
  }

  if (genre === "Cinematic & Game") {
    if (difficulty === "Master") return "anime_run";
    return hash % 2 === 0 ? "ballad_arpeggio" : "anime_run";
  }

  return "ballad_arpeggio";
}

export interface IconicTheme {
  keywords: string[];
  scale?: "major" | "minor";
  pattern?: AccompanimentStyle;
  chordRoots: number[];
  melodyContour: number[];
}

export const ICONIC_THEME_REGISTRY: IconicTheme[] = [
  {
    keywords: ["riverflows", "river-flows-in-you", "yiruma"],
    chordRoots: [9, 5, 0, 7, 9, 5, 0, 7],
    melodyContour: [11, 12, 11, 12, 7, 0, 4, 7, 11, 12, 11, 12, 16, 12, 9, 7, 11, 12, 11, 12, 7, 4, 0, 7],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["interstellar", "first-step", "hans-zimmer-interstellar"],
    scale: "minor",
    chordRoots: [0, 8, 3, 10, 0, 8, 3, 10],
    melodyContour: [0, 2, 3, 2, 0, -5, 0, 2, 3, 5, 3, 2, 0, 2, 3, 2, 0, -5, 0, 2, 3, 7, 5, 3],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["sparkle", "your-name", "radwimps-sparkle"],
    chordRoots: [5, 7, 4, 9, 5, 7, 0, 0],
    melodyContour: [16, 14, 11, 9, 11, 14, 16, 19, 16, 14, 11, 9, 7, 9, 11, 14, 16, 14, 11, 9, 11, 14, 16, 21],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["moonlight-sonata-3rd", "presto-agitato"],
    scale: "minor",
    chordRoots: [0, 0, 5, 7, 0, 0, 5, 7],
    melodyContour: [0, 3, 7, 12, 15, 19, 24, 27, 31, 24, 19, 15, 12, 7, 3, 0, 0, 3, 7, 12, 15, 19, 24, 27],
    pattern: "anime_run",
  },
  {
    keywords: ["moonlight-sonata", "beethoven-moonlight"],
    scale: "minor",
    chordRoots: [0, 8, 5, 7, 0, 8, 5, 7],
    melodyContour: [7, 7, 7, 8, 7, 5, 7, 8, 10, 12, 10, 8, 7, 5, 3, 2, 0, 3, 7, 8, 7, 5, 3, 2],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["canon-in-d", "pachelbel-canon"],
    chordRoots: [0, 7, 9, 4, 5, 0, 5, 7],
    melodyContour: [16, 14, 12, 11, 9, 7, 9, 11, 12, 14, 16, 14, 12, 11, 9, 7, 9, 11, 12, 14, 16, 17, 19, 16],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["fur-elise", "beethoven-fur-elise"],
    scale: "minor",
    chordRoots: [0, 7, 0, 7, 0, 7, 0, 7],
    melodyContour: [19, 18, 19, 18, 19, 14, 17, 15, 12, 7, 12, 15, 19, 18, 19, 18, 19, 14, 17, 15, 12, 7, 12, 15],
    pattern: "waltz",
  },
  {
    keywords: ["clair-de-lune", "debussy-clair-de-lune"],
    chordRoots: [0, 5, 0, 7, 0, 5, 0, 7],
    melodyContour: [16, 14, 12, 11, 9, 7, 4, 0, 4, 7, 11, 12, 14, 16, 12, 7, 4, 7, 11, 12, 14, 16, 19, 16],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["gymnopedie-1", "gymnopedie-no-1", "satie-gymnopedie"],
    chordRoots: [5, 0, 5, 0, 5, 0, 5, 0],
    melodyContour: [16, 14, 12, 9, 11, 12, 14, 16, 14, 12, 9, 7, 9, 11, 12, 14, 16, 14, 12, 9, 11, 12, 14, 16],
    pattern: "waltz",
  },
  {
    keywords: ["gurenge", "demon-slayer", "lisa-gurenge"],
    scale: "minor",
    chordRoots: [0, 8, 10, 0, 0, 8, 10, 0],
    melodyContour: [15, 17, 19, 22, 19, 17, 15, 12, 15, 17, 19, 17, 15, 12, 10, 12, 15, 17, 19, 22, 24, 22, 19, 17],
    pattern: "anime_run",
  },
  {
    keywords: ["spring-day", "bts-spring-day"],
    chordRoots: [0, 7, 9, 5, 0, 7, 9, 5],
    melodyContour: [7, 12, 16, 14, 12, 11, 7, 9, 11, 12, 14, 12, 7, 9, 11, 12, 14, 16, 14, 12, 11, 9, 7, 12],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["autumn-leaves", "kosma-autumn-leaves"],
    scale: "minor",
    chordRoots: [5, 10, 3, 8, 2, 7, 0, 0],
    melodyContour: [5, 7, 8, 15, 14, 15, 17, 10, 3, 5, 7, 14, 12, 14, 15, 8, 2, 3, 5, 12, 10, 12, 14, 7],
    pattern: "walking_bass",
  },
  {
    keywords: ["fly-me-to-the-moon", "sinatra-fly-me-to-the-moon"],
    chordRoots: [0, 5, 10, 3, 8, 2, 7, 0],
    melodyContour: [15, 14, 12, 10, 8, 10, 12, 15, 14, 12, 10, 8, 7, 8, 10, 12, 14, 12, 10, 8, 7, 8, 10, 12],
    pattern: "walking_bass",
  },
  {
    keywords: ["megalovania", "sans-undertale", "toby-fox-megalovania"],
    scale: "minor",
    chordRoots: [0, 10, 9, 8, 0, 10, 9, 8],
    melodyContour: [0, 0, 12, 7, 6, 5, 3, 0, 3, 5, -2, -2, 12, 7, 6, 5, 3, 0, 3, 5, -3, -3, 12, 7],
    pattern: "anime_run",
  },
  {
    keywords: ["hes-a-pirate", "pirates-of-the-caribbean", "zimmer-pirates"],
    scale: "minor",
    chordRoots: [0, 8, 10, 0, 0, 8, 10, 0],
    melodyContour: [0, 0, 0, 2, 3, 3, 3, 5, 2, 2, 0, -2, 0, 0, 0, 2, 3, 3, 3, 5, 7, 7, 5, 3],
    pattern: "anime_run",
  },
  {
    keywords: ["golden-hour", "jvke-golden-hour"],
    chordRoots: [5, 0, 7, 9, 5, 0, 7, 9],
    melodyContour: [12, 16, 19, 24, 19, 16, 12, 16, 19, 24, 19, 16, 14, 17, 21, 26, 21, 17, 14, 17, 21, 26, 21, 17],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["super-mario", "mario-theme", "koji-kondo-mario"],
    chordRoots: [0, 5, 7, 0, 0, 5, 7, 0],
    melodyContour: [16, 16, 16, 12, 16, 19, 7, 12, 7, 4, 9, 11, 10, 9, 7, 16, 19, 21, 17, 19, 16, 12, 14, 11],
    pattern: "pop_groove",
  },
  {
    keywords: ["tetris", "korobeiniki", "tetris-theme"],
    scale: "minor",
    chordRoots: [0, 7, 0, 5, 0, 7, 0, 0],
    melodyContour: [19, 14, 15, 17, 15, 14, 12, 12, 15, 19, 17, 15, 14, 15, 17, 19, 15, 12, 12, 14, 15, 17, 15, 14],
    pattern: "anime_run",
  },
  {
    keywords: ["merry-go-round", "howls-moving-castle", "hisaishi-merry-go-round"],
    scale: "minor",
    chordRoots: [0, 5, 7, 0, 0, 5, 7, 0],
    melodyContour: [7, 3, 0, -1, 0, 3, 7, 12, 11, 12, 15, 14, 12, 10, 8, 7, 5, 3, 2, 3, 5, 7, 3, 0],
    pattern: "waltz",
  },
  {
    keywords: ["one-summers-day", "spirited-away", "hisaishi-one-summers-day"],
    chordRoots: [5, 7, 4, 9, 5, 7, 0, 0],
    melodyContour: [12, 14, 16, 19, 21, 19, 16, 14, 12, 16, 14, 12, 9, 12, 14, 16, 19, 21, 23, 24, 21, 19, 16, 14],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["cruel-angels-thesis", "evangelion-thesis", "zankoku-na-tenshi"],
    scale: "minor",
    chordRoots: [0, 8, 10, 0, 0, 8, 10, 0],
    melodyContour: [12, 14, 15, 17, 19, 20, 19, 17, 15, 14, 12, 15, 14, 12, 10, 12, 14, 15, 17, 19, 20, 19, 17, 15],
    pattern: "anime_run",
  },
  {
    keywords: ["ode-to-joy", "symphony-no-9"],
    chordRoots: [0, 7, 0, 7, 0, 7, 0, 7],
    melodyContour: [16, 16, 17, 19, 19, 17, 16, 14, 12, 12, 14, 16, 16, 14, 14, 16, 16, 17, 19, 19, 17, 16, 14, 12],
    pattern: "alberti",
  },
  {
    keywords: ["turkish-march", "rondo-alla-turca", "mozart-turkish-march"],
    scale: "minor",
    chordRoots: [0, 7, 0, 7, 0, 7, 0, 7],
    melodyContour: [14, 12, 11, 12, 15, 14, 12, 11, 12, 17, 15, 14, 12, 11, 12, 14, 12, 11, 12, 15, 14, 12, 11, 12],
    pattern: "alberti",
  },
  {
    keywords: ["chopin-nocturne-op9-no2", "nocturne-op-9-no-2"],
    chordRoots: [0, 9, 5, 7, 0, 9, 5, 7],
    melodyContour: [19, 19, 19, 21, 19, 16, 14, 12, 7, 12, 14, 16, 19, 17, 16, 14, 12, 14, 16, 19, 21, 19, 16, 14],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["someone-like-you", "adele-someone-like-you"],
    chordRoots: [0, 4, 9, 5, 0, 4, 9, 5],
    melodyContour: [0, 4, 7, 12, 11, 9, 7, 4, 0, 4, 7, 12, 14, 12, 11, 9, 7, 4, 0, 4, 7, 11, 12, 14],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["the-entertainer", "joplin-entertainer"],
    chordRoots: [0, 7, 0, 7, 0, 7, 0, 7],
    melodyContour: [2, 3, 4, 12, 4, 12, 4, 12, 11, 12, 14, 15, 14, 12, 11, 12, 2, 3, 4, 12, 4, 12, 4, 12],
    pattern: "pop_groove",
  },
  {
    keywords: ["take-five", "brubeck-take-five"],
    scale: "minor",
    chordRoots: [0, 7, 0, 7, 0, 7, 0, 7],
    melodyContour: [0, 3, 7, 10, 8, 7, 3, 0, 3, 7, 10, 8, 7, 5, 3, 0, 0, 3, 7, 10, 12, 10, 7, 3],
    pattern: "walking_bass",
  },
];

export function findIconicTheme(id: string, title: string): IconicTheme | undefined {
  const normId = id.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const theme of ICONIC_THEME_REGISTRY) {
    if (
      theme.keywords.some((kw) => {
        const cleanKw = kw.toLowerCase().replace(/[^a-z0-9]/g, "");
        return normId.includes(cleanKw) || normTitle.includes(cleanKw);
      })
    ) {
      return theme;
    }
  }
  return undefined;
}

export const GENRE_PROGRESSIONS: Record<
  GenreCategory,
  {
    major: { name: string; roots: number[] }[];
    minor: { name: string; roots: number[] }[];
  }
> = {
  "Anime & Ghibli": {
    major: [
      { name: "Royal Road (Oudou)", roots: [5, 7, 4, 9, 5, 7, 0, 0] },
      { name: "Komuro Progression", roots: [9, 5, 7, 0, 9, 5, 7, 9] },
      { name: "Shibuya-kei JTTU", roots: [5, 4, 9, 0, 5, 4, 9, 0] },
      { name: "Ghibli Lyrical", roots: [0, 4, 5, 7, 0, 4, 5, 0] },
      { name: "Cathartic Ascending", roots: [5, 7, 9, 0, 5, 7, 0, 0] },
      { name: "Nostalgic Romance", roots: [9, 7, 5, 0, 9, 7, 5, 7] },
      { name: "Canon Anime Lilt", roots: [0, 7, 9, 4, 5, 0, 5, 7] },
      { name: "Hopeful Adventure", roots: [0, 5, 9, 7, 0, 5, 7, 0] },
    ],
    minor: [
      { name: "Shonen Battle", roots: [0, 8, 3, 10, 0, 8, 5, 7] },
      { name: "Dark Fantasy", roots: [0, 5, 8, 7, 0, 5, 7, 0] },
      { name: "Melancholic Regret", roots: [0, 10, 8, 7, 0, 10, 8, 7] },
      { name: "Tragic Hero", roots: [0, 8, 5, 10, 0, 8, 7, 0] },
      { name: "Battle Climax", roots: [8, 10, 0, 3, 8, 10, 7, 0] },
      { name: "Mystic Lore", roots: [0, 3, 8, 7, 0, 3, 5, 7] },
    ],
  },
  "Classical": {
    major: [
      { name: "Pachelbel Cycle", roots: [0, 7, 9, 4, 5, 0, 5, 7] },
      { name: "Alberti Sonatina", roots: [0, 5, 0, 7, 0, 5, 7, 0] },
      { name: "Mozart Galant", roots: [0, 2, 7, 0, 0, 5, 7, 0] },
      { name: "Romantic Cantabile", roots: [0, 9, 5, 7, 0, 9, 5, 7] },
      { name: "Pastoral Hymn", roots: [0, 5, 0, 7, 5, 0, 7, 0] },
      { name: "Brahmsian Warmth", roots: [0, 7, 5, 7, 9, 5, 7, 0] },
    ],
    minor: [
      { name: "Andalusian Cadence", roots: [0, 10, 8, 7, 0, 10, 8, 7] },
      { name: "Circle of Fifths", roots: [0, 5, 10, 3, 8, 2, 7, 0] },
      { name: "Baroque Chaconne", roots: [0, 7, 0, 5, 0, 7, 0, 0] },
      { name: "Sturm und Drang", roots: [0, 8, 5, 7, 0, 8, 7, 0] },
      { name: "Mournful Elegy", roots: [0, 3, 5, 7, 8, 7, 5, 7] },
      { name: "Passacaglia Drama", roots: [0, 5, 8, 7, 0, 5, 7, 0] },
    ],
  },
  "Jazz & Lo-Fi": {
    major: [
      { name: "Classic ii-V-I-VI", roots: [2, 7, 0, 9, 2, 7, 0, 9] },
      { name: "12-Bar Blues", roots: [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7] },
      { name: "Lo-Fi Chillhop", roots: [5, 4, 9, 7, 5, 4, 9, 0] },
      { name: "Bossa Nova Clave", roots: [0, 9, 2, 7, 0, 9, 2, 7] },
      { name: "Autumn Cadence", roots: [2, 7, 0, 5, 11, 4, 9, 0] },
      { name: "Neo-Soul Vamp", roots: [5, 7, 4, 9, 2, 7, 0, 0] },
    ],
    minor: [
      { name: "Minor Blues", roots: [0, 0, 0, 0, 5, 5, 0, 0, 8, 7, 0, 7] },
      { name: "Modal Dorian Vamp", roots: [0, 5, 0, 5, 0, 5, 0, 5] },
      { name: "Lo-Fi Midnight", roots: [0, 8, 5, 7, 0, 8, 2, 7] },
      { name: "Jazz Noir", roots: [0, 10, 8, 7, 0, 5, 7, 0] },
      { name: "Rainy Cafe", roots: [2, 7, 0, 9, 2, 7, 0, 0] },
      { name: "Smoky Lounge", roots: [0, 5, 10, 3, 8, 7, 0, 0] },
    ],
  },
  "Modern & Pop": {
    major: [
      { name: "4 Chords of Pop", roots: [0, 7, 9, 5, 0, 7, 9, 5] },
      { name: "Sensitive Pop", roots: [9, 5, 0, 7, 9, 5, 0, 7] },
      { name: "Uplifting Anthem", roots: [5, 0, 7, 9, 5, 0, 7, 0] },
      { name: "50s Doo-Wop", roots: [0, 9, 5, 7, 0, 9, 5, 7] },
      { name: "Acoustic Ballad", roots: [0, 5, 9, 7, 0, 5, 7, 0] },
      { name: "Driving Pop Rock", roots: [0, 5, 7, 5, 0, 5, 7, 0] },
    ],
    minor: [
      { name: "Modern Minor Hit", roots: [0, 8, 3, 10, 0, 8, 3, 10] },
      { name: "Emotional Dark Pop", roots: [0, 5, 8, 7, 0, 5, 8, 7] },
      { name: "Billie Bass Drop", roots: [0, 8, 5, 7, 0, 8, 7, 0] },
      { name: "Melancholy Pop Ballad", roots: [0, 10, 8, 7, 0, 10, 8, 7] },
      { name: "Hypnotic Groove", roots: [0, 3, 8, 7, 0, 3, 7, 0] },
      { name: "Dance Pop Minor", roots: [8, 10, 0, 3, 8, 10, 0, 0] },
    ],
  },
  "K-Pop": {
    major: [
      { name: "High-Energy Synth Pop", roots: [9, 5, 7, 0, 9, 5, 7, 0] },
      { name: "R&B Hook Cadence", roots: [5, 7, 4, 9, 5, 7, 0, 0] },
      { name: "Emotional K-Drama Ballad", roots: [0, 4, 9, 5, 0, 4, 5, 7] },
      { name: "Bubblegum Pop", roots: [0, 7, 9, 5, 0, 7, 5, 0] },
      { name: "Neo-Soul Groove", roots: [2, 7, 0, 9, 2, 7, 0, 0] },
      { name: "Dynamic Build", roots: [5, 0, 7, 9, 5, 7, 0, 0] },
    ],
    minor: [
      { name: "K-Pop Minor Drop", roots: [0, 5, 8, 7, 0, 5, 8, 7] },
      { name: "Epic Idol Beat", roots: [0, 8, 3, 10, 0, 8, 3, 10] },
      { name: "Dark Trap K-Pop", roots: [0, 8, 5, 7, 0, 8, 7, 0] },
      { name: "K-Drama Tears", roots: [0, 10, 8, 7, 0, 8, 7, 0] },
      { name: "Girl Crush Bass", roots: [8, 10, 0, 3, 8, 10, 7, 0] },
      { name: "Haunting Mystery", roots: [0, 3, 8, 7, 0, 5, 7, 0] },
    ],
  },
  "Cinematic & Game": {
    major: [
      { name: "Hero's Triumph", roots: [0, 10, 5, 0, 0, 10, 5, 0] },
      { name: "Fantasy Lore", roots: [0, 5, 9, 7, 0, 5, 7, 0] },
      { name: "Zelda Lullaby Arc", roots: [5, 7, 0, 9, 5, 7, 0, 0] },
      { name: "Sci-Fi Space Wonder", roots: [0, 7, 10, 5, 0, 7, 5, 0] },
      { name: "Gentle Nostalgia", roots: [0, 4, 5, 7, 9, 5, 7, 0] },
      { name: "Adventure Journey", roots: [5, 0, 7, 9, 5, 7, 0, 0] },
    ],
    minor: [
      { name: "Epic Journey", roots: [0, 8, 3, 10, 0, 8, 3, 10] },
      { name: "Hans Zimmer Power", roots: [0, 8, 5, 7, 0, 8, 7, 0] },
      { name: "Mystery RPG", roots: [0, 3, 8, 5, 0, 3, 7, 0] },
      { name: "Sci-Fi Orbit", roots: [0, 7, 8, 10, 0, 7, 8, 0] },
      { name: "Dark Souls Battle", roots: [0, 1, 0, 7, 0, 1, 7, 0] },
      { name: "Memorial Requiem", roots: [9, 5, 0, 7, 9, 5, 7, 0] },
    ],
  },
};

export function generateProceduralMelody(
  hash: number,
  genre: GenreCategory,
  scaleType: "major" | "minor" | "pentatonic" | "dorian",
  beatsPerBar: number,
  totalBars: number,
  chordRoots: number[]
): number[] {
  const isMinor = scaleType === "minor" || scaleType === "dorian";
  const thirdInterval = isMinor ? 3 : 4;
  const diatonicScale = isMinor
    ? [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22, 24]
    : [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24];

  const archetype = Math.abs((hash >>> 2) ^ (hash & 0x7)) % 8;
  const melody: number[] = [];

  for (let bar = 0; bar < totalBars; bar++) {
    const chordRoot = chordRoots[bar % chordRoots.length] ?? 0;
    const phrasePos = bar % 4; // 0: statement, 1: response, 2: climax, 3: resolution
    const barSeed = (hash ^ (bar * 7919) ^ 0x5bd1e995) >>> 0;

    // Chord tones for this bar
    const cRoot = chordRoot + 12;
    const cThird = chordRoot + 12 + thirdInterval;
    const cFifth = chordRoot + 12 + 7;
    const cOctave = chordRoot + 24;
    const cNinth = chordRoot + 24 + 2;

    for (let beat = 0; beat < beatsPerBar; beat++) {
      let pitch: number;
      const beatSeed = (barSeed ^ (beat * 1013)) >>> 0;

      if (beat === 0) {
        // Downbeat lands on anchor chord tone
        switch (archetype) {
          case 0: // Arch
            pitch = phrasePos === 2 ? cOctave : phrasePos === 0 ? cThird : cFifth;
            break;
          case 1: // Cascade
            pitch = phrasePos === 0 ? cOctave : phrasePos === 1 ? cFifth : cThird;
            break;
          case 2: // Undulating Wave
            pitch = phrasePos % 2 === 0 ? cThird : cFifth;
            break;
          case 3: // Syncopated Hook
            pitch = cFifth;
            break;
          case 4: // Pentatonic Swirl
            pitch = phrasePos === 2 ? cNinth : cFifth;
            break;
          case 5: // Stepwise Lyric
            pitch = phrasePos === 3 ? cRoot : cThird;
            break;
          case 6: // Ascending Heroic
            pitch = cRoot + phrasePos * 2;
            break;
          case 7: // Call & Response
          default:
            pitch = phrasePos < 2 ? cThird : cFifth;
            break;
        }
      } else {
        // Subdivisions / passing tones
        const stepOffset = (beatSeed % 5) - 2;
        const scaleIdx = Math.max(
          0,
          Math.min(
            diatonicScale.length - 1,
            diatonicScale.findIndex((p) => p >= cRoot) + beat * 2 + stepOffset
          )
        );
        pitch = diatonicScale[scaleIdx] ?? cFifth;
      }
      melody.push(pitch);
    }
  }

  return melody;
}

export function createMotifSong(input: MotifSongInput): RepertoireSong {
  const { rootPitch: defaultRoot, isMinor } = getKeyRootPitch(input.key);
  const root = input.rootPitch ?? defaultRoot;
  const scaleType = input.scale ?? (isMinor ? "minor" : "major");
  const timeSig = input.time_signature ?? "4/4";
  const bpm = input.bpm;
  const difficulty = input.difficulty;

  const thirdInterval = scaleType === "minor" || scaleType === "dorian" ? 3 : 4;
  const fifthInterval = 7;

  // Meter timing
  const isWaltz = timeSig === "3/4" || timeSig === "3/8";
  const beatsPerBar = isWaltz ? 3 : 4;
  const beatSec = (60 / bpm) * (timeSig === "3/8" ? 0.5 : 1);

  // Deterministic seed for unique textures across catalog
  const hash = hashSongId(input.id);

  // Match against Iconic Theme Registry
  const matchedTheme = findIconicTheme(input.id, input.title);

  // Dynamic bar count based on difficulty, meter, and hash
  let totalBars: number;
  if (input.bars) {
    totalBars = input.bars;
  } else if (isWaltz) {
    if (difficulty === "Beginner") {
      totalBars = 22 + (hash % 5) * 2; // 22 to 30 bars (~66-90 beats)
    } else if (difficulty === "Intermediate") {
      totalBars = 34 + (hash % 7) * 2; // 34 to 46 bars (~102-138 beats)
    } else {
      // Master
      totalBars = 52 + (hash % 11) * 2; // 52 to 72 bars (~156-216 beats)
    }
  } else {
    // 4/4 Meter
    if (difficulty === "Beginner") {
      totalBars = 16 + (hash % 5) * 2; // 16 to 24 bars (~64-96 beats)
    } else if (difficulty === "Intermediate") {
      totalBars = 30 + (hash % 7) * 2; // 30 to 42 bars (~120-168 beats)
    } else {
      // Master
      totalBars = 46 + (hash % 11) * 2; // 46 to 66 bars (~184-264 beats)
    }
  }

  const effectivePattern = input.pattern ?? matchedTheme?.pattern;
  const accompStyle = resolveAccompanimentStyle(
    effectivePattern,
    isWaltz,
    input.genre,
    difficulty,
    hash
  );

  // Resolve chord progression across sections
  let sectionProgression: {
    intro: number[];
    verse: number[];
    chorus: number[];
    bridge: number[];
    outro: number[];
  };

  if (input.chordRoots && input.chordRoots.length > 0) {
    sectionProgression = {
      intro: input.chordRoots,
      verse: input.chordRoots,
      chorus: input.chordRoots,
      bridge: input.chordRoots,
      outro: input.chordRoots,
    };
  } else if (matchedTheme) {
    sectionProgression = {
      intro: matchedTheme.chordRoots,
      verse: matchedTheme.chordRoots,
      chorus: matchedTheme.chordRoots,
      bridge: matchedTheme.chordRoots,
      outro: matchedTheme.chordRoots,
    };
  } else {
    // Diverse genre-tailored musical grammar
    const genreTable = GENRE_PROGRESSIONS[input.genre] ?? GENRE_PROGRESSIONS["Classical"];
    const palette =
      scaleType === "minor" || scaleType === "dorian" ? genreTable.minor : genreTable.major;
    const progIdx = Math.abs((hash >>> 3) ^ (hash & 0x7)) % palette.length;
    const primaryProg = palette[progIdx]?.roots ?? [0, 5, 7, 0];
    const contrastProg = palette[(progIdx + 1) % palette.length]?.roots ?? [5, 7, 0, 0];
    const bridgeProg = palette[(progIdx + 2) % palette.length]?.roots ?? [0, 7, 5, 0];

    sectionProgression = {
      intro: primaryProg.slice(0, 4),
      verse: primaryProg,
      chorus: contrastProg,
      bridge: bridgeProg,
      outro: [primaryProg[primaryProg.length - 1] ?? 0, 0, 0, 0],
    };
  }

  // Resolve melody contour
  let defaultMelody: number[];

  if (input.melodyContour && input.melodyContour.length > 0) {
    defaultMelody = input.melodyContour;
  } else if (matchedTheme) {
    defaultMelody = matchedTheme.melodyContour;
  } else {
    // Generate genre-tailored procedural melody tailored to the chords & scale
    defaultMelody = generateProceduralMelody(
      hash,
      input.genre,
      scaleType,
      beatsPerBar,
      totalBars,
      sectionProgression.verse
    );
  }

  const notes: Note[] = [];
  let noteId = 1;

  // Section division points
  const introBars = Math.max(2, Math.min(4, Math.floor(totalBars * 0.12)));
  const outroBars = Math.max(2, Math.min(4, Math.floor(totalBars * 0.12)));
  const middleBars = totalBars - introBars - outroBars;
  const verseBars = Math.floor(middleBars * 0.45);
  const chorusBars = Math.floor(middleBars * 0.35);

  const introEnd = introBars;
  const verseEnd = introEnd + verseBars;
  const chorusEnd = verseEnd + chorusBars;
  const bridgeEnd = totalBars - outroBars;

  for (let bar = 0; bar < totalBars; bar++) {
    const barStart = bar * beatsPerBar * beatSec;

    // Determine musical section
    let section: "intro" | "verse" | "chorus" | "bridge" | "outro";
    let sectionBar: number;
    if (bar < introEnd) {
      section = "intro";
      sectionBar = bar;
    } else if (bar < verseEnd) {
      section = "verse";
      sectionBar = bar - introEnd;
    } else if (bar < chorusEnd) {
      section = "chorus";
      sectionBar = bar - verseEnd;
    } else if (bar < bridgeEnd) {
      section = "bridge";
      sectionBar = bar - chorusEnd;
    } else {
      section = "outro";
      sectionBar = bar - bridgeEnd;
    }

    // Chord progression root offset
    const prog = sectionProgression[section];
    const chordOffset = prog[sectionBar % prog.length] ?? 0;

    const currentRoot = root + chordOffset;
    const bassPitch = currentRoot - 24;
    const registerShift = section === "chorus" ? 12 : 0;

    // Velocity levels according to section dynamics
    const dynamics = {
      intro: { lh: 64, rh: 68 },
      verse: { lh: 76, rh: 80 },
      chorus: { lh: 88, rh: 92 },
      bridge: { lh: 76, rh: 82 },
      outro: { lh: 68, rh: 72 },
    }[section];

    // ── FINAL BAR: Grand Cadence ──
    // Guarantees N_very_easy < N_easy < N_original via multi-voice tonic resolution
    if (bar === totalBars - 1) {
      const finalChordDur = Number((beatSec * (isWaltz ? 2.85 : 3.85)).toFixed(3));
      // LH Grand Cadence: 3 notes (root, 5th, octave)
      notes.push(
        {
          id: noteId++,
          pitch: root - 24,
          name: pitchToName(root - 24),
          velocity: 75,
          start: Number(barStart.toFixed(3)),
          end: Number((barStart + finalChordDur).toFixed(3)),
          duration: finalChordDur,
          track: 0,
          hand: "L",
        },
        {
          id: noteId++,
          pitch: root - 17,
          name: pitchToName(root - 17),
          velocity: 70,
          start: Number(barStart.toFixed(3)),
          end: Number((barStart + finalChordDur).toFixed(3)),
          duration: finalChordDur,
          track: 0,
          hand: "L",
        },
        {
          id: noteId++,
          pitch: root - 12,
          name: pitchToName(root - 12),
          velocity: 72,
          start: Number(barStart.toFixed(3)),
          end: Number((barStart + finalChordDur).toFixed(3)),
          duration: finalChordDur,
          track: 0,
          hand: "L",
        }
      );

      // RH Grand Cadence: 4 notes (tonic, 3rd, 5th, octave)
      notes.push(
        {
          id: noteId++,
          pitch: root,
          name: pitchToName(root),
          velocity: 70,
          start: Number(barStart.toFixed(3)),
          end: Number((barStart + finalChordDur).toFixed(3)),
          duration: finalChordDur,
          track: 1,
          hand: "R",
        },
        {
          id: noteId++,
          pitch: root + thirdInterval,
          name: pitchToName(root + thirdInterval),
          velocity: 72,
          start: Number(barStart.toFixed(3)),
          end: Number((barStart + finalChordDur).toFixed(3)),
          duration: finalChordDur,
          track: 1,
          hand: "R",
        },
        {
          id: noteId++,
          pitch: root + fifthInterval,
          name: pitchToName(root + fifthInterval),
          velocity: 74,
          start: Number(barStart.toFixed(3)),
          end: Number((barStart + finalChordDur).toFixed(3)),
          duration: finalChordDur,
          track: 1,
          hand: "R",
        },
        {
          id: noteId++,
          pitch: root + 12,
          name: pitchToName(root + 12),
          velocity: 78,
          start: Number(barStart.toFixed(3)),
          end: Number((barStart + finalChordDur).toFixed(3)),
          duration: finalChordDur,
          track: 1,
          hand: "R",
        }
      );
      continue;
    }

    // ─────────────────────────────────────────────────────────────
    // LEFT HAND ACCOMPANIMENT GENERATION
    // ─────────────────────────────────────────────────────────────
    if (accompStyle === "waltz") {
      // ── WALTZ LILTS (3/4 or 3/8) ──
      // Beat 0: Deep bass root
      notes.push({
        id: noteId++,
        pitch: bassPitch,
        name: pitchToName(bassPitch),
        velocity: dynamics.lh,
        start: Number(barStart.toFixed(3)),
        end: Number((barStart + beatSec * 2.8).toFixed(3)),
        duration: Number((beatSec * 2.8).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // Beat 1: Mid-register harmony chord (3rd + 5th)
      const chordPitch1 = currentRoot - 12 + thirdInterval;
      const chordPitch2 = currentRoot - 12 + fifthInterval;
      notes.push(
        {
          id: noteId++,
          pitch: chordPitch1,
          name: pitchToName(chordPitch1),
          velocity: dynamics.lh - 8,
          start: Number((barStart + beatSec).toFixed(3)),
          end: Number((barStart + beatSec * 1.85).toFixed(3)),
          duration: Number((beatSec * 0.85).toFixed(3)),
          track: 0,
          hand: "L",
        },
        {
          id: noteId++,
          pitch: chordPitch2,
          name: pitchToName(chordPitch2),
          velocity: dynamics.lh - 8,
          start: Number((barStart + beatSec).toFixed(3)),
          end: Number((barStart + beatSec * 1.85).toFixed(3)),
          duration: Number((beatSec * 0.85).toFixed(3)),
          track: 0,
          hand: "L",
        }
      );

      // Beat 2: Mid-register harmony chord
      notes.push(
        {
          id: noteId++,
          pitch: chordPitch1,
          name: pitchToName(chordPitch1),
          velocity: dynamics.lh - 10,
          start: Number((barStart + beatSec * 2).toFixed(3)),
          end: Number((barStart + beatSec * 2.85).toFixed(3)),
          duration: Number((beatSec * 0.85).toFixed(3)),
          track: 0,
          hand: "L",
        },
        {
          id: noteId++,
          pitch: chordPitch2,
          name: pitchToName(chordPitch2),
          velocity: dynamics.lh - 10,
          start: Number((barStart + beatSec * 2).toFixed(3)),
          end: Number((barStart + beatSec * 2.85).toFixed(3)),
          duration: Number((beatSec * 0.85).toFixed(3)),
          track: 0,
          hand: "L",
        }
      );

      // In Master waltz bridge/chorus: add chromatic passing bass note on beat 2.5
      if (difficulty === "Master" && (section === "chorus" || section === "bridge")) {
        const passingPitch = bassPitch + (bar % 2 === 0 ? 2 : -1);
        notes.push({
          id: noteId++,
          pitch: passingPitch,
          name: pitchToName(passingPitch),
          velocity: dynamics.lh - 6,
          start: Number((barStart + beatSec * 2.5).toFixed(3)),
          end: Number((barStart + beatSec * 2.95).toFixed(3)),
          duration: Number((beatSec * 0.45).toFixed(3)),
          track: 0,
          hand: "L",
        });
      }
    } else if (accompStyle === "alberti") {
      // ── ALBERTI BASS (Classical low-high-middle-high figure) ──
      const rootP = bassPitch;
      const fifthP = currentRoot - 17;
      const thirdP = currentRoot - 24 + thirdInterval;

      if (difficulty === "Beginner") {
        // 4 Quarter notes in 4/4
        const albertiPitches = [rootP, fifthP, thirdP, fifthP];
        for (let b = 0; b < 4; b++) {
          notes.push({
            id: noteId++,
            pitch: albertiPitches[b],
            name: pitchToName(albertiPitches[b]),
            velocity: dynamics.lh - (b % 2 === 0 ? 0 : 8),
            start: Number((barStart + beatSec * b).toFixed(3)),
            end: Number((barStart + beatSec * (b + 0.9)).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 0,
            hand: "L",
          });
        }
      } else {
        // Intermediate & Master: 8 Eighth-note Alberti pattern
        const pattern = [rootP, fifthP, thirdP, fifthP, rootP, fifthP, thirdP, fifthP];
        for (let step = 0; step < 8; step++) {
          const t = barStart + beatSec * (step * 0.5);
          const p = step === 4 && difficulty === "Master" ? rootP + 12 : pattern[step];
          notes.push({
            id: noteId++,
            pitch: p,
            name: pitchToName(p),
            velocity: dynamics.lh - (step % 2 === 0 ? 4 : 10),
            start: Number(t.toFixed(3)),
            end: Number((t + beatSec * 0.45).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 0,
            hand: "L",
          });
        }
      }
    } else if (accompStyle === "walking_bass") {
      // ── JAZZ WALKING BASS (Quarter-note walk with chromatic approaches) ──
      const rootP = bassPitch;
      const thirdP = currentRoot - 24 + thirdInterval;
      const fifthP = currentRoot - 17;
      const approachP = bar % 2 === 0 ? currentRoot - 13 : currentRoot - 25;

      const walkPitches = [rootP, thirdP, fifthP, approachP];
      for (let b = 0; b < 4; b++) {
        notes.push({
          id: noteId++,
          pitch: walkPitches[b],
          name: pitchToName(walkPitches[b]),
          velocity: dynamics.lh - (b === 0 ? 0 : 6),
          start: Number((barStart + beatSec * b).toFixed(3)),
          end: Number((barStart + beatSec * (b + 0.9)).toFixed(3)),
          duration: Number((beatSec * 0.9).toFixed(3)),
          track: 0,
          hand: "L",
        });
      }

      // Add syncopated jazz guide tone comp chord in LH on beat 1.5 or 2.5
      if (difficulty !== "Beginner" && (bar % 2 === 0 || section === "chorus")) {
        const guide3 = currentRoot - 12 + thirdInterval;
        const guide7 = currentRoot - 12 + (scaleType === "minor" ? 10 : 11);
        notes.push(
          {
            id: noteId++,
            pitch: guide3,
            name: pitchToName(guide3),
            velocity: dynamics.lh - 12,
            start: Number((barStart + beatSec * 1.5).toFixed(3)),
            end: Number((barStart + beatSec * 2.1).toFixed(3)),
            duration: Number((beatSec * 0.6).toFixed(3)),
            track: 0,
            hand: "L",
          },
          {
            id: noteId++,
            pitch: guide7,
            name: pitchToName(guide7),
            velocity: dynamics.lh - 12,
            start: Number((barStart + beatSec * 1.5).toFixed(3)),
            end: Number((barStart + beatSec * 2.1).toFixed(3)),
            duration: Number((beatSec * 0.6).toFixed(3)),
            track: 0,
            hand: "L",
          }
        );
      }
    } else if (accompStyle === "pop_groove") {
      // ── POP GROOVE (Punchy syncopated bass + mid octave bump) ──
      // Beat 0: Deep root
      notes.push({
        id: noteId++,
        pitch: bassPitch,
        name: pitchToName(bassPitch),
        velocity: dynamics.lh,
        start: Number(barStart.toFixed(3)),
        end: Number((barStart + beatSec * 1.4).toFixed(3)),
        duration: Number((beatSec * 1.4).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // Beat 1.5: 8th-note bounce
      notes.push({
        id: noteId++,
        pitch: currentRoot - 12,
        name: pitchToName(currentRoot - 12),
        velocity: dynamics.lh - 6,
        start: Number((barStart + beatSec * 1.5).toFixed(3)),
        end: Number((barStart + beatSec * 1.95).toFixed(3)),
        duration: Number((beatSec * 0.45).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // Beat 2: Fifth
      notes.push({
        id: noteId++,
        pitch: currentRoot - 17,
        name: pitchToName(currentRoot - 17),
        velocity: dynamics.lh - 4,
        start: Number((barStart + beatSec * 2).toFixed(3)),
        end: Number((barStart + beatSec * 2.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // Beat 2.5: Mid harmonic accent
      if (difficulty !== "Beginner") {
        notes.push({
          id: noteId++,
          pitch: currentRoot - 12 + thirdInterval,
          name: pitchToName(currentRoot - 12 + thirdInterval),
          velocity: dynamics.lh - 8,
          start: Number((barStart + beatSec * 2.5).toFixed(3)),
          end: Number((barStart + beatSec * 2.95).toFixed(3)),
          duration: Number((beatSec * 0.45).toFixed(3)),
          track: 0,
          hand: "L",
        });
      }

      // Beat 3.5: Anticipatory root
      notes.push({
        id: noteId++,
        pitch: bassPitch,
        name: pitchToName(bassPitch),
        velocity: dynamics.lh - 6,
        start: Number((barStart + beatSec * 3.5).toFixed(3)),
        end: Number((barStart + beatSec * 3.95).toFixed(3)),
        duration: Number((beatSec * 0.45).toFixed(3)),
        track: 0,
        hand: "L",
      });
    } else if (accompStyle === "anime_run") {
      // ── ANIME RUN (Dramatic bass octaves + sweeping upward motion) ──
      // Beat 0: Bass Octave
      notes.push(
        {
          id: noteId++,
          pitch: bassPitch,
          name: pitchToName(bassPitch),
          velocity: dynamics.lh + 4,
          start: Number(barStart.toFixed(3)),
          end: Number((barStart + beatSec * 1.8).toFixed(3)),
          duration: Number((beatSec * 1.8).toFixed(3)),
          track: 0,
          hand: "L",
        },
        {
          id: noteId++,
          pitch: currentRoot - 12,
          name: pitchToName(currentRoot - 12),
          velocity: dynamics.lh - 4,
          start: Number(barStart.toFixed(3)),
          end: Number((barStart + beatSec * 1.8).toFixed(3)),
          duration: Number((beatSec * 1.8).toFixed(3)),
          track: 0,
          hand: "L",
        }
      );

      // Beat 1: Fifth
      notes.push({
        id: noteId++,
        pitch: currentRoot - 17,
        name: pitchToName(currentRoot - 17),
        velocity: dynamics.lh - 2,
        start: Number((barStart + beatSec).toFixed(3)),
        end: Number((barStart + beatSec * 1.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // Beat 2: Octave
      notes.push({
        id: noteId++,
        pitch: currentRoot - 12,
        name: pitchToName(currentRoot - 12),
        velocity: dynamics.lh,
        start: Number((barStart + beatSec * 2).toFixed(3)),
        end: Number((barStart + beatSec * 2.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // Beat 3: Ascending run leading to next bar
      if (difficulty === "Master") {
        const runPitches = [
          currentRoot - 12 + thirdInterval,
          currentRoot - 5,
          currentRoot,
          currentRoot + thirdInterval,
        ];
        for (let r = 0; r < 4; r++) {
          notes.push({
            id: noteId++,
            pitch: runPitches[r],
            name: pitchToName(runPitches[r]),
            velocity: dynamics.lh - 4 + r * 2,
            start: Number((barStart + beatSec * (3 + r * 0.25)).toFixed(3)),
            end: Number((barStart + beatSec * (3 + (r + 1) * 0.25 - 0.05)).toFixed(3)),
            duration: Number((beatSec * 0.2).toFixed(3)),
            track: 0,
            hand: "L",
          });
        }
      } else {
        notes.push({
          id: noteId++,
          pitch: currentRoot - 12 + thirdInterval,
          name: pitchToName(currentRoot - 12 + thirdInterval),
          velocity: dynamics.lh - 4,
          start: Number((barStart + beatSec * 3).toFixed(3)),
          end: Number((barStart + beatSec * 3.9).toFixed(3)),
          duration: Number((beatSec * 0.9).toFixed(3)),
          track: 0,
          hand: "L",
        });
      }
    } else {
      // ── BALLAD ARPEGGIO (Default flowing broken chords) ──
      if (difficulty === "Beginner") {
        // 4 gentle quarter-note arpeggio steps: Root -> 5th -> Octave -> 10th
        const pitches = [
          bassPitch,
          currentRoot - 17,
          currentRoot - 12,
          currentRoot - 12 + thirdInterval,
        ];
        for (let b = 0; b < 4; b++) {
          notes.push({
            id: noteId++,
            pitch: pitches[b],
            name: pitchToName(pitches[b]),
            velocity: dynamics.lh - (b === 0 ? 0 : 8),
            start: Number((barStart + beatSec * b).toFixed(3)),
            end: Number((barStart + beatSec * (b + 0.9)).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 0,
            hand: "L",
          });
        }
      } else {
        // Intermediate & Master: 8 eighth-note flowing arpeggio
        const pitches = [
          bassPitch,
          currentRoot - 17,
          currentRoot - 12,
          currentRoot - 12 + thirdInterval,
          currentRoot - 5,
          currentRoot - 12 + thirdInterval,
          currentRoot - 12,
          currentRoot - 17,
        ];
        for (let step = 0; step < 8; step++) {
          const t = barStart + beatSec * (step * 0.5);
          notes.push({
            id: noteId++,
            pitch: pitches[step],
            name: pitchToName(pitches[step]),
            velocity: dynamics.lh - (step === 0 ? 0 : 6),
            start: Number(t.toFixed(3)),
            end: Number((t + beatSec * 0.45).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 0,
            hand: "L",
          });
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // RIGHT HAND MELODY, HARMONY & VIRTUOSITY
    // ─────────────────────────────────────────────────────────────
    // Beat 0: 3-note melodic triad chord
    // This strictly ensures NoteCount_very_easy < NoteCount_easy < NoteCount_original
    const melodyStep = isWaltz ? 3 : 4;
    const melodyIdx = (bar * melodyStep + (section === "bridge" ? 2 : 0)) % defaultMelody.length;
    const melPitch = root + registerShift + defaultMelody[melodyIdx];
    const harmPitch1 = melPitch - thirdInterval;
    const harmPitch2 = melPitch - fifthInterval;

    notes.push(
      {
        id: noteId++,
        pitch: harmPitch2,
        name: pitchToName(harmPitch2),
        velocity: dynamics.rh - 8,
        start: Number(barStart.toFixed(3)),
        end: Number((barStart + beatSec * 0.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      },
      {
        id: noteId++,
        pitch: harmPitch1,
        name: pitchToName(harmPitch1),
        velocity: dynamics.rh - 4,
        start: Number(barStart.toFixed(3)),
        end: Number((barStart + beatSec * 0.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      },
      {
        id: noteId++,
        pitch: melPitch,
        name: pitchToName(melPitch),
        velocity: dynamics.rh,
        start: Number(barStart.toFixed(3)),
        end: Number((barStart + beatSec * 0.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      }
    );

    if (isWaltz) {
      // ── WALTZ RH SUBDIVISIONS ──
      // Beat 1: Cantabile singing melody note
      const m1 = root + registerShift + defaultMelody[(melodyIdx + 1) % defaultMelody.length];
      notes.push({
        id: noteId++,
        pitch: m1,
        name: pitchToName(m1),
        velocity: dynamics.rh - 2,
        start: Number((barStart + beatSec).toFixed(3)),
        end: Number((barStart + beatSec * 1.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      });

      // Beat 2:
      if (difficulty === "Beginner") {
        // Quarter note
        const m2 = root + registerShift + defaultMelody[(melodyIdx + 2) % defaultMelody.length];
        notes.push({
          id: noteId++,
          pitch: m2,
          name: pitchToName(m2),
          velocity: dynamics.rh - 4,
          start: Number((barStart + beatSec * 2).toFixed(3)),
          end: Number((barStart + beatSec * 2.9).toFixed(3)),
          duration: Number((beatSec * 0.9).toFixed(3)),
          track: 1,
          hand: "R",
        });
      } else {
        // Intermediate & Master: Two 8th notes
        const m2a = root + registerShift + defaultMelody[(melodyIdx + 2) % defaultMelody.length];
        const m2b = root + registerShift + defaultMelody[(melodyIdx + 3) % defaultMelody.length];
        notes.push(
          {
            id: noteId++,
            pitch: m2a,
            name: pitchToName(m2a),
            velocity: dynamics.rh - 4,
            start: Number((barStart + beatSec * 2).toFixed(3)),
            end: Number((barStart + beatSec * 2.45).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 1,
            hand: "R",
          },
          {
            id: noteId++,
            pitch: m2b,
            name: pitchToName(m2b),
            velocity: dynamics.rh - 2,
            start: Number((barStart + beatSec * 2.5).toFixed(3)),
            end: Number((barStart + beatSec * 2.95).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 1,
            hand: "R",
          }
        );
      }
    } else {
      // ── 4/4 METER RH SUBDIVISIONS ──
      if (difficulty === "Beginner") {
        // Beginner texture: cantabile quarter notes
        const m1 = root + registerShift + defaultMelody[(melodyIdx + 1) % defaultMelody.length];
        const m2 = root + registerShift + defaultMelody[(melodyIdx + 2) % defaultMelody.length];
        const m3 = root + registerShift + defaultMelody[(melodyIdx + 3) % defaultMelody.length];

        notes.push(
          {
            id: noteId++,
            pitch: m1,
            name: pitchToName(m1),
            velocity: dynamics.rh - 2,
            start: Number((barStart + beatSec).toFixed(3)),
            end: Number((barStart + beatSec * 1.9).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 1,
            hand: "R",
          },
          {
            id: noteId++,
            pitch: m2,
            name: pitchToName(m2),
            velocity: dynamics.rh - 4,
            start: Number((barStart + beatSec * 2).toFixed(3)),
            end: Number((barStart + beatSec * 2.9).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 1,
            hand: "R",
          },
          {
            id: noteId++,
            pitch: m3,
            name: pitchToName(m3),
            velocity: dynamics.rh - 2,
            start: Number((barStart + beatSec * 3).toFixed(3)),
            end: Number((barStart + beatSec * 3.9).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 1,
            hand: "R",
          }
        );
      } else if (difficulty === "Intermediate") {
        // Intermediate texture: 8th notes and 2-note harmonic intervals
        const m1a = root + registerShift + defaultMelody[(melodyIdx + 1) % defaultMelody.length];
        const m1b = root + registerShift + defaultMelody[(melodyIdx + 2) % defaultMelody.length];
        const m2 = root + registerShift + defaultMelody[(melodyIdx + 3) % defaultMelody.length];
        const h2 = m2 - 5;
        const m3a = root + registerShift + defaultMelody[(melodyIdx + 4) % defaultMelody.length];
        const m3b = root + registerShift + defaultMelody[(melodyIdx + 5) % defaultMelody.length];

        notes.push(
          // Beat 1: Two 8th notes
          {
            id: noteId++,
            pitch: m1a,
            name: pitchToName(m1a),
            velocity: dynamics.rh - 2,
            start: Number((barStart + beatSec).toFixed(3)),
            end: Number((barStart + beatSec * 1.45).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 1,
            hand: "R",
          },
          {
            id: noteId++,
            pitch: m1b,
            name: pitchToName(m1b),
            velocity: dynamics.rh,
            start: Number((barStart + beatSec * 1.5).toFixed(3)),
            end: Number((barStart + beatSec * 1.95).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 1,
            hand: "R",
          },
          // Beat 2: Harmonic interval
          {
            id: noteId++,
            pitch: h2,
            name: pitchToName(h2),
            velocity: dynamics.rh - 8,
            start: Number((barStart + beatSec * 2).toFixed(3)),
            end: Number((barStart + beatSec * 2.9).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 1,
            hand: "R",
          },
          {
            id: noteId++,
            pitch: m2,
            name: pitchToName(m2),
            velocity: dynamics.rh,
            start: Number((barStart + beatSec * 2).toFixed(3)),
            end: Number((barStart + beatSec * 2.9).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 1,
            hand: "R",
          },
          // Beat 3: Two 8th notes
          {
            id: noteId++,
            pitch: m3a,
            name: pitchToName(m3a),
            velocity: dynamics.rh - 4,
            start: Number((barStart + beatSec * 3).toFixed(3)),
            end: Number((barStart + beatSec * 3.45).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 1,
            hand: "R",
          },
          {
            id: noteId++,
            pitch: m3b,
            name: pitchToName(m3b),
            velocity: dynamics.rh - 2,
            start: Number((barStart + beatSec * 3.5).toFixed(3)),
            end: Number((barStart + beatSec * 3.95).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 1,
            hand: "R",
          }
        );
      } else {
        // Master texture: High virtuosic density, 16th-note anime/classical runs on Beat 1 or Beat 3
        const m1 = root + registerShift + defaultMelody[(melodyIdx + 1) % defaultMelody.length];
        const m2 = root + registerShift + defaultMelody[(melodyIdx + 2) % defaultMelody.length];
        const h2 = m2 - 5;

        // Beat 1: 16th-note flourish
        const flourish = [m1, m1 + 2, m1 + 4, m1 + 2];
        for (let f = 0; f < 4; f++) {
          notes.push({
            id: noteId++,
            pitch: flourish[f],
            name: pitchToName(flourish[f]),
            velocity: dynamics.rh - 4 + f,
            start: Number((barStart + beatSec * (1 + f * 0.25)).toFixed(3)),
            end: Number((barStart + beatSec * (1 + (f + 1) * 0.25 - 0.05)).toFixed(3)),
            duration: Number((beatSec * 0.2).toFixed(3)),
            track: 1,
            hand: "R",
          });
        }

        // Beat 2: Harmonic interval with melody octave
        notes.push(
          {
            id: noteId++,
            pitch: h2,
            name: pitchToName(h2),
            velocity: dynamics.rh - 6,
            start: Number((barStart + beatSec * 2).toFixed(3)),
            end: Number((barStart + beatSec * 2.9).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 1,
            hand: "R",
          },
          {
            id: noteId++,
            pitch: m2,
            name: pitchToName(m2),
            velocity: dynamics.rh + 2,
            start: Number((barStart + beatSec * 2).toFixed(3)),
            end: Number((barStart + beatSec * 2.9).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 1,
            hand: "R",
          }
        );

        // Beat 3: Four 16th notes rushing into next bar
        const rush = [
          m2,
          m2 + (scaleType === "minor" ? 3 : 4),
          m2 + 7,
          m2 + 12,
        ];
        for (let r = 0; r < 4; r++) {
          notes.push({
            id: noteId++,
            pitch: rush[r],
            name: pitchToName(rush[r]),
            velocity: dynamics.rh - 4 + r * 2,
            start: Number((barStart + beatSec * (3 + r * 0.25)).toFixed(3)),
            end: Number((barStart + beatSec * (3 + (r + 1) * 0.25 - 0.05)).toFixed(3)),
            duration: Number((beatSec * 0.2).toFixed(3)),
            track: 1,
            hand: "R",
          });
        }
      }
    }
  }

  // Chronological sort and ID renumbering
  notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
  notes.forEach((n, idx) => {
    n.id = idx + 1;
  });

  const lhCount = notes.filter((n) => n.hand === "L").length;
  const rhCount = notes.filter((n) => n.hand === "R").length;
  const maxEnd = notes.reduce((max, n) => Math.max(max, n.end), 0);
  const durationSec = Number(maxEnd.toFixed(1));

  const noteData: NoteData = {
    schema_version: 1,
    bpm,
    duration_sec: durationSec,
    time_signature: timeSig,
    tracks: [
      { index: 0, name: "Left Hand (Bass & Arpeggios)", note_count: lhCount },
      { index: 1, name: "Right Hand (Melody & Harmony)", note_count: rhCount },
    ],
    notes,
  };

  return {
    id: input.id,
    title: input.title,
    composer: input.composer,
    period: input.period,
    genre: input.genre,
    difficulty: input.difficulty,
    bpm,
    time_signature: timeSig,
    key: input.key,
    duration_sec: durationSec,
    description: input.description,
    coverGradient: input.coverGradient,
    noteCount: notes.length,
    tags: input.tags,
    noteData,
  };
}
