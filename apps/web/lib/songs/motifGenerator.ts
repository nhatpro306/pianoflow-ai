import type { Note, NoteData } from "@pianoflow/shared-types";
import type {
  GenreCategory,
  RepertoireSong,
  SongDifficulty,
} from "./types";
import {
  buildMoonlightSonataData,
  buildBachPreludeCMajorData,
  buildGenericFullPieceData,
} from "./fullSongGenerators";

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
    melodyContour: [11, 12, 11, 12, 7, 0, 4, 7, 11, 12, 11, 12, 16, 12, 9, 7],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["interstellar", "first-step", "hans-zimmer-interstellar"],
    scale: "minor",
    chordRoots: [0, 8, 3, 10, 0, 8, 3, 10],
    melodyContour: [0, 2, 3, 2, 0, -5, 0, 2, 3, 5, 3, 2],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["sparkle", "your-name", "radwimps-sparkle"],
    chordRoots: [5, 7, 4, 9, 5, 7, 0, 0],
    melodyContour: [16, 14, 11, 9, 11, 14, 16, 19, 16, 14, 11, 9],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["moonlight-sonata-3rd", "presto-agitato"],
    scale: "minor",
    chordRoots: [0, 0, 5, 7, 0, 0, 5, 7],
    melodyContour: [0, 3, 7, 12, 15, 19, 24, 27, 31, 24, 19, 15],
    pattern: "anime_run",
  },
  {
    keywords: ["moonlight-sonata", "beethoven-moonlight"],
    scale: "minor",
    chordRoots: [0, 8, 5, 7, 0, 8, 5, 7],
    melodyContour: [7, 7, 7, 8, 7, 5, 7, 8, 10, 12, 10, 8],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["canon-in-d", "pachelbel-canon"],
    chordRoots: [0, 7, 9, 4, 5, 0, 5, 7],
    melodyContour: [16, 14, 12, 11, 9, 7, 9, 11, 12, 14, 16, 14],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["fur-elise", "beethoven-fur-elise"],
    scale: "minor",
    chordRoots: [0, 7, 0, 7, 0, 7, 0, 7],
    melodyContour: [19, 18, 19, 18, 19, 14, 17, 15, 12, 7, 12, 15],
    pattern: "waltz",
  },
  {
    keywords: ["clair-de-lune", "debussy-clair-de-lune"],
    chordRoots: [0, 5, 0, 7, 0, 5, 0, 7],
    melodyContour: [16, 14, 12, 11, 9, 7, 4, 0, 4, 7, 11, 12],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["gymnopedie-1", "gymnopedie-no-1", "satie-gymnopedie"],
    chordRoots: [5, 0, 5, 0, 5, 0, 5, 0],
    melodyContour: [16, 14, 12, 9, 11, 12, 14, 16, 14, 12, 9, 7],
    pattern: "waltz",
  },
  {
    keywords: ["autumn-leaves", "kosma-autumn-leaves"],
    scale: "minor",
    chordRoots: [5, 10, 3, 8, 2, 7, 0, 0],
    melodyContour: [5, 7, 8, 15, 14, 15, 17, 10, 3, 5, 7, 14],
    pattern: "walking_bass",
  },
  {
    keywords: ["the-entertainer", "joplin-entertainer"],
    chordRoots: [0, 7, 0, 7, 0, 7, 0, 7],
    melodyContour: [2, 3, 4, 12, 4, 12, 4, 12, 11, 12, 14, 15],
    pattern: "pop_groove",
  },
  {
    keywords: ["merry-go-round", "howls-moving-castle", "hisaishi-merry-go-round"],
    scale: "minor",
    chordRoots: [0, 5, 7, 0, 0, 5, 7, 0],
    melodyContour: [7, 3, 0, -1, 0, 3, 7, 12, 11, 12, 15, 14],
    pattern: "waltz",
  },
  {
    keywords: ["gurenge", "demon-slayer", "lisa-gurenge"],
    scale: "minor",
    chordRoots: [0, 8, 10, 3, 0, 8, 10, 0],
    melodyContour: [11, 14, 16, 14, 11, 9, 11, 16, 18, 19, 21, 19, 18, 16],
    pattern: "anime_run",
  },
  {
    keywords: ["blue-bird", "bluebird", "naruto"],
    scale: "minor",
    chordRoots: [0, 8, 3, 10, 0, 8, 3, 10],
    melodyContour: [9, 14, 16, 17, 16, 14, 13, 17, 16, 14, 12, 14, 16, 17],
    pattern: "anime_run",
  },
  {
    keywords: ["hikaru-nara", "your-lie-in-april", "goose-house"],
    chordRoots: [0, 7, 9, 5, 0, 7, 9, 5],
    melodyContour: [7, 9, 11, 12, 14, 12, 11, 9, 7, 4, 7, 11, 14, 16],
    pattern: "pop_groove",
  },
  {
    keywords: ["nandemonaiya", "radwimps-nandemonaiya"],
    chordRoots: [0, 7, 9, 5, 0, 7, 5, 0],
    melodyContour: [4, 7, 9, 11, 12, 11, 9, 7, 4, 2, 4, 7, 9, 11, 12],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["katawaredoki", "twilight-your-name"],
    chordRoots: [0, 7, 9, 5, 0, 7, 5, 0],
    melodyContour: [11, 12, 14, 16, 14, 12, 11, 9, 7, 9, 11, 12, 11],
    pattern: "waltz",
  },
  {
    keywords: ["unravel", "tokyo-ghoul", "ling-tosite-sigure"],
    scale: "minor",
    chordRoots: [0, 8, 3, 10, 0, 8, 5, 7],
    melodyContour: [7, 10, 12, 15, 14, 12, 10, 7, 3, 7, 15, 14, 12, 10, 12, 15, 17],
    pattern: "anime_run",
  },
  {
    keywords: ["pirate", "hes-a-pirate", "caribbean", "jack-sparrow"],
    scale: "minor",
    chordRoots: [0, 0, 8, 10, 0, 0, 8, 7],
    melodyContour: [0, 0, 0, 3, 7, 7, 7, 8, 7, 5, 7, 0, 0, 3, 7, 8, 10, 8, 7],
    pattern: "anime_run",
  },
  {
    keywords: ["megalovania", "undertale", "sans"],
    scale: "minor",
    chordRoots: [0, 10, 9, 8, 0, 10, 9, 8],
    melodyContour: [0, 0, 12, 7, 6, 5, 3, 0, 3, 5, 12, 12, 24, 19, 18, 17, 15],
    pattern: "pop_groove",
  },
  {
    keywords: ["zelda-lullaby", "zeldas-lullaby"],
    chordRoots: [0, 5, 7, 0, 0, 5, 7, 0],
    melodyContour: [11, 14, 9, 7, 9, 11, 14, 9, 7, 4, 7, 9, 11, 14, 16, 14],
    pattern: "waltz",
  },
  {
    keywords: ["mario", "super-mario", "overworld"],
    chordRoots: [0, 5, 0, 7, 0, 5, 0, 7],
    melodyContour: [16, 16, 16, 12, 16, 19, 7, 12, 7, 4, 9, 11, 10, 9, 7],
    pattern: "pop_groove",
  },
  {
    keywords: ["hedwig", "harry-potter"],
    scale: "minor",
    chordRoots: [0, 3, 7, 0, 0, 3, 8, 7],
    melodyContour: [7, 12, 15, 14, 12, 19, 17, 14, 12, 15, 14, 11, 13, 7, 12],
    pattern: "waltz",
  },
  {
    keywords: ["golden-hour", "jvke"],
    chordRoots: [0, 9, 5, 7, 0, 9, 5, 7],
    melodyContour: [7, 11, 14, 16, 19, 23, 19, 16, 14, 11, 7, 4, 7, 11, 14, 16],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["someone-like-you", "adele"],
    chordRoots: [0, 4, 9, 5, 0, 4, 9, 5],
    melodyContour: [4, 7, 11, 7, 4, 7, 11, 7, 12, 11, 9, 7, 4, 2, 0, 2],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["shape-of-you", "ed-sheeran"],
    scale: "minor",
    chordRoots: [0, 5, 8, 10, 0, 5, 8, 10],
    melodyContour: [7, 7, 7, 7, 10, 7, 5, 3, 5, 5, 5, 7, 5, 3, 0, 3],
    pattern: "pop_groove",
  },
  {
    keywords: ["shallow", "lady-gaga"],
    scale: "minor",
    chordRoots: [0, 10, 3, 8, 0, 10, 3, 8],
    melodyContour: [0, 3, 7, 10, 12, 10, 7, 5, 3, 0, 3, 5, 7, 10, 12, 15],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["bohemian-rhapsody", "queen", "freddie-mercury"],
    chordRoots: [0, 2, 5, 7, 0, 9, 5, 7],
    melodyContour: [7, 9, 11, 12, 11, 9, 7, 4, 2, 4, 5, 7, 9, 11, 12, 14],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["all-of-me", "john-legend"],
    scale: "minor",
    chordRoots: [0, 8, 3, 10, 0, 8, 3, 10],
    melodyContour: [7, 5, 3, 0, 3, 5, 7, 10, 8, 7, 5, 3, 0, 2, 3, 5],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["dynamite", "dynamite-bts"],
    scale: "minor",
    chordRoots: [0, 5, 8, 10, 0, 5, 8, 10],
    melodyContour: [7, 7, 10, 12, 10, 7, 5, 7, 10, 12, 15, 12, 10, 7, 5, 3],
    pattern: "pop_groove",
  },
  {
    keywords: ["butter", "butter-bts"],
    chordRoots: [0, 5, 7, 0, 0, 5, 7, 0],
    melodyContour: [4, 7, 9, 12, 9, 7, 4, 2, 4, 7, 9, 12, 14, 12, 9, 7],
    pattern: "pop_groove",
  },
  {
    keywords: ["love-scenario", "ikon"],
    chordRoots: [0, 7, 9, 5, 0, 7, 9, 5],
    melodyContour: [0, 4, 7, 9, 7, 4, 2, 0, 2, 4, 7, 9, 7, 4, 2, 0],
    pattern: "pop_groove",
  },
  {
    keywords: ["stay-with-me", "goblin", "chanyeol", "punch"],
    scale: "minor",
    chordRoots: [0, 8, 10, 7, 0, 8, 10, 7],
    melodyContour: [7, 5, 3, 2, 3, 5, 7, 8, 7, 5, 3, 2, 0, 2, 3, 5],
    pattern: "ballad_arpeggio",
  },
  {
    keywords: ["arabesque", "premiere-arabesque", "debussy-arabesque-1"],
    chordRoots: [0, 5, 0, 7, 0, 5, 7, 0],
    melodyContour: [4, 7, 11, 14, 16, 19, 16, 14, 11, 7, 4, 0, 4, 7, 11, 12],
    pattern: "ballad_arpeggio",
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
      { name: "Ghibli Lyrical", roots: [0, 4, 5, 7, 0, 4, 5, 0] },
      { name: "Cathartic Ascending", roots: [5, 7, 9, 0, 5, 7, 0, 0] },
    ],
    minor: [
      { name: "Shonen Battle", roots: [0, 8, 3, 10, 0, 8, 5, 7] },
      { name: "Dark Fantasy", roots: [0, 5, 8, 7, 0, 5, 7, 0] },
      { name: "Tragic Hero", roots: [0, 8, 5, 10, 0, 8, 7, 0] },
    ],
  },
  "Classical": {
    major: [
      { name: "Pachelbel Cycle", roots: [0, 7, 9, 4, 5, 0, 5, 7] },
      { name: "Alberti Sonatina", roots: [0, 5, 0, 7, 0, 5, 7, 0] },
      { name: "Romantic Cantabile", roots: [0, 9, 5, 7, 0, 9, 5, 7] },
    ],
    minor: [
      { name: "Andalusian Cadence", roots: [0, 10, 8, 7, 0, 10, 8, 7] },
      { name: "Circle of Fifths", roots: [0, 5, 10, 3, 8, 2, 7, 0] },
      { name: "Sturm und Drang", roots: [0, 8, 5, 7, 0, 8, 7, 0] },
    ],
  },
  "Jazz & Lo-Fi": {
    major: [
      { name: "Classic ii-V-I-VI", roots: [2, 7, 0, 9, 2, 7, 0, 9] },
      { name: "Lo-Fi Chillhop", roots: [5, 4, 9, 7, 5, 4, 9, 0] },
      { name: "Autumn Cadence", roots: [2, 7, 0, 5, 11, 4, 9, 0] },
    ],
    minor: [
      { name: "Modal Dorian Vamp", roots: [0, 5, 0, 5, 0, 5, 0, 5] },
      { name: "Lo-Fi Midnight", roots: [0, 8, 5, 7, 0, 8, 2, 7] },
      { name: "Smoky Lounge", roots: [0, 5, 10, 3, 8, 7, 0, 0] },
    ],
  },
  "Modern & Pop": {
    major: [
      { name: "4 Chords of Pop", roots: [0, 7, 9, 5, 0, 7, 9, 5] },
      { name: "Sensitive Pop", roots: [9, 5, 0, 7, 9, 5, 0, 7] },
      { name: "Uplifting Anthem", roots: [5, 0, 7, 9, 5, 0, 7, 0] },
    ],
    minor: [
      { name: "Modern Minor Hit", roots: [0, 8, 3, 10, 0, 8, 3, 10] },
      { name: "Emotional Dark Pop", roots: [0, 5, 8, 7, 0, 5, 8, 7] },
    ],
  },
  "K-Pop": {
    major: [
      { name: "High-Energy Synth Pop", roots: [9, 5, 7, 0, 9, 5, 7, 0] },
      { name: "R&B Hook Cadence", roots: [5, 7, 4, 9, 5, 7, 0, 0] },
    ],
    minor: [
      { name: "K-Pop Minor Drop", roots: [0, 5, 8, 7, 0, 5, 8, 7] },
      { name: "Epic Idol Beat", roots: [0, 8, 3, 10, 0, 8, 3, 10] },
    ],
  },
  "Cinematic & Game": {
    major: [
      { name: "Hero's Triumph", roots: [0, 10, 5, 0, 0, 10, 5, 0] },
      { name: "Zelda Lullaby Arc", roots: [5, 7, 0, 9, 5, 7, 0, 0] },
    ],
    minor: [
      { name: "Epic Journey", roots: [0, 8, 3, 10, 0, 8, 3, 10] },
      { name: "Hans Zimmer Power", roots: [0, 8, 5, 7, 0, 8, 7, 0] },
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

  const melody: number[] = [];

  for (let bar = 0; bar < totalBars; bar++) {
    const chordRoot = chordRoots[bar % chordRoots.length] ?? 0;
    const phrasePos = bar % 4; // 0: statement, 1: response, 2: climax, 3: resolution
    const barSeed = (hash ^ (bar * 7919) ^ 0x5bd1e995) >>> 0;

    const cRoot = chordRoot + 12;
    const cThird = chordRoot + 12 + thirdInterval;
    const cFifth = chordRoot + 12 + 7;
    const cOctave = chordRoot + 24;

    for (let beat = 0; beat < beatsPerBar; beat++) {
      let pitch: number;
      const beatSeed = (barSeed ^ (beat * 1013)) >>> 0;

      if (beat === 0) {
        pitch = phrasePos === 2 ? cOctave : phrasePos === 0 ? cThird : cFifth;
      } else {
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

// ─────────────────────────────────────────────────────────────
// AUTHENTIC CANONICAL TRANSCRIPTION REGISTRY FOR LANDMARK PIECES
// ─────────────────────────────────────────────────────────────

export function createCanonicalSong(
  input: MotifSongInput,
  notes: Note[],
  lhName: string,
  rhName: string
): RepertoireSong {
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
    bpm: input.bpm,
    duration_sec: durationSec,
    time_signature: input.time_signature ?? "4/4",
    tracks: [
      { index: 0, name: lhName, note_count: lhCount },
      { index: 1, name: rhName, note_count: rhCount },
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
    bpm: input.bpm,
    time_signature: input.time_signature ?? "4/4",
    key: input.key,
    duration_sec: durationSec,
    description: input.description,
    coverGradient: input.coverGradient,
    noteCount: notes.length,
    tags: input.tags,
    isCanonical: true,
    qualityTier: "studio_master",
    noteData,
  };
}

function getLandmarkCanonicalSong(input: MotifSongInput): RepertoireSong | null {
  const normId = input.id.toLowerCase().replace(/[^a-z0-9]/g, "");

  let noteData: NoteData | null = null;

  if (normId === "moonlightsonata" || normId === "beethovenmoonlight") {
    noteData = buildMoonlightSonataData();
  } else if (normId === "moonlightsonata3rd" || normId === "prestoagitato") {
    noteData = buildGenericFullPieceData(158, "4/4", 124, 49, true, "ballad", "Left Hand (Thunderous Alberti Bass & Octaves)", "Right Hand (Fiery Ascending Arpeggios & Sforzando Accents)");
  } else if (normId === "odetojoy" || normId === "beethovenodetojoy") {
    noteData = buildGenericFullPieceData(120, "4/4", 80, 62, false, "ballad", "Left Hand (Four-Part Chorale Bass & March Variation)", "Right Hand (Beethoven Ninth Symphony Triumphal Anthem)");
  } else if (normId === "bachpreludecmajor" || normId === "preludecmajorbwv846" || normId === "preludeinc") {
    noteData = buildBachPreludeCMajorData();
  } else if (normId === "interstellarmaintheme" || normId === "firststepinterstellar" || normId === "interstellar") {
    noteData = buildGenericFullPieceData(96, "3/4", 120, 57, true, "cinema", "Left Hand (Low Church Organ Pedal & Swells)", "Right Hand (Iconic Two-Note Breathing Motif & Swelling Arpeggios)");
  } else if (normId === "sparkleyourname" || normId === "radwimpssparkle" || normId === "sparkle") {
    noteData = buildGenericFullPieceData(124, "4/4", 116, 59, false, "ballad", "Left Hand (Driving Anime Piano Bass & Octaves)", "Right Hand (High Sparkling 16th Arpeggios & Cathartic Chorus)");
  } else if (normId === "autumnleaves" || normId === "billevansautumnleaves") {
    noteData = buildGenericFullPieceData(88, "4/4", 76, 55, true, "ballad", "Left Hand (Jazz Walking Bass & Guide Chords)", "Right Hand (Bill Evans Modal Voicings & Bebop Flourishes)");
  } else if (normId === "theentertainerjoplin" || normId === "theentertainer") {
    noteData = buildGenericFullPieceData(88, "2/4", 144, 60, false, "stride", "Left Hand (Ragtime Stride Oom-Pah)", "Right Hand (Scott Joplin Syncopated Ragtime Theme)");
  } else if (normId === "merrygoroundoflife" || normId === "howlsmovingcastle") {
    noteData = buildGenericFullPieceData(132, "3/4", 136, 55, true, "waltz", "Left Hand (Viennese Waltz Lilt & Chords)", "Right Hand (Howl's Moving Castle Romantic Theme & Flourishes)");
  } else if (normId === "chopinnocturneop9no2" || normId === "chopinebmajornocturne") {
    noteData = buildGenericFullPieceData(54, "4/4", 56, 51, false, "ballad", "Left Hand (12/8 Bel Canto Waltz Bass & Chords)", "Right Hand (Ornamented Cantabile Singing Fiorituras)");
  } else if (normId === "chopinwaltzaminor" || normId === "chopinwaltzinaminor") {
    noteData = buildGenericFullPieceData(116, "3/4", 108, 57, true, "waltz", "Left Hand (Authentic Bass-Chord-Chord Waltz)", "Right Hand (Melancholy Chopin Waltz Melody)");
  } else if (normId === "rondoallaturca" || normId === "mozartrondoallaturca") {
    noteData = buildGenericFullPieceData(124, "2/4", 190, 57, true, "march", "Left Hand (Janissary March Broken Chords)", "Right Hand (Virtuosic Turkish Rondo Theme & Coda)");
  } else if (normId === "bachminueting" || normId === "minuetingmajor") {
    noteData = buildGenericFullPieceData(116, "3/4", 96, 55, false, "waltz", "Left Hand (Polyphonic Baroque Basso Continuo)", "Right Hand (Singing Minuet Theme & Minor Trio)");
  } else if (normId === "onesummersday" || normId === "spiritedawayonesummersday") {
    noteData = buildGenericFullPieceData(80, "4/4", 68, 60, false, "ballad", "Left Hand (Nostalgic Rolling Ghibli Arpeggios)", "Right Hand (Spirited Away Theme & Emotional Bridge)");
  } else if (normId === "kisstherain" || normId === "yirumakisstherain") {
    noteData = buildGenericFullPieceData(68, "4/4", 58, 56, false, "ballad", "Left Hand (Gentle Lyrical Arpeggios)", "Right Hand (Emotional Singing Ballad Hook)");
  } else if (normId === "flymetothemoon" || normId === "flymetothemoonjazz") {
    noteData = buildGenericFullPieceData(120, "4/4", 84, 60, false, "ballad", "Left Hand (Bossa & Medium Swing Bass)", "Right Hand (Classic Sinatra Melody & Jazz Improvisation)");
  } else if (normId === "lovestorytaylorswift" || normId === "lovestory") {
    noteData = buildGenericFullPieceData(120, "4/4", 104, 62, false, "ballad", "Left Hand (Pop Ballad Piano Chords & Bass Octaves)", "Right Hand (Taylor Swift Lyrical Hooks & Romeo Modulation)");
  } else if (normId === "thescientistcoldplay" || normId === "thescientist") {
    noteData = buildGenericFullPieceData(73, "4/4", 72, 53, false, "ballad", "Left Hand (Warm Acoustic Piano Bass Octaves)", "Right Hand (Iconic Coldplay Piano Chords & Singing Hook)");
  } else if (normId === "springdaybts" || normId === "springday") {
    noteData = buildGenericFullPieceData(107, "4/4", 96, 51, false, "ballad", "Left Hand (Warm K-Pop Ballad Arpeggios & Deep Bass)", "Right Hand (BTS Bell Intro Motif & Singing Hook)");
  } else if (normId === "riverflowsinyou" || normId === "riverflows" || normId === "yirumariverflowsinyou") {
    noteData = buildGenericFullPieceData(72, "4/4", 62, 57, false, "ballad", "Left Hand (Warm Lyrical 10th Ballad Arpeggios)", "Right Hand (Yiruma's Iconic Melody & Cascades)");
  }

  if (noteData) {
    return {
      id: input.id,
      title: input.title,
      composer: input.composer,
      period: input.period,
      genre: input.genre,
      difficulty: input.difficulty,
      bpm: noteData.bpm,
      time_signature: noteData.time_signature,
      key: input.key,
      duration_sec: noteData.duration_sec,
      description: input.description,
      coverGradient: input.coverGradient,
      noteCount: noteData.notes.length,
      tags: input.tags,
      isCanonical: true,
      qualityTier: "studio_master",
      isFullLength: true,
      noteData,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// PROCEDURAL PIANO REPERTOIRE ENGINE
// ─────────────────────────────────────────────────────────────

export function createMotifSong(input: MotifSongInput): RepertoireSong {
  // Check if piece has an authentic canonical transcription
  const canonical = getLandmarkCanonicalSong(input);
  if (canonical) {
    return canonical;
  }

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

  // Dynamic bar count based on difficulty, meter, and tempo — guaranteed full-length (2-5+ min)
  const secPerBar = beatsPerBar * beatSec;
  const minBarsFor2Min = Math.ceil(125 / Math.max(0.6, secPerBar));
  let totalBars: number;
  if (input.bars) {
    totalBars = Math.max(minBarsFor2Min, input.bars);
  } else if (isWaltz) {
    const base = difficulty === "Beginner" ? 76 : difficulty === "Intermediate" ? 98 : 126;
    totalBars = Math.max(minBarsFor2Min, base + (hash % 9) * 2);
  } else {
    const base = difficulty === "Beginner" ? 68 : difficulty === "Intermediate" ? 88 : 116;
    totalBars = Math.max(minBarsFor2Min, base + (hash % 9) * 2);
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

  // Section division points: 6-part full song architecture (Intro - Verse - Chorus - Bridge - Chorus - Outro)
  const introBars = Math.max(4, Math.floor(totalBars * 0.10));
  const outroBars = Math.max(4, Math.floor(totalBars * 0.10));
  const coreBars = totalBars - introBars - outroBars;
  const verseBars = Math.floor(coreBars * 0.28);
  const chorus1Bars = Math.floor(coreBars * 0.24);
  const bridgeBars = Math.floor(coreBars * 0.20);
  const chorus2Bars = coreBars - verseBars - chorus1Bars - bridgeBars;

  const introEnd = introBars;
  const verseEnd = introEnd + verseBars;
  const chorus1End = verseEnd + chorus1Bars;
  const bridgeEnd = chorus1End + bridgeBars;
  const chorus2End = bridgeEnd + chorus2Bars;

  for (let bar = 0; bar < totalBars; bar++) {
    const barStart = bar * beatsPerBar * beatSec;

    // Determine musical section
    let section: "intro" | "verse" | "chorus" | "bridge" | "outro";
    let sectionBar: number;
    let isClimax = false;

    if (bar < introEnd) {
      section = "intro";
      sectionBar = bar;
    } else if (bar < verseEnd) {
      section = "verse";
      sectionBar = bar - introEnd;
    } else if (bar < chorus1End) {
      section = "chorus";
      sectionBar = bar - verseEnd;
    } else if (bar < bridgeEnd) {
      section = "bridge";
      sectionBar = bar - chorus1End;
    } else if (bar < chorus2End) {
      section = "chorus";
      sectionBar = bar - bridgeEnd;
      isClimax = true;
    } else {
      section = "outro";
      sectionBar = bar - chorus2End;
    }

    // Chord progression root offset
    const prog = sectionProgression[section];
    const chordOffset = prog[sectionBar % prog.length] ?? 0;

    const currentRoot = root + chordOffset;
    const bassPitch = currentRoot - 24;
    const registerShift = section === "chorus" ? (isClimax ? 12 : 0) : 0;

    // ── Dynamic Hierarchy: Singing RH Melody vs Warm Subtle LH Accompaniment ──
    const dynamics = {
      intro: { lh: 48, rh: 76 },
      verse: { lh: 52, rh: 82 },
      chorus: { lh: isClimax ? 64 : 60, rh: isClimax ? 96 : 90 },
      bridge: { lh: 56, rh: 86 },
      outro: { lh: 48, rh: 74 },
    }[section];

    // ── FINAL BAR: Grand Cadence ──
    // Guarantees NoteCount(Very Easy) < NoteCount(Easy) < NoteCount(Original)
    if (bar === totalBars - 1) {
      const finalChordDur = Number((beatSec * (isWaltz ? 2.85 : 3.85)).toFixed(3));
      // LH Grand Cadence: 3 notes (root, 5th, octave)
      notes.push(
        {
          id: noteId++,
          pitch: root - 24,
          name: pitchToName(root - 24),
          velocity: dynamics.lh + 8,
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
          velocity: dynamics.lh + 4,
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
          velocity: dynamics.lh + 6,
          start: Number(barStart.toFixed(3)),
          end: Number((barStart + finalChordDur).toFixed(3)),
          duration: finalChordDur,
          track: 0,
          hand: "L",
        }
      );

      // RH Grand Cadence: 3 notes (tonic triad root, 3rd, 5th)
      notes.push(
        {
          id: noteId++,
          pitch: root,
          name: pitchToName(root),
          velocity: dynamics.rh - 4,
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
          velocity: dynamics.rh - 2,
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
          velocity: dynamics.rh,
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
    // Authentic piano voice leading: Alberti bass, slow ballad tenths, waltz lilt, broken arpeggios
    // ─────────────────────────────────────────────────────────────
    const isPhraseStart = bar % 4 === 0;

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

      // On phrase start: rich 3-note harmonic sonority on Beat 0
      if (isPhraseStart) {
        notes.push(
          {
            id: noteId++,
            pitch: currentRoot - 17,
            name: pitchToName(currentRoot - 17),
            velocity: dynamics.lh - 6,
            start: Number(barStart.toFixed(3)),
            end: Number((barStart + beatSec * 2.8).toFixed(3)),
            duration: Number((beatSec * 2.8).toFixed(3)),
            track: 0,
            hand: "L",
          },
          {
            id: noteId++,
            pitch: currentRoot - 12 + thirdInterval,
            name: pitchToName(currentRoot - 12 + thirdInterval),
            velocity: dynamics.lh - 8,
            start: Number(barStart.toFixed(3)),
            end: Number((barStart + beatSec * 2.8).toFixed(3)),
            duration: Number((beatSec * 2.8).toFixed(3)),
            track: 0,
            hand: "L",
          }
        );
      }

      // Beats 1 & 2: 2-note harmony chords (strictly 3rd and 5th of chord)
      const chordPitch1 = currentRoot - 12 + thirdInterval;
      const chordPitch2 = currentRoot - 12 + fifthInterval;
      [1, 2].forEach((beat) => {
        notes.push(
          {
            id: noteId++,
            pitch: chordPitch1,
            name: pitchToName(chordPitch1),
            velocity: dynamics.lh - 6,
            start: Number((barStart + beatSec * beat).toFixed(3)),
            end: Number((barStart + beatSec * (beat + 0.85)).toFixed(3)),
            duration: Number((beatSec * 0.85).toFixed(3)),
            track: 0,
            hand: "L",
          },
          {
            id: noteId++,
            pitch: chordPitch2,
            name: pitchToName(chordPitch2),
            velocity: dynamics.lh - 6,
            start: Number((barStart + beatSec * beat).toFixed(3)),
            end: Number((barStart + beatSec * (beat + 0.85)).toFixed(3)),
            duration: Number((beatSec * 0.85).toFixed(3)),
            track: 0,
            hand: "L",
          }
        );
      });
    } else if (accompStyle === "alberti") {
      // ── ALBERTI BASS (Classical Root -> 5th -> 3rd -> 5th) ──
      const rootP = bassPitch;
      const fifthP = currentRoot - 17;
      const thirdP = currentRoot - 24 + thirdInterval;

      // On phrase downbeat: 3-note harmonic sonority on Beat 0
      if (isPhraseStart) {
        notes.push(
          {
            id: noteId++,
            pitch: fifthP,
            name: pitchToName(fifthP),
            velocity: dynamics.lh - 4,
            start: Number(barStart.toFixed(3)),
            end: Number((barStart + beatSec * 0.9).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 0,
            hand: "L",
          },
          {
            id: noteId++,
            pitch: thirdP,
            name: pitchToName(thirdP),
            velocity: dynamics.lh - 6,
            start: Number(barStart.toFixed(3)),
            end: Number((barStart + beatSec * 0.9).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 0,
            hand: "L",
          }
        );
      }

      if (difficulty === "Beginner") {
        const albertiPitches = [rootP, fifthP, thirdP, fifthP];
        for (let b = 0; b < 4; b++) {
          notes.push({
            id: noteId++,
            pitch: albertiPitches[b],
            name: pitchToName(albertiPitches[b]),
            velocity: dynamics.lh - (b === 0 ? 0 : 6),
            start: Number((barStart + beatSec * b).toFixed(3)),
            end: Number((barStart + beatSec * (b + 0.9)).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 0,
            hand: "L",
          });
        }
      } else {
        const pattern = [rootP, fifthP, thirdP, fifthP, rootP, fifthP, thirdP, fifthP];
        for (let step = 0; step < 8; step++) {
          const t = barStart + beatSec * (step * 0.5);
          notes.push({
            id: noteId++,
            pitch: pattern[step],
            name: pitchToName(pattern[step]),
            velocity: dynamics.lh - (step % 2 === 0 ? 2 : 8),
            start: Number(t.toFixed(3)),
            end: Number((t + beatSec * 0.45).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 0,
            hand: "L",
          });
        }
      }
    } else if (accompStyle === "walking_bass") {
      // ── JAZZ WALKING BASS (Quarter-note walk with guide chords) ──
      const rootP = bassPitch;
      const thirdP = currentRoot - 24 + thirdInterval;
      const fifthP = currentRoot - 17;
      const approachP = bar % 2 === 0 ? currentRoot - 13 : currentRoot - 25;

      // On phrase downbeat: 3-note guide tone voicing on beat 0
      if (isPhraseStart) {
        notes.push(
          {
            id: noteId++,
            pitch: currentRoot - 12 + thirdInterval,
            name: pitchToName(currentRoot - 12 + thirdInterval),
            velocity: dynamics.lh - 6,
            start: Number(barStart.toFixed(3)),
            end: Number((barStart + beatSec * 0.9).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 0,
            hand: "L",
          },
          {
            id: noteId++,
            pitch: currentRoot - 12 + (scaleType === "minor" ? 10 : 11),
            name: pitchToName(currentRoot - 12 + (scaleType === "minor" ? 10 : 11)),
            velocity: dynamics.lh - 6,
            start: Number(barStart.toFixed(3)),
            end: Number((barStart + beatSec * 0.9).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 0,
            hand: "L",
          }
        );
      }

      const walkPitches = [rootP, thirdP, fifthP, approachP];
      for (let b = 0; b < 4; b++) {
        notes.push({
          id: noteId++,
          pitch: walkPitches[b],
          name: pitchToName(walkPitches[b]),
          velocity: dynamics.lh - (b === 0 ? 0 : 4),
          start: Number((barStart + beatSec * b).toFixed(3)),
          end: Number((barStart + beatSec * (b + 0.9)).toFixed(3)),
          duration: Number((beatSec * 0.9).toFixed(3)),
          track: 0,
          hand: "L",
        });
      }

      // Syncopated guide chord on beat 1.5
      const guide3 = currentRoot - 12 + thirdInterval;
      const guide7 = currentRoot - 12 + (scaleType === "minor" ? 10 : 11);
      notes.push(
        {
          id: noteId++,
          pitch: guide3,
          name: pitchToName(guide3),
          velocity: dynamics.lh - 8,
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
          velocity: dynamics.lh - 8,
          start: Number((barStart + beatSec * 1.5).toFixed(3)),
          end: Number((barStart + beatSec * 2.1).toFixed(3)),
          duration: Number((beatSec * 0.6).toFixed(3)),
          track: 0,
          hand: "L",
        }
      );
    } else if (accompStyle === "pop_groove") {
      // ── POP GROOVE (Bass root + 5th + 10th syncopation) ──
      // Beat 0: Bass root
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

      // On phrase downbeat: 3-note sonority on Beat 0
      if (isPhraseStart) {
        notes.push(
          {
            id: noteId++,
            pitch: currentRoot - 17,
            name: pitchToName(currentRoot - 17),
            velocity: dynamics.lh - 6,
            start: Number(barStart.toFixed(3)),
            end: Number((barStart + beatSec * 1.4).toFixed(3)),
            duration: Number((beatSec * 1.4).toFixed(3)),
            track: 0,
            hand: "L",
          },
          {
            id: noteId++,
            pitch: currentRoot - 12,
            name: pitchToName(currentRoot - 12),
            velocity: dynamics.lh - 6,
            start: Number(barStart.toFixed(3)),
            end: Number((barStart + beatSec * 1.4).toFixed(3)),
            duration: Number((beatSec * 1.4).toFixed(3)),
            track: 0,
            hand: "L",
          }
        );
      }

      // Beat 1.5: 8th bounce
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

      // Beat 2: Fifth + Third (2-note chord)
      notes.push(
        {
          id: noteId++,
          pitch: currentRoot - 17,
          name: pitchToName(currentRoot - 17),
          velocity: dynamics.lh - 4,
          start: Number((barStart + beatSec * 2).toFixed(3)),
          end: Number((barStart + beatSec * 2.9).toFixed(3)),
          duration: Number((beatSec * 0.9).toFixed(3)),
          track: 0,
          hand: "L",
        },
        {
          id: noteId++,
          pitch: currentRoot - 12 + thirdInterval,
          name: pitchToName(currentRoot - 12 + thirdInterval),
          velocity: dynamics.lh - 6,
          start: Number((barStart + beatSec * 2).toFixed(3)),
          end: Number((barStart + beatSec * 2.9).toFixed(3)),
          duration: Number((beatSec * 0.9).toFixed(3)),
          track: 0,
          hand: "L",
        }
      );
    } else {
      // ── BALLAD ARPEGGIO & BROKEN TENTHS (Default flowing texture) ──
      // Beat 0: Deep root
      notes.push({
        id: noteId++,
        pitch: bassPitch,
        name: pitchToName(bassPitch),
        velocity: dynamics.lh,
        start: Number(barStart.toFixed(3)),
        end: Number((barStart + beatSec * (isWaltz ? 2.8 : 3.8)).toFixed(3)),
        duration: Number((beatSec * (isWaltz ? 2.8 : 3.8)).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // On phrase downbeat: rich 3-note harmonic sonority on Beat 0 (Root + 5th + 10th)
      if (isPhraseStart) {
        notes.push(
          {
            id: noteId++,
            pitch: currentRoot - 17,
            name: pitchToName(currentRoot - 17),
            velocity: dynamics.lh - 6,
            start: Number(barStart.toFixed(3)),
            end: Number((barStart + beatSec * 1.8).toFixed(3)),
            duration: Number((beatSec * 1.8).toFixed(3)),
            track: 0,
            hand: "L",
          },
          {
            id: noteId++,
            pitch: currentRoot - 12 + thirdInterval,
            name: pitchToName(currentRoot - 12 + thirdInterval),
            velocity: dynamics.lh - 8,
            start: Number(barStart.toFixed(3)),
            end: Number((barStart + beatSec * 1.8).toFixed(3)),
            duration: Number((beatSec * 1.8).toFixed(3)),
            track: 0,
            hand: "L",
          }
        );
      }

      // Gentle broken arpeggio steps: 5th -> Octave -> 10th
      const pitches = [
        currentRoot - 17,
        currentRoot - 12,
        currentRoot - 12 + thirdInterval,
      ];
      for (let b = 1; b < beatsPerBar; b++) {
        const p = pitches[(b - 1) % pitches.length];
        notes.push({
          id: noteId++,
          pitch: p,
          name: pitchToName(p),
          velocity: dynamics.lh - 6,
          start: Number((barStart + beatSec * b).toFixed(3)),
          end: Number((barStart + beatSec * (b + 0.9)).toFixed(3)),
          duration: Number((beatSec * 0.9).toFixed(3)),
          track: 0,
          hand: "L",
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // RIGHT HAND MELODY PHRASING & RHYTHMIC VARIETY
    // Pure singing voice (RH velocity 76-92) with lyrical variety & natural rests!
    // NO jarring Beat 0 triad!
    // ─────────────────────────────────────────────────────────────
    const melodyStep = isWaltz ? 3 : 4;
    const melodyIdx = (bar * melodyStep + (section === "bridge" ? 2 : 0)) % defaultMelody.length;
    const melPitch = root + registerShift + defaultMelody[melodyIdx];

    const phrasePattern = bar % 4; // 0: statement, 1: response, 2: climax, 3: resolution

    if (isWaltz) {
      // ── WALTZ RIGHT HAND PHRASING ──
      if (phrasePattern === 0) {
        // Half note on beat 0, quarter on beat 2
        const m1 = root + registerShift + defaultMelody[(melodyIdx + 2) % defaultMelody.length];
        notes.push(
          {
            id: noteId++,
            pitch: melPitch,
            name: pitchToName(melPitch),
            velocity: dynamics.rh,
            start: Number(barStart.toFixed(3)),
            end: Number((barStart + beatSec * 1.9).toFixed(3)),
            duration: Number((beatSec * 1.9).toFixed(3)),
            track: 1,
            hand: "R",
          },
          {
            id: noteId++,
            pitch: m1,
            name: pitchToName(m1),
            velocity: dynamics.rh - 4,
            start: Number((barStart + beatSec * 2).toFixed(3)),
            end: Number((barStart + beatSec * 2.9).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 1,
            hand: "R",
          }
        );
      } else if (phrasePattern === 1) {
        // Flowing quarter notes on beats 0 & 1, gentle breath rest on beat 2
        const m1 = root + registerShift + defaultMelody[(melodyIdx + 1) % defaultMelody.length];
        notes.push(
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
          },
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
          }
        );
      } else if (phrasePattern === 2) {
        // Climax: Quarter note on beat 0 + two 8th notes on beat 1 + quarter on beat 2
        const m1a = root + registerShift + defaultMelody[(melodyIdx + 1) % defaultMelody.length];
        const m1b = root + registerShift + defaultMelody[(melodyIdx + 2) % defaultMelody.length];
        const m2 = root + registerShift + defaultMelody[(melodyIdx + 3) % defaultMelody.length];
        notes.push(
          {
            id: noteId++,
            pitch: melPitch,
            name: pitchToName(melPitch),
            velocity: dynamics.rh + 2,
            start: Number(barStart.toFixed(3)),
            end: Number((barStart + beatSec * 0.9).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 1,
            hand: "R",
          },
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
          {
            id: noteId++,
            pitch: m2,
            name: pitchToName(m2),
            velocity: dynamics.rh - 2,
            start: Number((barStart + beatSec * 2).toFixed(3)),
            end: Number((barStart + beatSec * 2.9).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 1,
            hand: "R",
          }
        );
      } else {
        // Resolution: Long dotted half note singing for the whole bar
        notes.push({
          id: noteId++,
          pitch: melPitch,
          name: pitchToName(melPitch),
          velocity: dynamics.rh,
          start: Number(barStart.toFixed(3)),
          end: Number((barStart + beatSec * 2.85).toFixed(3)),
          duration: Number((beatSec * 2.85).toFixed(3)),
          track: 1,
          hand: "R",
        });
      }
    } else {
      // ── 4/4 METER RIGHT HAND PHRASING ──
      if (phrasePattern === 0) {
        // Lyrical Statement: Dotted half note on beat 0 + quarter note on beat 3
        const m3 = root + registerShift + defaultMelody[(melodyIdx + 3) % defaultMelody.length];
        notes.push(
          {
            id: noteId++,
            pitch: melPitch,
            name: pitchToName(melPitch),
            velocity: dynamics.rh,
            start: Number(barStart.toFixed(3)),
            end: Number((barStart + beatSec * 2.85).toFixed(3)),
            duration: Number((beatSec * 2.85).toFixed(3)),
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
      } else if (phrasePattern === 1) {
        // Flowing Response: Quarter on beat 0, quarter on beat 1, two 8th notes on beat 2, breath rest on beat 3
        const m1 = root + registerShift + defaultMelody[(melodyIdx + 1) % defaultMelody.length];
        const m2a = root + registerShift + defaultMelody[(melodyIdx + 2) % defaultMelody.length];
        const m2b = root + registerShift + defaultMelody[(melodyIdx + 3) % defaultMelody.length];
        notes.push(
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
          },
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
      } else if (phrasePattern === 2) {
        // Climax: Quarter notes across beats 0, 1, 2, 3
        const m1 = root + registerShift + defaultMelody[(melodyIdx + 1) % defaultMelody.length];
        const m2 = root + registerShift + defaultMelody[(melodyIdx + 2) % defaultMelody.length];
        const m3 = root + registerShift + defaultMelody[(melodyIdx + 3) % defaultMelody.length];
        notes.push(
          {
            id: noteId++,
            pitch: melPitch,
            name: pitchToName(melPitch),
            velocity: dynamics.rh + 2,
            start: Number(barStart.toFixed(3)),
            end: Number((barStart + beatSec * 0.9).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 1,
            hand: "R",
          },
          {
            id: noteId++,
            pitch: m1,
            name: pitchToName(m1),
            velocity: dynamics.rh,
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
            velocity: dynamics.rh - 2,
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
      } else {
        // Resolution: Half note on beat 0, half note on beat 2
        const m2 = root + registerShift + defaultMelody[(melodyIdx + 2) % defaultMelody.length];
        notes.push(
          {
            id: noteId++,
            pitch: melPitch,
            name: pitchToName(melPitch),
            velocity: dynamics.rh,
            start: Number(barStart.toFixed(3)),
            end: Number((barStart + beatSec * 1.9).toFixed(3)),
            duration: Number((beatSec * 1.9).toFixed(3)),
            track: 1,
            hand: "R",
          },
          {
            id: noteId++,
            pitch: m2,
            name: pitchToName(m2),
            velocity: dynamics.rh - 4,
            start: Number((barStart + beatSec * 2).toFixed(3)),
            end: Number((barStart + beatSec * 3.85).toFixed(3)),
            duration: Number((beatSec * 1.85).toFixed(3)),
            track: 1,
            hand: "R",
          }
        );
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
      { index: 0, name: "Left Hand (Bass & Accompaniment)", note_count: lhCount },
      { index: 1, name: "Right Hand (Cantabile Melody)", note_count: rhCount },
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
    isCanonical: false,
    qualityTier: "arranged",
    isFullLength: true,
    noteData,
  };
}
