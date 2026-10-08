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

function createCanonicalSong(
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

  // 1. Moonlight Sonata 1st Mvt (Beethoven)
  if (normId === "moonlightsonata" || normId === "beethovenmoonlight") {
    const bpm = 54;
    const beatSec = 60 / bpm;
    const tripletSec = beatSec / 3;
    const notes: Note[] = [];
    let noteId = 1;

    // Bass Octaves (LH): 7 bars + Cadence Bar
    const bassPitches = [
      { p1: 37, p2: 49 }, // C#2, C#3 (Bar 1)
      { p1: 35, p2: 47 }, // B1, B2   (Bar 2)
      { p1: 33, p2: 45 }, // A1, A2   (Bar 3)
      { p1: 32, p2: 44 }, // G#1, G#2 (Bar 4)
      { p1: 37, p2: 49 }, // C#2, C#3 (Bar 5)
      { p1: 35, p2: 47 }, // B1, B2   (Bar 6)
      { p1: 33, p2: 45 }, // A1, A2   (Bar 7)
    ];

    for (let bar = 0; bar < 7; bar++) {
      const bStart = bar * 4 * beatSec;
      const bDur = Number((beatSec * 3.9).toFixed(3));
      notes.push(
        {
          id: noteId++,
          pitch: bassPitches[bar].p1,
          name: pitchToName(bassPitches[bar].p1),
          velocity: 56,
          start: Number(bStart.toFixed(3)),
          end: Number((bStart + bDur).toFixed(3)),
          duration: bDur,
          track: 0,
          hand: "L",
        },
        {
          id: noteId++,
          pitch: bassPitches[bar].p2,
          name: pitchToName(bassPitches[bar].p2),
          velocity: 52,
          start: Number(bStart.toFixed(3)),
          end: Number((bStart + bDur).toFixed(3)),
          duration: bDur,
          track: 0,
          hand: "L",
        }
      );

      // Triplet arpeggios
      for (let beat = 0; beat < 4; beat++) {
        let tripPitches = [56, 61, 64]; // G#3, C#4, E4
        if (bar === 2) {
          tripPitches = beat < 2 ? [57, 61, 64] : [54, 57, 62]; // A3-C#4-E4 then F#3-A3-D4
        } else if (bar === 3) {
          tripPitches = beat < 2 ? [56, 61, 64] : [56, 60, 63]; // G#3-C#4-E4 then G#3-C4-D#4
        }

        for (let t = 0; t < 3; t++) {
          const tStart = bStart + beat * beatSec + t * tripletSec;
          notes.push({
            id: noteId++,
            pitch: tripPitches[t],
            name: pitchToName(tripPitches[t]),
            velocity: 48,
            start: Number(tStart.toFixed(3)),
            end: Number((tStart + tripletSec * 0.95).toFixed(3)),
            duration: Number((tripletSec * 0.95).toFixed(3)),
            track: 1,
            hand: "R",
          });
        }
      }
    }

    // Singing cantabile melody (enters on bar 4 & 5, vel 84)
    // Bar 4 (5th bar): Dotted G#4 melody
    const bar4Start = 4 * 4 * beatSec;
    notes.push(
      {
        id: noteId++,
        pitch: 68, // G#4
        name: "G#4",
        velocity: 84,
        start: Number((bar4Start + beatSec * 2).toFixed(3)),
        end: Number((bar4Start + beatSec * 2.75).toFixed(3)),
        duration: Number((beatSec * 0.75).toFixed(3)),
        track: 1,
        hand: "R",
      },
      {
        id: noteId++,
        pitch: 68,
        name: "G#4",
        velocity: 80,
        start: Number((bar4Start + beatSec * 2.75).toFixed(3)),
        end: Number((bar4Start + beatSec * 3).toFixed(3)),
        duration: Number((beatSec * 0.25).toFixed(3)),
        track: 1,
        hand: "R",
      },
      {
        id: noteId++,
        pitch: 68,
        name: "G#4",
        velocity: 84,
        start: Number((bar4Start + beatSec * 3).toFixed(3)),
        end: Number((bar4Start + beatSec * 3.75).toFixed(3)),
        duration: Number((beatSec * 0.75).toFixed(3)),
        track: 1,
        hand: "R",
      },
      {
        id: noteId++,
        pitch: 69, // A4
        name: "A4",
        velocity: 86,
        start: Number((bar4Start + beatSec * 3.75).toFixed(3)),
        end: Number((bar4Start + beatSec * 4).toFixed(3)),
        duration: Number((beatSec * 0.25).toFixed(3)),
        track: 1,
        hand: "R",
      }
    );

    // Bar 5: G#4 -> F#4 -> E4 -> D#4
    const bar5Start = 5 * 4 * beatSec;
    const bar5Mel = [68, 66, 64, 63];
    for (let m = 0; m < 4; m++) {
      notes.push({
        id: noteId++,
        pitch: bar5Mel[m],
        name: pitchToName(bar5Mel[m]),
        velocity: 84 - m * 2,
        start: Number((bar5Start + beatSec * m).toFixed(3)),
        end: Number((bar5Start + beatSec * (m + 0.95)).toFixed(3)),
        duration: Number((beatSec * 0.95).toFixed(3)),
        track: 1,
        hand: "R",
      });
    }

    // Bar 7: Grand Final Resolution Cadence
    const cadStart = 7 * 4 * beatSec;
    const cadDur = Number((beatSec * 3.9).toFixed(3));
    // LH: 3 notes
    notes.push(
      {
        id: noteId++,
        pitch: 25, // C#1
        name: "C#1",
        velocity: 64,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 0,
        hand: "L",
      },
      {
        id: noteId++,
        pitch: 32, // G#1
        name: "G#1",
        velocity: 60,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 0,
        hand: "L",
      },
      {
        id: noteId++,
        pitch: 37, // C#2
        name: "C#2",
        velocity: 62,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 0,
        hand: "L",
      }
    );

    // RH: 4 notes
    [61, 64, 68, 73].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 78,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 1,
        hand: "R",
      });
    });

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Low Bass Octaves)",
      "Right Hand (Arpeggiated Triplets & Cantabile Melody)"
    );
  }

  // 2. Moonlight Sonata 3rd Mvt - Presto Agitato (Beethoven)
  if (normId === "moonlightsonata3rd" || normId === "prestoagitato") {
    const bpm = 160;
    const beatSec = 60 / bpm;
    const s16 = beatSec / 4;
    const notes: Note[] = [];
    let noteId = 1;

    // Bar 1: Ascending C# minor arpeggio + two staccato chords
    notes.push({
      id: noteId++,
      pitch: 49, // C#3 bass
      name: "C#3",
      velocity: 65,
      start: 0,
      end: Number((beatSec * 0.4).toFixed(3)),
      duration: Number((beatSec * 0.4).toFixed(3)),
      track: 0,
      hand: "L",
    });

    const arp1 = [49, 52, 56, 61, 64, 68, 73, 76, 80, 85, 88, 92]; // C#3 to G#6
    for (let i = 0; i < arp1.length; i++) {
      const st = i * s16;
      notes.push({
        id: noteId++,
        pitch: arp1[i],
        name: pitchToName(arp1[i]),
        velocity: 75 + Math.floor(i * 1.4),
        start: Number(st.toFixed(3)),
        end: Number((st + s16 * 0.9).toFixed(3)),
        duration: Number((s16 * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      });
    }

    // Two explosive staccato chords on beat 3 and beat 3.5
    [3.0, 3.5].forEach((b) => {
      const chordStart = b * beatSec;
      [68, 80, 85].forEach((cp) => {
        notes.push({
          id: noteId++,
          pitch: cp,
          name: pitchToName(cp),
          velocity: 95,
          start: Number(chordStart.toFixed(3)),
          end: Number((chordStart + beatSec * 0.35).toFixed(3)),
          duration: Number((beatSec * 0.35).toFixed(3)),
          track: 1,
          hand: "R",
        });
      });
    });

    // Bar 2: D# dim arpeggio + two staccato chords
    const b1Start = 4 * beatSec;
    notes.push({
      id: noteId++,
      pitch: 51, // D#3 bass
      name: "D#3",
      velocity: 65,
      start: Number(b1Start.toFixed(3)),
      end: Number((b1Start + beatSec * 0.4).toFixed(3)),
      duration: Number((beatSec * 0.4).toFixed(3)),
      track: 0,
      hand: "L",
    });

    const arp2 = [51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84];
    for (let i = 0; i < arp2.length; i++) {
      const st = b1Start + i * s16;
      notes.push({
        id: noteId++,
        pitch: arp2[i],
        name: pitchToName(arp2[i]),
        velocity: 75 + Math.floor(i * 1.4),
        start: Number(st.toFixed(3)),
        end: Number((st + s16 * 0.9).toFixed(3)),
        duration: Number((s16 * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      });
    }

    [3.0, 3.5].forEach((b) => {
      const chordStart = b1Start + b * beatSec;
      [78, 84, 87].forEach((cp) => {
        notes.push({
          id: noteId++,
          pitch: cp,
          name: pitchToName(cp),
          velocity: 95,
          start: Number(chordStart.toFixed(3)),
          end: Number((chordStart + beatSec * 0.35).toFixed(3)),
          duration: Number((beatSec * 0.35).toFixed(3)),
          track: 1,
          hand: "R",
        });
      });
    });

    // Bar 3: Grand Cadence
    const b2Start = 8 * beatSec;
    const cadDur = Number((beatSec * 3.8).toFixed(3));
    // LH 3 notes
    [32, 39, 44].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 90,
        start: Number(b2Start.toFixed(3)),
        end: Number((b2Start + cadDur).toFixed(3)),
        duration: cadDur,
        track: 0,
        hand: "L",
      });
    });
    // RH 4 notes
    [73, 76, 80, 85].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 95,
        start: Number(b2Start.toFixed(3)),
        end: Number((b2Start + cadDur).toFixed(3)),
        duration: cadDur,
        track: 1,
        hand: "R",
      });
    });

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Staccato Bass & Octaves)",
      "Right Hand (Presto Agitato Arpeggios & Sforzando Chords)"
    );
  }

  // 3. River Flows in You (Yiruma)
  if (normId === "riverflowsinyou" || normId === "yirumariverflowsinyou") {
    const bpm = 68;
    const beatSec = 60 / bpm;
    const s16 = beatSec / 4;
    const notes: Note[] = [];
    let noteId = 1;

    // 4 Bars of authentic 1-5-8-10 flowing arpeggios + 1 Cadence bar
    const chords = [
      { root: 42, f5: 49, oct: 54, t10: 57, top: 61 }, // F#m: F#2, C#3, F#3, A3, C#4
      { root: 38, f5: 45, oct: 50, t10: 54, top: 57 }, // D:   D2,  A2,  D3,  F#3, A3
      { root: 45, f5: 52, oct: 57, t10: 61, top: 64 }, // A:   A2,  E3,  A3,  C#4, E4
      { root: 40, f5: 47, oct: 52, t10: 56, top: 59 }, // E:   E2,  B2,  E3,  G#3, B3
    ];

    for (let bar = 0; bar < 4; bar++) {
      const bStart = bar * 4 * beatSec;
      const ch = chords[bar];

      // LH 1-5-8-10 arpeggio
      const lhSteps = [ch.root, ch.f5, ch.oct, ch.t10, ch.top, ch.t10, ch.oct, ch.f5];
      for (let s = 0; s < 8; s++) {
        const st = bStart + s * (beatSec * 0.5);
        notes.push({
          id: noteId++,
          pitch: lhSteps[s],
          name: pitchToName(lhSteps[s]),
          velocity: s === 0 ? 56 : 50,
          start: Number(st.toFixed(3)),
          end: Number((st + beatSec * 0.45).toFixed(3)),
          duration: Number((beatSec * 0.45).toFixed(3)),
          track: 0,
          hand: "L",
        });
      }

      // RH Singing Melody with authentic phrasing & gentle breathing
      if (bar === 0) {
        // A4 (quarter), G#4-A4 (16ths), A4 (8th), E5 (quarter)
        notes.push(
          { id: noteId++, pitch: 69, name: "A4", velocity: 84, start: Number(bStart.toFixed(3)), end: Number((bStart + beatSec * 0.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: 68, name: "G#4", velocity: 80, start: Number((bStart + beatSec).toFixed(3)), end: Number((bStart + beatSec + s16 * 0.9).toFixed(3)), duration: Number((s16 * 0.9).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: 69, name: "A4", velocity: 82, start: Number((bStart + beatSec + s16).toFixed(3)), end: Number((bStart + beatSec + s16 * 2 * 0.95).toFixed(3)), duration: Number((s16 * 0.95).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: 69, name: "A4", velocity: 84, start: Number((bStart + beatSec * 1.5).toFixed(3)), end: Number((bStart + beatSec * 1.95).toFixed(3)), duration: Number((beatSec * 0.45).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: 76, name: "E5", velocity: 88, start: Number((bStart + beatSec * 2).toFixed(3)), end: Number((bStart + beatSec * 3.8).toFixed(3)), duration: Number((beatSec * 1.8).toFixed(3)), track: 1, hand: "R" }
        );
      } else if (bar === 1) {
        notes.push(
          { id: noteId++, pitch: 69, name: "A4", velocity: 84, start: Number(bStart.toFixed(3)), end: Number((bStart + beatSec * 0.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: 68, name: "G#4", velocity: 80, start: Number((bStart + beatSec).toFixed(3)), end: Number((bStart + beatSec + s16 * 0.9).toFixed(3)), duration: Number((s16 * 0.9).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: 69, name: "A4", velocity: 82, start: Number((bStart + beatSec + s16).toFixed(3)), end: Number((bStart + beatSec + s16 * 2 * 0.95).toFixed(3)), duration: Number((s16 * 0.95).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: 74, name: "D5", velocity: 86, start: Number((bStart + beatSec * 2).toFixed(3)), end: Number((bStart + beatSec * 2.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: 73, name: "C#5", velocity: 84, start: Number((bStart + beatSec * 3).toFixed(3)), end: Number((bStart + beatSec * 3.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" }
        );
      } else if (bar === 2) {
        notes.push(
          { id: noteId++, pitch: 73, name: "C#5", velocity: 84, start: Number(bStart.toFixed(3)), end: Number((bStart + beatSec * 0.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: 71, name: "B4", velocity: 82, start: Number((bStart + beatSec).toFixed(3)), end: Number((bStart + beatSec * 1.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: 69, name: "A4", velocity: 84, start: Number((bStart + beatSec * 2).toFixed(3)), end: Number((bStart + beatSec * 2.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: 68, name: "G#4", velocity: 80, start: Number((bStart + beatSec * 3).toFixed(3)), end: Number((bStart + beatSec * 3.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" }
        );
      } else {
        notes.push(
          { id: noteId++, pitch: 69, name: "A4", velocity: 86, start: Number(bStart.toFixed(3)), end: Number((bStart + beatSec * 1.9).toFixed(3)), duration: Number((beatSec * 1.9).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: 71, name: "B4", velocity: 82, start: Number((bStart + beatSec * 2).toFixed(3)), end: Number((bStart + beatSec * 2.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: 73, name: "C#5", velocity: 84, start: Number((bStart + beatSec * 3).toFixed(3)), end: Number((bStart + beatSec * 3.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" }
        );
      }
    }

    // Final Bar: Lyrical Cadence (3-note LH and 3-note RH)
    const cadStart = 4 * 4 * beatSec;
    const cadDur = Number((beatSec * 3.8).toFixed(3));
    [45, 52, 57].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 58,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 0,
        hand: "L",
      });
    });
    [69, 73, 76].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 84,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 1,
        hand: "R",
      });
    });

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Flowing 1-5-8-10 Arpeggios)",
      "Right Hand (Cantabile Melody & Phrasing)"
    );
  }

  // 4. Prelude in C Major, BWV 846 (Bach)
  if (normId === "bachpreludecmajor" || normId === "preludecmajorbwv846") {
    const bpm = 112;
    const beatSec = 60 / bpm;
    const notes: Note[] = [];
    let noteId = 1;

    // 4 Iconic measures from Well-Tempered Clavier + Final Cadence
    const patterns = [
      [48, 52, 55, 60, 64], // C maj:  C3, E3, G3, C4, E4
      [48, 50, 57, 62, 65], // Dm7/C:  C3, D3, A3, D4, F4
      [47, 50, 55, 62, 65], // G7/B:   B2, D3, G3, D4, F4
      [48, 52, 55, 60, 64], // C maj:  C3, E3, G3, C4, E4
    ];

    for (let bar = 0; bar < 4; bar++) {
      const bStart = bar * 4 * beatSec;
      const p = patterns[bar];

      // Each bar plays two identical 8-note arpeggio waves
      for (let wave = 0; wave < 2; wave++) {
        const wStart = bStart + wave * (beatSec * 2);
        const waveNotes = [p[0], p[1], p[2], p[3], p[4], p[2], p[3], p[4]];
        for (let i = 0; i < 8; i++) {
          const st = wStart + i * (beatSec * 0.25);
          const hand = i < 2 ? "L" : "R";
          const track = i < 2 ? 0 : 1;
          notes.push({
            id: noteId++,
            pitch: waveNotes[i],
            name: pitchToName(waveNotes[i]),
            velocity: i === 0 ? 60 : 54,
            start: Number(st.toFixed(3)),
            end: Number((st + beatSec * 0.24).toFixed(3)),
            duration: Number((beatSec * 0.24).toFixed(3)),
            track,
            hand,
          });
        }
      }
    }

    // Final Cadence Bar: 3 notes LH, 4 notes RH
    const cadStart = 4 * 4 * beatSec;
    const cadDur = Number((beatSec * 3.8).toFixed(3));
    [36, 43, 48].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 64,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 0,
        hand: "L",
      });
    });
    [52, 55, 60, 64].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 78,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 1,
        hand: "R",
      });
    });

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Ground Bass Arpeggio)",
      "Right Hand (Flowing 16th Arpeggios)"
    );
  }

  // 5. Interstellar Main Theme / First Step (Hans Zimmer)
  if (normId === "interstellarmaintheme" || normId === "firststepinterstellar") {
    const bpm = 96;
    const beatSec = 60 / bpm;
    const notes: Note[] = [];
    let noteId = 1;

    // 6 Bars in 3/4 + Cadence
    const chords = [
      { bass1: 33, bass2: 45, p1: 76, p2: 74 }, // Am: A1+A2, E5-D5
      { bass1: 33, bass2: 45, p1: 76, p2: 74 }, // Am
      { bass1: 29, bass2: 41, p1: 77, p2: 76 }, // F:  F1+F2, F5-E5
      { bass1: 29, bass2: 41, p1: 77, p2: 76 }, // F
      { bass1: 36, bass2: 48, p1: 79, p2: 77 }, // C:  C2+C3, G5-F5
      { bass1: 31, bass2: 43, p1: 74, p2: 72 }, // G:  G1+G2, D5-C5
    ];

    for (let bar = 0; bar < 6; bar++) {
      const bStart = bar * 3 * beatSec;
      const bDur = Number((beatSec * 2.9).toFixed(3));
      const ch = chords[bar];

      // LH Bass Octave
      notes.push(
        {
          id: noteId++,
          pitch: ch.bass1,
          name: pitchToName(ch.bass1),
          velocity: 56,
          start: Number(bStart.toFixed(3)),
          end: Number((bStart + bDur).toFixed(3)),
          duration: bDur,
          track: 0,
          hand: "L",
        },
        {
          id: noteId++,
          pitch: ch.bass2,
          name: pitchToName(ch.bass2),
          velocity: 52,
          start: Number(bStart.toFixed(3)),
          end: Number((bStart + bDur).toFixed(3)),
          duration: bDur,
          track: 0,
          hand: "L",
        }
      );

      // RH Pulsing 8th notes
      for (let beat = 0; beat < 3; beat++) {
        const t1 = bStart + beat * beatSec;
        const t2 = t1 + beatSec * 0.5;
        notes.push(
          {
            id: noteId++,
            pitch: ch.p1,
            name: pitchToName(ch.p1),
            velocity: 78,
            start: Number(t1.toFixed(3)),
            end: Number((t1 + beatSec * 0.45).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 1,
            hand: "R",
          },
          {
            id: noteId++,
            pitch: ch.p2,
            name: pitchToName(ch.p2),
            velocity: 75,
            start: Number(t2.toFixed(3)),
            end: Number((t2 + beatSec * 0.45).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 1,
            hand: "R",
          }
        );
      }
    }

    // Dynamic Cadence Bar: 3-note LH and 4-note RH
    const cadStart = 6 * 3 * beatSec;
    const cadDur = Number((beatSec * 2.9).toFixed(3));
    [33, 40, 45].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 68,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 0,
        hand: "L",
      });
    });
    [72, 76, 81, 88].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 90,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 1,
        hand: "R",
      });
    });

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Deep Space Organ Octaves)",
      "Right Hand (Pulsing OST Ostinato)"
    );
  }

  // 6. Sparkle (RADWIMPS - Your Name)
  if (normId === "sparkleyourname" || normId === "radwimpssparkle") {
    const bpm = 124;
    const beatSec = 60 / bpm;
    const notes: Note[] = [];
    let noteId = 1;

    // 4 Bars of Sparkling Pentatonic Bells + Uplifting Ballad Progression + Cadence
    const chords = [
      { bass: 40, f5: 47, t10: 56, bell: [78, 80, 83, 85, 87, 85, 83, 80] }, // Emaj7
      { bass: 42, f5: 49, t10: 58, bell: [78, 80, 83, 85, 87, 90, 87, 85] }, // F#
      { bass: 44, f5: 51, t10: 59, bell: [83, 87, 90, 92, 90, 87, 85, 83] }, // G#m7
      { bass: 39, f5: 46, t10: 54, bell: [80, 83, 85, 87, 83, 83, 83, 83] }, // B/D#
    ];

    for (let bar = 0; bar < 4; bar++) {
      const bStart = bar * 4 * beatSec;
      const ch = chords[bar];

      // LH Arpeggios (Root -> 5th -> 10th)
      notes.push(
        { id: noteId++, pitch: ch.bass, name: pitchToName(ch.bass), velocity: 58, start: Number(bStart.toFixed(3)), end: Number((bStart + beatSec * 1.8).toFixed(3)), duration: Number((beatSec * 1.8).toFixed(3)), track: 0, hand: "L" },
        { id: noteId++, pitch: ch.f5, name: pitchToName(ch.f5), velocity: 52, start: Number((bStart + beatSec).toFixed(3)), end: Number((bStart + beatSec * 1.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 0, hand: "L" },
        { id: noteId++, pitch: ch.t10, name: pitchToName(ch.t10), velocity: 50, start: Number((bStart + beatSec * 2).toFixed(3)), end: Number((bStart + beatSec * 3.8).toFixed(3)), duration: Number((beatSec * 1.8).toFixed(3)), track: 0, hand: "L" }
      );

      // RH Sparkling Pentatonic Bells (8th notes)
      for (let i = 0; i < 8; i++) {
        const st = bStart + i * (beatSec * 0.5);
        notes.push({
          id: noteId++,
          pitch: ch.bell[i],
          name: pitchToName(ch.bell[i]),
          velocity: 82,
          start: Number(st.toFixed(3)),
          end: Number((st + beatSec * 0.45).toFixed(3)),
          duration: Number((beatSec * 0.45).toFixed(3)),
          track: 1,
          hand: "R",
        });
      }
    }

    // Cadence: 3 notes LH, 3 notes RH
    const cadStart = 4 * 4 * beatSec;
    const cadDur = Number((beatSec * 3.8).toFixed(3));
    [35, 42, 47].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 60,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 0,
        hand: "L",
      });
    });
    [75, 78, 83].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 86,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 1,
        hand: "R",
      });
    });

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Ballad Arpeggios)",
      "Right Hand (Sparkling Pentatonic Bells)"
    );
  }

  // 7. Autumn Leaves (Joseph Kosma)
  if (normId === "autumnleaves" || normId === "kosmaautumnleaves") {
    const bpm = 116;
    const beatSec = 60 / bpm;
    const notes: Note[] = [];
    let noteId = 1;

    // Jazz ii-V-I progression: Cm7 -> F7 -> Bbmaj7 -> Ebmaj7
    const bars = [
      { bass: 36, chord: [51, 58, 62], mel: [60, 62, 63] }, // Cm7: C2, Eb3+Bb3+D4, C4-D4-Eb4
      { bass: 41, chord: [51, 57, 60], mel: [70] },          // F7:  F2,  Eb3+A3+C4,  Bb4
      { bass: 34, chord: [50, 57, 60], mel: [58, 60, 62, 63] }, // Bbmaj7: Bb1, D3+A3+C4
      { bass: 39, chord: [55, 62, 65], mel: [69] },          // Ebmaj7: Eb2, G3+D4+F4, A4
    ];

    for (let bar = 0; bar < 4; bar++) {
      const bStart = bar * 4 * beatSec;
      const bData = bars[bar];

      // LH Bass
      notes.push({
        id: noteId++,
        pitch: bData.bass,
        name: pitchToName(bData.bass),
        velocity: 58,
        start: Number(bStart.toFixed(3)),
        end: Number((bStart + beatSec * 1.8).toFixed(3)),
        duration: Number((beatSec * 1.8).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // LH 3-note jazz guide-tone comping chord on beat 1.5
      bData.chord.forEach((cp) => {
        notes.push({
          id: noteId++,
          pitch: cp,
          name: pitchToName(cp),
          velocity: 48,
          start: Number((bStart + beatSec * 1.5).toFixed(3)),
          end: Number((bStart + beatSec * 2.8).toFixed(3)),
          duration: Number((beatSec * 1.3).toFixed(3)),
          track: 0,
          hand: "L",
        });
      });

      // RH Swing Melody
      if (bData.mel.length === 1) {
        notes.push({
          id: noteId++,
          pitch: bData.mel[0],
          name: pitchToName(bData.mel[0]),
          velocity: 85,
          start: Number(bStart.toFixed(3)),
          end: Number((bStart + beatSec * 3.8).toFixed(3)),
          duration: Number((beatSec * 3.8).toFixed(3)),
          track: 1,
          hand: "R",
        });
      } else {
        bData.mel.forEach((mp, idx) => {
          notes.push({
            id: noteId++,
            pitch: mp,
            name: pitchToName(mp),
            velocity: 82 + idx * 2,
            start: Number((bStart + beatSec * idx).toFixed(3)),
            end: Number((bStart + beatSec * (idx + 0.9)).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 1,
            hand: "R",
          });
        });
      }
    }

    // Final Jazz Cadence: 3 notes LH, 4 notes RH
    const cadStart = 4 * 4 * beatSec;
    const cadDur = Number((beatSec * 3.8).toFixed(3));
    [31, 38, 46].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 60,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 0,
        hand: "L",
      });
    });
    [55, 58, 62, 67].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 84,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 1,
        hand: "R",
      });
    });

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Jazz Walking Bass & Guide Chords)",
      "Right Hand (Swing Cantabile Melody)"
    );
  }

  // 8. The Entertainer (Scott Joplin)
  if (normId === "theentertainerjoplin" || normId === "theentertainerscottjoplinrag") {
    const bpm = 92;
    const beatSec = 60 / bpm;
    const s16 = beatSec / 4;
    const notes: Note[] = [];
    let noteId = 1;

    // Iconic syncopated ragtime intro: D4, D#4, E4, C5, E4, C5, E4, C5
    const introPitches = [62, 63, 64, 72, 64, 72, 64, 72];
    const introRhythms = [s16, s16, s16, beatSec * 0.5, s16, beatSec * 0.5, s16, beatSec];
    let curT = 0;
    for (let i = 0; i < introPitches.length; i++) {
      notes.push({
        id: noteId++,
        pitch: introPitches[i],
        name: pitchToName(introPitches[i]),
        velocity: 86,
        start: Number(curT.toFixed(3)),
        end: Number((curT + introRhythms[i] * 0.9).toFixed(3)),
        duration: Number((introRhythms[i] * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      });
      curT += introRhythms[i];
    }

    // Stride Bass Section (Oom-Pah)
    const strideStart = 4 * beatSec;
    // LH: Beat 0 Root C2 (oom), Beat 1 Chord E3+G3+C4 (pah), Beat 2 Fifth G2 (oom), Beat 3 Chord (pah)
    notes.push(
      { id: noteId++, pitch: 36, name: "C2", velocity: 62, start: Number(strideStart.toFixed(3)), end: Number((strideStart + beatSec * 0.8).toFixed(3)), duration: Number((beatSec * 0.8).toFixed(3)), track: 0, hand: "L" },
      { id: noteId++, pitch: 52, name: "E3", velocity: 52, start: Number((strideStart + beatSec).toFixed(3)), end: Number((strideStart + beatSec * 1.8).toFixed(3)), duration: Number((beatSec * 0.8).toFixed(3)), track: 0, hand: "L" },
      { id: noteId++, pitch: 55, name: "G3", velocity: 52, start: Number((strideStart + beatSec).toFixed(3)), end: Number((strideStart + beatSec * 1.8).toFixed(3)), duration: Number((beatSec * 0.8).toFixed(3)), track: 0, hand: "L" },
      { id: noteId++, pitch: 60, name: "C4", velocity: 52, start: Number((strideStart + beatSec).toFixed(3)), end: Number((strideStart + beatSec * 1.8).toFixed(3)), duration: Number((beatSec * 0.8).toFixed(3)), track: 0, hand: "L" },
      { id: noteId++, pitch: 43, name: "G2", velocity: 60, start: Number((strideStart + beatSec * 2).toFixed(3)), end: Number((strideStart + beatSec * 2.8).toFixed(3)), duration: Number((beatSec * 0.8).toFixed(3)), track: 0, hand: "L" },
      { id: noteId++, pitch: 52, name: "E3", velocity: 52, start: Number((strideStart + beatSec * 3).toFixed(3)), end: Number((strideStart + beatSec * 3.8).toFixed(3)), duration: Number((beatSec * 0.8).toFixed(3)), track: 0, hand: "L" },
      { id: noteId++, pitch: 55, name: "G3", velocity: 52, start: Number((strideStart + beatSec * 3).toFixed(3)), end: Number((strideStart + beatSec * 3.8).toFixed(3)), duration: Number((beatSec * 0.8).toFixed(3)), track: 0, hand: "L" },
      { id: noteId++, pitch: 60, name: "C4", velocity: 52, start: Number((strideStart + beatSec * 3).toFixed(3)), end: Number((strideStart + beatSec * 3.8).toFixed(3)), duration: Number((beatSec * 0.8).toFixed(3)), track: 0, hand: "L" }
    );

    // RH Syncopated Theme
    const ragMel = [62, 63, 64, 72, 64, 72, 74, 75, 76];
    for (let r = 0; r < ragMel.length; r++) {
      const st = strideStart + r * (beatSec * 0.4);
      notes.push({
        id: noteId++,
        pitch: ragMel[r],
        name: pitchToName(ragMel[r]),
        velocity: 86,
        start: Number(st.toFixed(3)),
        end: Number((st + beatSec * 0.35).toFixed(3)),
        duration: Number((beatSec * 0.35).toFixed(3)),
        track: 1,
        hand: "R",
      });
    }

    // Cadence Bar: 3 notes LH, 3 notes RH
    const cadStart = strideStart + 4 * beatSec;
    const cadDur = Number((beatSec * 3.8).toFixed(3));
    [36, 43, 48].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 64,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 0,
        hand: "L",
      });
    });
    [64, 67, 72].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 88,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 1,
        hand: "R",
      });
    });

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Ragtime Stride Oom-Pah)",
      "Right Hand (Syncopated Ragtime Melody)"
    );
  }

  // 9. Merry-Go-Round of Life (Joe Hisaishi)
  if (
    normId === "merrygoroundoflife" ||
    normId === "hisaishimerrygoround" ||
    normId === "howlsmovingcastle" ||
    normId.includes("merrygoround")
  ) {
    const bpm = 140;
    const beatSec = 60 / bpm;
    const notes: Note[] = [];
    let noteId = 1;

    // 6 Bars in 3/4 Viennese Waltz + Cadence
    const waltzBars = [
      { bass: 43, ch: [58, 62], mel: [67] },             // Gm:   G2, Bb3+D4, G4
      { bass: 43, ch: [58, 62], mel: [70, 74, 79] },     // Gm:   G2, Bb3+D4, Bb4-D5-G5
      { bass: 38, ch: [57, 60, 66], mel: [78, 79] },     // D7:   D2, A3+C4+F#4, F#5-G5
      { bass: 43, ch: [58, 62], mel: [74] },             // Gm:   G2, Bb3+D4, D5
      { bass: 39, ch: [55, 58, 63], mel: [75, 74, 72] }, // Eb:   Eb2, G3+Bb3+Eb4, Eb5-D5-C5
      { bass: 36, ch: [55, 58, 60], mel: [72, 70, 69] }, // Cm:   C2, G3+Bb3+C4, C5-Bb4-A4
    ];

    for (let bar = 0; bar < 6; bar++) {
      const bStart = bar * 3 * beatSec;
      const wData = waltzBars[bar];

      // LH Bass on Beat 0
      notes.push({
        id: noteId++,
        pitch: wData.bass,
        name: pitchToName(wData.bass),
        velocity: 60,
        start: Number(bStart.toFixed(3)),
        end: Number((bStart + beatSec * 2.8).toFixed(3)),
        duration: Number((beatSec * 2.8).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // LH Chords on Beats 1 and 2
      [1, 2].forEach((beat) => {
        wData.ch.forEach((cp) => {
          notes.push({
            id: noteId++,
            pitch: cp,
            name: pitchToName(cp),
            velocity: 50,
            start: Number((bStart + beat * beatSec).toFixed(3)),
            end: Number((bStart + (beat + 0.9) * beatSec).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 0,
            hand: "L",
          });
        });
      });

      // RH Singing Melody
      if (wData.mel.length === 1) {
        notes.push({
          id: noteId++,
          pitch: wData.mel[0],
          name: pitchToName(wData.mel[0]),
          velocity: 86,
          start: Number(bStart.toFixed(3)),
          end: Number((bStart + beatSec * 2.85).toFixed(3)),
          duration: Number((beatSec * 2.85).toFixed(3)),
          track: 1,
          hand: "R",
        });
      } else {
        wData.mel.forEach((mp, idx) => {
          notes.push({
            id: noteId++,
            pitch: mp,
            name: pitchToName(mp),
            velocity: 84,
            start: Number((bStart + idx * beatSec).toFixed(3)),
            end: Number((bStart + (idx + 0.9) * beatSec).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 1,
            hand: "R",
          });
        });
      }
    }

    // Final Cadence Bar: 3 notes LH, 3 notes RH
    const cadStart = 6 * 3 * beatSec;
    const cadDur = Number((beatSec * 2.85).toFixed(3));
    [31, 38, 43].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 62,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 0,
        hand: "L",
      });
    });
    [58, 62, 67].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 86,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 1,
        hand: "R",
      });
    });

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Viennese Waltz Lilt & Chords)",
      "Right Hand (Romantic Cantabile Melody)"
    );
  }

  // 10. Chopin — Nocturne in E-flat Major, Op. 9 No. 2
  if (
    normId === "chopinnocturneop9no2" ||
    normId === "chopinnocturne" ||
    normId === "nocturneop9no2" ||
    normId.includes("nocturneop9no2") ||
    normId.includes("nocturneebmajor")
  ) {
    const bpm = 44; // dotted quarter tempo in 12/8 (Andante)
    const beatSec = 60 / bpm; // duration of dotted quarter note (~1.364s)
    const eighthSec = beatSec / 3; // duration of 1 eighth note (~0.455s)
    const s16 = eighthSec / 2; // duration of 1 sixteenth note (~0.227s)
    const notes: Note[] = [];
    let noteId = 1;

    // 4 Authentic measures in 12/8 + Cadence measure
    const lhBars = [
      // Bar 1: Eb - Eb - C - Bb7
      [
        { bass: 39, ch: [55, 58, 63] },
        { bass: 43, ch: [58, 63, 67] },
        { bass: 36, ch: [56, 60, 63] },
        { bass: 34, ch: [56, 62, 65] },
      ],
      // Bar 2: Eb - Eb - Bb7 - Bb7
      [
        { bass: 39, ch: [55, 58, 63] },
        { bass: 39, ch: [55, 58, 63] },
        { bass: 34, ch: [56, 62, 65] },
        { bass: 34, ch: [56, 62, 65] },
      ],
      // Bar 3: Eb - Eb7 - Ab - Fm7
      [
        { bass: 39, ch: [55, 58, 63] },
        { bass: 39, ch: [55, 58, 61] },
        { bass: 32, ch: [56, 60, 63] },
        { bass: 29, ch: [56, 60, 63] },
      ],
      // Bar 4: Bb - Bb7 - Eb - Eb
      [
        { bass: 34, ch: [55, 58, 63] },
        { bass: 34, ch: [53, 56, 62] },
        { bass: 39, ch: [55, 58, 63] },
        { bass: 39, ch: [55, 58, 63] },
      ],
    ];

    for (let bar = 0; bar < 4; bar++) {
      const bStart = bar * 4 * beatSec;
      const bData = lhBars[bar];

      for (let beat = 0; beat < 4; beat++) {
        const beatStart = bStart + beat * beatSec;
        const sub = bData[beat];

        // Bass root on 1st eighth
        notes.push({
          id: noteId++,
          pitch: sub.bass,
          name: pitchToName(sub.bass),
          velocity: 58,
          start: Number(beatStart.toFixed(3)),
          end: Number((beatStart + eighthSec * 2.8).toFixed(3)),
          duration: Number((eighthSec * 2.8).toFixed(3)),
          track: 0,
          hand: "L",
        });

        // Chords on 2nd and 3rd eighths
        [1, 2].forEach((eighthIdx) => {
          const chStart = beatStart + eighthIdx * eighthSec;
          sub.ch.forEach((cp) => {
            notes.push({
              id: noteId++,
              pitch: cp,
              name: pitchToName(cp),
              velocity: eighthIdx === 1 ? 48 : 44,
              start: Number(chStart.toFixed(3)),
              end: Number((chStart + eighthSec * 0.9).toFixed(3)),
              duration: Number((eighthSec * 0.9).toFixed(3)),
              track: 0,
              hand: "L",
            });
          });
        });
      }
    }

    // RH Cantabile Bel Canto Melody
    const b0Start = 0;
    notes.push(
      { id: noteId++, pitch: 67, name: "G4", velocity: 84, start: Number(b0Start.toFixed(3)), end: Number((b0Start + eighthSec * 2.9).toFixed(3)), duration: Number((eighthSec * 2.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 68, name: "Ab4", velocity: 80, start: Number((b0Start + eighthSec * 3).toFixed(3)), end: Number((b0Start + eighthSec * 3 + s16 * 0.95).toFixed(3)), duration: Number((s16 * 0.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 70, name: "Bb4", velocity: 82, start: Number((b0Start + eighthSec * 3 + s16).toFixed(3)), end: Number((b0Start + eighthSec * 4 * 0.95).toFixed(3)), duration: Number((s16 * 0.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 72, name: "C5", velocity: 86, start: Number((b0Start + eighthSec * 4).toFixed(3)), end: Number((b0Start + eighthSec * 4.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 70, name: "Bb4", velocity: 85, start: Number((b0Start + eighthSec * 5).toFixed(3)), end: Number((b0Start + eighthSec * 7.9).toFixed(3)), duration: Number((eighthSec * 2.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 67, name: "G4", velocity: 80, start: Number((b0Start + eighthSec * 8).toFixed(3)), end: Number((b0Start + eighthSec * 8.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 65, name: "F4", velocity: 78, start: Number((b0Start + eighthSec * 9).toFixed(3)), end: Number((b0Start + eighthSec * 9.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 63, name: "Eb4", velocity: 76, start: Number((b0Start + eighthSec * 10).toFixed(3)), end: Number((b0Start + eighthSec * 11.9).toFixed(3)), duration: Number((eighthSec * 1.9).toFixed(3)), track: 1, hand: "R" }
    );

    const b1Start = 1 * 4 * beatSec;
    notes.push(
      { id: noteId++, pitch: 65, name: "F4", velocity: 82, start: Number(b1Start.toFixed(3)), end: Number((b1Start + eighthSec * 2.9).toFixed(3)), duration: Number((eighthSec * 2.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 67, name: "G4", velocity: 80, start: Number((b1Start + eighthSec * 3).toFixed(3)), end: Number((b1Start + eighthSec * 3.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 68, name: "Ab4", velocity: 82, start: Number((b1Start + eighthSec * 4).toFixed(3)), end: Number((b1Start + eighthSec * 4.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 74, name: "D5", velocity: 86, start: Number((b1Start + eighthSec * 5).toFixed(3)), end: Number((b1Start + eighthSec * 5.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 72, name: "C5", velocity: 85, start: Number((b1Start + eighthSec * 6).toFixed(3)), end: Number((b1Start + eighthSec * 8.9).toFixed(3)), duration: Number((eighthSec * 2.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 70, name: "Bb4", velocity: 80, start: Number((b1Start + eighthSec * 9).toFixed(3)), end: Number((b1Start + eighthSec * 9.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 68, name: "Ab4", velocity: 78, start: Number((b1Start + eighthSec * 10).toFixed(3)), end: Number((b1Start + eighthSec * 10.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 65, name: "F4", velocity: 76, start: Number((b1Start + eighthSec * 11).toFixed(3)), end: Number((b1Start + eighthSec * 11.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" }
    );

    const b2Start = 2 * 4 * beatSec;
    notes.push(
      { id: noteId++, pitch: 67, name: "G4", velocity: 84, start: Number(b2Start.toFixed(3)), end: Number((b2Start + eighthSec * 2.9).toFixed(3)), duration: Number((eighthSec * 2.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 79, name: "G5", velocity: 90, start: Number((b2Start + eighthSec * 3).toFixed(3)), end: Number((b2Start + eighthSec * 5.9).toFixed(3)), duration: Number((eighthSec * 2.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 77, name: "F5", velocity: 84, start: Number((b2Start + eighthSec * 6).toFixed(3)), end: Number((b2Start + eighthSec * 6.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 75, name: "Eb5", velocity: 82, start: Number((b2Start + eighthSec * 7).toFixed(3)), end: Number((b2Start + eighthSec * 7.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 74, name: "D5", velocity: 80, start: Number((b2Start + eighthSec * 8).toFixed(3)), end: Number((b2Start + eighthSec * 8.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 72, name: "C5", velocity: 84, start: Number((b2Start + eighthSec * 9).toFixed(3)), end: Number((b2Start + eighthSec * 11.9).toFixed(3)), duration: Number((eighthSec * 2.9).toFixed(3)), track: 1, hand: "R" }
    );

    const b3Start = 3 * 4 * beatSec;
    notes.push(
      { id: noteId++, pitch: 70, name: "Bb4", velocity: 82, start: Number(b3Start.toFixed(3)), end: Number((b3Start + s16 * 0.95).toFixed(3)), duration: Number((s16 * 0.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 72, name: "C5", velocity: 84, start: Number((b3Start + s16).toFixed(3)), end: Number((b3Start + s16 * 2 * 0.95).toFixed(3)), duration: Number((s16 * 0.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 70, name: "Bb4", velocity: 80, start: Number((b3Start + s16 * 2).toFixed(3)), end: Number((b3Start + s16 * 3 * 0.95).toFixed(3)), duration: Number((s16 * 0.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 69, name: "A4", velocity: 78, start: Number((b3Start + s16 * 3).toFixed(3)), end: Number((b3Start + s16 * 4 * 0.95).toFixed(3)), duration: Number((s16 * 0.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 70, name: "Bb4", velocity: 84, start: Number((b3Start + eighthSec * 2).toFixed(3)), end: Number((b3Start + eighthSec * 3.9).toFixed(3)), duration: Number((eighthSec * 1.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 77, name: "F5", velocity: 86, start: Number((b3Start + eighthSec * 4).toFixed(3)), end: Number((b3Start + eighthSec * 5.9).toFixed(3)), duration: Number((eighthSec * 1.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 75, name: "Eb5", velocity: 84, start: Number((b3Start + eighthSec * 6).toFixed(3)), end: Number((b3Start + eighthSec * 11.9).toFixed(3)), duration: Number((eighthSec * 5.9).toFixed(3)), track: 1, hand: "R" }
    );

    const cadStart = 4 * 4 * beatSec;
    const cadDur = Number((beatSec * 3.9).toFixed(3));
    [27, 39].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 56,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 0,
        hand: "L",
      });
    });
    [55, 58, 63, 67, 75].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 78,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 1,
        hand: "R",
      });
    });

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (12/8 Waltz-like Bel Canto Bass & Chords)",
      "Right Hand (Singing Cantabile Melody with Ornamental Turns)"
    );
  }

  // 11. Chopin — Waltz in A Minor, B. 150
  if (
    normId === "chopinwaltzaminor" ||
    normId === "waltzinaminor" ||
    normId === "chopinwaltzb150" ||
    normId === "chopinwaltza" ||
    normId.includes("waltzaminor")
  ) {
    const bpm = 120;
    const beatSec = 60 / bpm; // 0.5s
    const notes: Note[] = [];
    let noteId = 1;

    const waltzBars = [
      { bass: 45, ch: [60, 64], mel: [{ p: 76, d: 2.0, t: 0 }, { p: 75, d: 0.5, t: 2.0 }, { p: 76, d: 0.5, t: 2.5 }] },
      { bass: 50, ch: [65, 69], mel: [{ p: 71, d: 1.0, t: 0 }, { p: 72, d: 1.0, t: 1.0 }, { p: 69, d: 1.0, t: 2.0 }] },
      { bass: 43, ch: [59, 65], mel: [{ p: 67, d: 2.0, t: 0 }, { p: 69, d: 1.0, t: 2.0 }] },
      { bass: 48, ch: [64, 67], mel: [{ p: 64, d: 3.0, t: 0 }] },
      { bass: 41, ch: [57, 60], mel: [{ p: 69, d: 2.0, t: 0 }, { p: 71, d: 1.0, t: 2.0 }] },
      { bass: 47, ch: [63, 69], mel: [{ p: 72, d: 2.0, t: 0 }, { p: 74, d: 1.0, t: 2.0 }] },
      { bass: 40, ch: [56, 62], mel: [{ p: 76, d: 1.0, t: 0 }, { p: 77, d: 0.5, t: 1.0 }, { p: 76, d: 0.5, t: 1.5 }, { p: 75, d: 1.0, t: 2.0 }] },
      { bass: 45, ch: [60, 64], mel: [{ p: 76, d: 2.0, t: 0 }, { p: 69, d: 1.0, t: 2.0 }] },
    ];

    for (let bar = 0; bar < 8; bar++) {
      const bStart = bar * 3 * beatSec;
      const bData = waltzBars[bar];

      notes.push({
        id: noteId++,
        pitch: bData.bass,
        name: pitchToName(bData.bass),
        velocity: 60,
        start: Number(bStart.toFixed(3)),
        end: Number((bStart + beatSec * 2.8).toFixed(3)),
        duration: Number((beatSec * 2.8).toFixed(3)),
        track: 0,
        hand: "L",
      });

      [1, 2].forEach((beat) => {
        bData.ch.forEach((cp) => {
          notes.push({
            id: noteId++,
            pitch: cp,
            name: pitchToName(cp),
            velocity: beat === 1 ? 48 : 44,
            start: Number((bStart + beat * beatSec).toFixed(3)),
            end: Number((bStart + (beat + 0.9) * beatSec).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 0,
            hand: "L",
          });
        });
      });

      bData.mel.forEach((mItem) => {
        const mOffset = (mItem.t ?? 0) * beatSec;
        const mDur = mItem.d * beatSec * 0.95;
        notes.push({
          id: noteId++,
          pitch: mItem.p,
          name: pitchToName(mItem.p),
          velocity: 84,
          start: Number((bStart + mOffset).toFixed(3)),
          end: Number((bStart + mOffset + mDur).toFixed(3)),
          duration: Number(mDur.toFixed(3)),
          track: 1,
          hand: "R",
        });
      });
    }

    const cadStart = 8 * 3 * beatSec;
    const cadDur = Number((beatSec * 2.85).toFixed(3));
    [33, 45].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 58,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 0,
        hand: "L",
      });
    });
    [57, 60, 64, 69].forEach((p) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 82,
        start: Number(cadStart.toFixed(3)),
        end: Number((cadStart + cadDur).toFixed(3)),
        duration: cadDur,
        track: 1,
        hand: "R",
      });
    });

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Authentic Bass-Chord-Chord Waltz Accompaniment)",
      "Right Hand (Melancholic Cantabile Chopin Melody with Ornaments)"
    );
  }

  // 12. Mozart — Rondo alla Turca / Turkish March
  if (
    normId === "rondoallaturca" ||
    normId === "mozartrondoallaturca" ||
    normId === "turkishmarch" ||
    normId === "mozartturkishmarch" ||
    normId.includes("rondoallaturca")
  ) {
    const bpm = 126;
    const beatSec = 60 / bpm; // ~0.476s
    const s16 = beatSec / 4; // ~0.119s
    const notes: Note[] = [];
    let noteId = 1;

    const pickupNotes = [71, 69, 68, 69];
    pickupNotes.forEach((p, idx) => {
      notes.push({
        id: noteId++,
        pitch: p,
        name: pitchToName(p),
        velocity: 78,
        start: Number((idx * s16).toFixed(3)),
        end: Number(((idx + 0.95) * s16).toFixed(3)),
        duration: Number((0.95 * s16).toFixed(3)),
        track: 1,
        hand: "R",
      });
    });

    const baseOffset = 4 * s16;

    for (let bar = 0; bar < 8; bar++) {
      const bStart = baseOffset + bar * 2 * beatSec;

      if (bar < 4) {
        const bassPitch = bar % 2 === 0 ? 45 : 40;
        notes.push({
          id: noteId++,
          pitch: bassPitch,
          name: pitchToName(bassPitch),
          velocity: 64,
          start: Number(bStart.toFixed(3)),
          end: Number((bStart + beatSec * 0.45).toFixed(3)),
          duration: Number((beatSec * 0.45).toFixed(3)),
          track: 0,
          hand: "L",
        });
        [60, 64].forEach((cp) => {
          notes.push({
            id: noteId++,
            pitch: cp,
            name: pitchToName(cp),
            velocity: 52,
            start: Number((bStart + beatSec * 0.5).toFixed(3)),
            end: Number((bStart + beatSec * 0.95).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 0,
            hand: "L",
          });
          notes.push({
            id: noteId++,
            pitch: cp,
            name: pitchToName(cp),
            velocity: 50,
            start: Number((bStart + beatSec * 1.5).toFixed(3)),
            end: Number((bStart + beatSec * 1.95).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 0,
            hand: "L",
          });
        });
      } else {
        [33, 45].forEach((p) => {
          notes.push({
            id: noteId++,
            pitch: p,
            name: pitchToName(p),
            velocity: 70,
            start: Number(bStart.toFixed(3)),
            end: Number((bStart + beatSec * 0.45).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 0,
            hand: "L",
          });
          notes.push({
            id: noteId++,
            pitch: p,
            name: pitchToName(p),
            velocity: 68,
            start: Number((bStart + beatSec).toFixed(3)),
            end: Number((bStart + beatSec * 1.45).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 0,
            hand: "L",
          });
        });
      }
    }

    const bar0Start = baseOffset;
    notes.push({ id: noteId++, pitch: 72, name: "C5", velocity: 84, start: Number(bar0Start.toFixed(3)), end: Number((bar0Start + beatSec * 0.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" });
    [74, 72, 71, 72].forEach((p, idx) => {
      const st = bar0Start + beatSec + idx * s16;
      notes.push({ id: noteId++, pitch: p, name: pitchToName(p), velocity: 82, start: Number(st.toFixed(3)), end: Number((st + s16 * 0.95).toFixed(3)), duration: Number((s16 * 0.95).toFixed(3)), track: 1, hand: "R" });
    });

    const bar1Start = baseOffset + 2 * beatSec;
    notes.push({ id: noteId++, pitch: 76, name: "E5", velocity: 86, start: Number(bar1Start.toFixed(3)), end: Number((bar1Start + beatSec * 0.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" });
    [77, 76, 75, 76].forEach((p, idx) => {
      const st = bar1Start + beatSec + idx * s16;
      notes.push({ id: noteId++, pitch: p, name: pitchToName(p), velocity: 84, start: Number(st.toFixed(3)), end: Number((st + s16 * 0.95).toFixed(3)), duration: Number((s16 * 0.95).toFixed(3)), track: 1, hand: "R" });
    });

    const bar2Start = baseOffset + 4 * beatSec;
    [83, 81, 80, 81, 83, 81, 80, 81].forEach((p, idx) => {
      const st = bar2Start + idx * s16;
      notes.push({ id: noteId++, pitch: p, name: pitchToName(p), velocity: 86, start: Number(st.toFixed(3)), end: Number((st + s16 * 0.95).toFixed(3)), duration: Number((s16 * 0.95).toFixed(3)), track: 1, hand: "R" });
    });

    const bar3Start = baseOffset + 6 * beatSec;
    notes.push(
      { id: noteId++, pitch: 84, name: "C6", velocity: 88, start: Number(bar3Start.toFixed(3)), end: Number((bar3Start + beatSec * 0.45).toFixed(3)), duration: Number((beatSec * 0.45).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 83, name: "B5", velocity: 84, start: Number((bar3Start + beatSec * 0.5).toFixed(3)), end: Number((bar3Start + beatSec * 0.95).toFixed(3)), duration: Number((beatSec * 0.45).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 81, name: "A5", velocity: 86, start: Number((bar3Start + beatSec).toFixed(3)), end: Number((bar3Start + beatSec * 1.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" }
    );

    const bar4Start = baseOffset + 8 * beatSec;
    for (let f = 0; f < 4; f++) {
      const fStart = bar4Start + f * 2 * beatSec;
      const chords = f === 0 ? [73, 76, 81] : f === 1 ? [74, 78, 81] : f === 2 ? [71, 76, 80] : [73, 76, 81];
      [0, 1].forEach((hit) => {
        chords.forEach((cp) => {
          notes.push({
            id: noteId++,
            pitch: cp,
            name: pitchToName(cp),
            velocity: 88,
            start: Number((fStart + hit * beatSec).toFixed(3)),
            end: Number((fStart + (hit + 0.45) * beatSec).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 1,
            hand: "R",
          });
        });
      });
    }

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Authentic Broken Chord Turkish March Accompaniment)",
      "Right Hand (Iconic 16th Note Runs & A Major Martial Fanfare)"
    );
  }

  // 13. Beethoven — Ode to Joy (Symphony No. 9)
  if (normId === "odetojoy" || normId === "beethovenodetojoy" || normId.includes("odetojoy")) {
    const bpm = 112;
    const beatSec = 60 / bpm;
    const notes: Note[] = [];
    let noteId = 1;

    const melody = [
      [66, 66, 67, 69],
      [69, 67, 66, 64],
      [62, 62, 64, 66],
      [66, 64, 64],
      [66, 66, 67, 69],
      [69, 67, 66, 64],
      [62, 62, 64, 66],
      [64, 62, 62],
    ];

    const lhProgression = [
      { bass: 50, ch: [54, 57] },
      { bass: 45, ch: [52, 57] },
      { bass: 43, ch: [50, 54] },
      { bass: 45, ch: [49, 52, 57] },
      { bass: 50, ch: [54, 57] },
      { bass: 45, ch: [52, 57] },
      { bass: 43, ch: [50, 54] },
      { bass: 50, ch: [54, 57, 62] },
    ];

    for (let bar = 0; bar < 8; bar++) {
      const bStart = bar * 4 * beatSec;
      const lh = lhProgression[bar];

      notes.push({
        id: noteId++,
        pitch: lh.bass,
        name: pitchToName(lh.bass),
        velocity: 64,
        start: Number(bStart.toFixed(3)),
        end: Number((bStart + beatSec * 3.8).toFixed(3)),
        duration: Number((beatSec * 3.8).toFixed(3)),
        track: 0,
        hand: "L",
      });

      [1, 2].forEach((beat) => {
        lh.ch.forEach((cp) => {
          notes.push({
            id: noteId++,
            pitch: cp,
            name: pitchToName(cp),
            velocity: 52,
            start: Number((bStart + beat * beatSec).toFixed(3)),
            end: Number((bStart + (beat + 0.9) * beatSec).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 0,
            hand: "L",
          });
        });
      });

      const mel = melody[bar];
      if (bar === 3) {
        notes.push(
          { id: noteId++, pitch: mel[0], name: pitchToName(mel[0]), velocity: 84, start: Number(bStart.toFixed(3)), end: Number((bStart + beatSec * 1.45).toFixed(3)), duration: Number((beatSec * 1.45).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: mel[1], name: pitchToName(mel[1]), velocity: 80, start: Number((bStart + beatSec * 1.5).toFixed(3)), end: Number((bStart + beatSec * 1.95).toFixed(3)), duration: Number((beatSec * 0.45).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: mel[2], name: pitchToName(mel[2]), velocity: 82, start: Number((bStart + beatSec * 2).toFixed(3)), end: Number((bStart + beatSec * 3.85).toFixed(3)), duration: Number((beatSec * 1.85).toFixed(3)), track: 1, hand: "R" }
        );
      } else if (bar === 7) {
        notes.push(
          { id: noteId++, pitch: mel[0], name: pitchToName(mel[0]), velocity: 84, start: Number(bStart.toFixed(3)), end: Number((bStart + beatSec * 1.45).toFixed(3)), duration: Number((beatSec * 1.45).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: mel[1], name: pitchToName(mel[1]), velocity: 80, start: Number((bStart + beatSec * 1.5).toFixed(3)), end: Number((bStart + beatSec * 1.95).toFixed(3)), duration: Number((beatSec * 0.45).toFixed(3)), track: 1, hand: "R" },
          { id: noteId++, pitch: mel[2], name: pitchToName(mel[2]), velocity: 86, start: Number((bStart + beatSec * 2).toFixed(3)), end: Number((bStart + beatSec * 3.85).toFixed(3)), duration: Number((beatSec * 1.85).toFixed(3)), track: 1, hand: "R" }
        );
      } else {
        mel.forEach((p, idx) => {
          notes.push({
            id: noteId++,
            pitch: p,
            name: pitchToName(p),
            velocity: 84,
            start: Number((bStart + idx * beatSec).toFixed(3)),
            end: Number((bStart + (idx + 0.95) * beatSec).toFixed(3)),
            duration: Number((beatSec * 0.95).toFixed(3)),
            track: 1,
            hand: "R",
          });
        });
      }
    }

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Cantabile Polyphonic Bass & Harmony)",
      "Right Hand (Beethoven's Timeless Hymn to Joy)"
    );
  }

  // 14. J.S. Bach — Minuet in G Major, BWV Anh. 114
  if (
    normId === "bachminueting" ||
    normId === "minueting" ||
    normId === "minuetingmajor" ||
    normId === "bachminuetingmajor" ||
    normId.includes("minueting")
  ) {
    const bpm = 120;
    const beatSec = 60 / bpm; // 0.5s
    const notes: Note[] = [];
    let noteId = 1;

    const bachBars = [
      {
        rh: [{ p: 74, d: 1.0, t: 0 }, { p: 67, d: 0.5, t: 1.0 }, { p: 69, d: 0.5, t: 1.5 }, { p: 71, d: 0.5, t: 2.0 }, { p: 72, d: 0.5, t: 2.5 }],
        lh: [{ p: 55, d: 2.8, t: 0 }],
      },
      {
        rh: [{ p: 74, d: 1.0, t: 0 }, { p: 67, d: 1.0, t: 1.0 }, { p: 67, d: 1.0, t: 2.0 }],
        lh: [{ p: 59, d: 0.9, t: 0 }, { p: 57, d: 0.9, t: 1.0 }, { p: 55, d: 0.9, t: 2.0 }],
      },
      {
        rh: [{ p: 76, d: 1.0, t: 0 }, { p: 72, d: 0.5, t: 1.0 }, { p: 74, d: 0.5, t: 1.5 }, { p: 76, d: 0.5, t: 2.0 }, { p: 78, d: 0.5, t: 2.5 }],
        lh: [{ p: 60, d: 2.8, t: 0 }],
      },
      {
        rh: [{ p: 79, d: 1.0, t: 0 }, { p: 67, d: 1.0, t: 1.0 }, { p: 67, d: 1.0, t: 2.0 }],
        lh: [{ p: 59, d: 2.8, t: 0 }],
      },
      {
        rh: [{ p: 72, d: 0.5, t: 0 }, { p: 74, d: 0.5, t: 0.5 }, { p: 72, d: 0.5, t: 1.0 }, { p: 71, d: 0.5, t: 1.5 }, { p: 69, d: 1.0, t: 2.0 }],
        lh: [{ p: 57, d: 2.8, t: 0 }],
      },
      {
        rh: [{ p: 71, d: 0.5, t: 0 }, { p: 72, d: 0.5, t: 0.5 }, { p: 71, d: 0.5, t: 1.0 }, { p: 69, d: 0.5, t: 1.5 }, { p: 67, d: 1.0, t: 2.0 }],
        lh: [{ p: 55, d: 2.8, t: 0 }],
      },
      {
        rh: [{ p: 66, d: 0.5, t: 0 }, { p: 67, d: 0.5, t: 0.5 }, { p: 69, d: 0.5, t: 1.0 }, { p: 71, d: 0.5, t: 1.5 }, { p: 67, d: 1.0, t: 2.0 }],
        lh: [{ p: 50, d: 2.8, t: 0 }],
      },
      {
        rh: [{ p: 69, d: 2.0, t: 0 }, { p: 62, d: 1.0, t: 2.0 }],
        lh: [{ p: 50, d: 1.0, t: 0 }, { p: 48, d: 1.0, t: 1.0 }, { p: 47, d: 0.5, t: 2.0 }, { p: 45, d: 0.5, t: 2.5 }],
      },
    ];

    for (let bar = 0; bar < 8; bar++) {
      const bStart = bar * 3 * beatSec;
      const bData = bachBars[bar];

      bData.lh.forEach((item) => {
        const st = bStart + item.t * beatSec;
        const dur = item.d * beatSec;
        notes.push({
          id: noteId++,
          pitch: item.p,
          name: pitchToName(item.p),
          velocity: 64,
          start: Number(st.toFixed(3)),
          end: Number((st + dur).toFixed(3)),
          duration: Number(dur.toFixed(3)),
          track: 0,
          hand: "L",
        });
      });

      bData.rh.forEach((item) => {
        const st = bStart + item.t * beatSec;
        const dur = item.d * beatSec * 0.95;
        notes.push({
          id: noteId++,
          pitch: item.p,
          name: pitchToName(item.p),
          velocity: 82,
          start: Number(st.toFixed(3)),
          end: Number((st + dur).toFixed(3)),
          duration: Number(dur.toFixed(3)),
          track: 1,
          hand: "R",
        });
      });
    }

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Authentic Baroque Basso Continuo Counterpoint)",
      "Right Hand (Bach's Iconic Minuet Dialogue Line)"
    );
  }

  // 15. Joe Hisaishi — One Summer's Day (Spirited Away)
  if (
    normId === "onesummersday" ||
    normId === "onesummerday" ||
    normId === "spiritedawayonesummersday" ||
    normId === "hisaishionesummersday" ||
    normId.includes("onesummer")
  ) {
    const bpm = 80;
    const beatSec = 60 / bpm; // 0.75s
    const notes: Note[] = [];
    let noteId = 1;

    const ghibliBars = [
      {
        lh: [36, 43, 52, 55, 60],
        rh: [{ p: 62, d: 0.5, t: 0 }, { p: 64, d: 0.5, t: 0.5 }, { p: 67, d: 1.0, t: 1.0 }, { p: 69, d: 1.0, t: 2.0 }, { p: 72, d: 1.0, t: 3.0 }],
      },
      {
        lh: [41, 48, 57, 60, 65],
        rh: [{ p: 71, d: 3.0, t: 0 }, { p: 69, d: 0.5, t: 3.0 }, { p: 67, d: 0.5, t: 3.5 }],
      },
      {
        lh: [43, 50, 59, 62, 67],
        rh: [{ p: 64, d: 2.0, t: 0 }, { p: 62, d: 1.0, t: 2.0 }, { p: 60, d: 1.0, t: 3.0 }],
      },
      {
        lh: [45, 52, 60, 64],
        rh: [{ p: 62, d: 3.0, t: 0 }, { p: 64, d: 1.0, t: 3.0 }],
      },
      {
        lh: [41, 48, 57, 60],
        rh: [{ p: 67, d: 1.0, t: 0 }, { p: 69, d: 1.0, t: 1.0 }, { p: 72, d: 1.0, t: 2.0 }, { p: 74, d: 1.0, t: 3.0 }],
      },
      {
        lh: [43, 50, 59, 62],
        rh: [{ p: 76, d: 3.0, t: 0 }, { p: 74, d: 1.0, t: 3.0 }],
      },
      {
        lh: [40, 47, 55, 59],
        rh: [{ p: 72, d: 2.0, t: 0 }, { p: 74, d: 1.0, t: 2.0 }, { p: 76, d: 1.0, t: 3.0 }],
      },
      {
        lh: [36, 43, 48, 52, 55],
        rh: [{ p: 72, d: 3.8, t: 0 }],
      },
    ];

    for (let bar = 0; bar < 8; bar++) {
      const bStart = bar * 4 * beatSec;
      const bData = ghibliBars[bar];

      const stepTime = (beatSec * 4) / bData.lh.length;
      bData.lh.forEach((lp, sIdx) => {
        const st = bStart + sIdx * stepTime;
        notes.push({
          id: noteId++,
          pitch: lp,
          name: pitchToName(lp),
          velocity: sIdx === 0 ? 62 : 52,
          start: Number(st.toFixed(3)),
          end: Number((st + stepTime * 1.5).toFixed(3)),
          duration: Number((stepTime * 1.5).toFixed(3)),
          track: 0,
          hand: "L",
        });
      });

      bData.rh.forEach((item) => {
        const st = bStart + item.t * beatSec;
        const dur = item.d * beatSec * 0.95;
        notes.push({
          id: noteId++,
          pitch: item.p,
          name: pitchToName(item.p),
          velocity: 84,
          start: Number(st.toFixed(3)),
          end: Number((st + dur).toFixed(3)),
          duration: Number(dur.toFixed(3)),
          track: 1,
          hand: "R",
        });
      });
    }

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Nostalgic Rolling Ghibli Arpeggios)",
      "Right Hand (Iconic Spirited Away Pentatonic Piano Theme)"
    );
  }

  // 16. Yiruma — Kiss the Rain
  if (
    normId === "kisstherain" ||
    normId === "yirumakisstherain" ||
    normId.includes("kisstherain")
  ) {
    const bpm = 68;
    const beatSec = 60 / bpm; // ~0.882s
    const notes: Note[] = [];
    let noteId = 1;

    const yirumaBars = [
      {
        lh: [32, 39, 48, 51, 56],
        rh: [{ p: 72, d: 1.0, t: 0 }, { p: 70, d: 0.5, t: 1.0 }, { p: 68, d: 0.5, t: 1.5 }, { p: 70, d: 1.0, t: 2.0 }, { p: 72, d: 1.0, t: 3.0 }],
      },
      {
        lh: [37, 44, 53, 56, 61],
        rh: [{ p: 75, d: 1.5, t: 0 }, { p: 73, d: 0.5, t: 1.5 }, { p: 72, d: 2.0, t: 2.0 }],
      },
      {
        lh: [34, 41, 49, 53],
        rh: [{ p: 70, d: 1.0, t: 0 }, { p: 68, d: 0.5, t: 1.0 }, { p: 67, d: 0.5, t: 1.5 }, { p: 68, d: 1.0, t: 2.0 }, { p: 70, d: 1.0, t: 3.0 }],
      },
      {
        lh: [39, 46, 55, 58],
        rh: [{ p: 72, d: 1.5, t: 0 }, { p: 70, d: 0.5, t: 1.5 }, { p: 70, d: 2.0, t: 2.0 }],
      },
      {
        lh: [29, 36, 44, 48],
        rh: [{ p: 72, d: 1.0, t: 0 }, { p: 70, d: 0.5, t: 1.0 }, { p: 68, d: 0.5, t: 1.5 }, { p: 70, d: 1.0, t: 2.0 }, { p: 72, d: 1.0, t: 3.0 }],
      },
      {
        lh: [37, 44, 53, 56],
        rh: [{ p: 77, d: 1.5, t: 0 }, { p: 75, d: 0.5, t: 1.5 }, { p: 73, d: 1.0, t: 2.0 }, { p: 72, d: 1.0, t: 3.0 }],
      },
      {
        lh: [39, 46, 51, 55],
        rh: [{ p: 70, d: 2.0, t: 0 }, { p: 72, d: 1.0, t: 2.0 }, { p: 70, d: 1.0, t: 3.0 }],
      },
      {
        lh: [32, 39, 44, 48, 56],
        rh: [{ p: 68, d: 3.8, t: 0 }],
      },
    ];

    for (let bar = 0; bar < 8; bar++) {
      const bStart = bar * 4 * beatSec;
      const bData = yirumaBars[bar];

      const stepTime = (beatSec * 4) / bData.lh.length;
      bData.lh.forEach((lp, sIdx) => {
        const st = bStart + sIdx * stepTime;
        notes.push({
          id: noteId++,
          pitch: lp,
          name: pitchToName(lp),
          velocity: sIdx === 0 ? 60 : 50,
          start: Number(st.toFixed(3)),
          end: Number((st + stepTime * 1.5).toFixed(3)),
          duration: Number((stepTime * 1.5).toFixed(3)),
          track: 0,
          hand: "L",
        });
      });

      bData.rh.forEach((item) => {
        const st = bStart + item.t * beatSec;
        const dur = item.d * beatSec * 0.95;
        notes.push({
          id: noteId++,
          pitch: item.p,
          name: pitchToName(item.p),
          velocity: 84,
          start: Number(st.toFixed(3)),
          end: Number((st + dur).toFixed(3)),
          duration: Number(dur.toFixed(3)),
          track: 1,
          hand: "R",
        });
      });
    }

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Warm Lyrical 10th Ballad Arpeggios)",
      "Right Hand (Yiruma's Iconic Raindrop Ballad Melody)"
    );
  }

  // 17. Bart Howard / Frank Sinatra — Fly Me to the Moon
  if (
    normId === "flymetothemoon" ||
    normId === "flymetothemoonjazz" ||
    normId === "flymetothemoonevangelion" ||
    normId === "sinatraflymetothemoon" ||
    normId.includes("flymetothemoon")
  ) {
    const bpm = 118;
    const beatSec = 60 / bpm; // 0.5085s
    const notes: Note[] = [];
    let noteId = 1;

    const jazzBars = [
      { bass: 45, ch: [55, 60, 64], rh: [72, 71, 69, 67] },
      { bass: 50, ch: [53, 60, 64], rh: [{ p: 65, d: 2.0, t: 0 }, { p: 67, d: 1.0, t: 2.0 }, { p: 69, d: 1.0, t: 3.0 }] },
      { bass: 43, ch: [53, 59, 62], rh: [72, 71, 69, 67] },
      { bass: 48, ch: [52, 59, 62], rh: [{ p: 65, d: 2.0, t: 0 }, { p: 64, d: 2.0, t: 2.0 }] },
      { bass: 41, ch: [52, 57, 60], rh: [{ p: 62, d: 2.0, t: 0 }, { p: 64, d: 1.0, t: 2.0 }, { p: 65, d: 1.0, t: 3.0 }] },
      { bass: 47, ch: [50, 57, 62], rh: [69, 68, 66, 65] },
      { bass: 40, ch: [50, 56, 62], rh: [{ p: 64, d: 2.0, t: 0 }, { p: 65, d: 1.0, t: 2.0 }, { p: 62, d: 1.0, t: 3.0 }] },
      { bass: 45, ch: [55, 60, 64], rh: [{ p: 60, d: 3.8, t: 0 }] },
    ];

    for (let bar = 0; bar < 8; bar++) {
      const bStart = bar * 4 * beatSec;
      const bData = jazzBars[bar];

      notes.push({
        id: noteId++,
        pitch: bData.bass,
        name: pitchToName(bData.bass),
        velocity: 64,
        start: Number(bStart.toFixed(3)),
        end: Number((bStart + beatSec * 3.8).toFixed(3)),
        duration: Number((beatSec * 3.8).toFixed(3)),
        track: 0,
        hand: "L",
      });

      [1, 3].forEach((beat) => {
        bData.ch.forEach((cp) => {
          notes.push({
            id: noteId++,
            pitch: cp,
            name: pitchToName(cp),
            velocity: 52,
            start: Number((bStart + beat * beatSec).toFixed(3)),
            end: Number((bStart + (beat + 0.9) * beatSec).toFixed(3)),
            duration: Number((beatSec * 0.9).toFixed(3)),
            track: 0,
            hand: "L",
          });
        });
      });

      if (Array.isArray(bData.rh) && typeof bData.rh[0] === "number") {
        (bData.rh as number[]).forEach((p, idx) => {
          notes.push({
            id: noteId++,
            pitch: p,
            name: pitchToName(p),
            velocity: 84,
            start: Number((bStart + idx * beatSec).toFixed(3)),
            end: Number((bStart + (idx + 0.95) * beatSec).toFixed(3)),
            duration: Number((beatSec * 0.95).toFixed(3)),
            track: 1,
            hand: "R",
          });
        });
      } else {
        (bData.rh as { p: number; d: number; t: number }[]).forEach((item) => {
          const st = bStart + item.t * beatSec;
          const dur = item.d * beatSec * 0.95;
          notes.push({
            id: noteId++,
            pitch: item.p,
            name: pitchToName(item.p),
            velocity: 84,
            start: Number(st.toFixed(3)),
            end: Number((st + dur).toFixed(3)),
            duration: Number(dur.toFixed(3)),
            track: 1,
            hand: "R",
          });
        });
      }
    }

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Jazz Walking Bass & Guide Tone Voicings)",
      "Right Hand (Iconic Sinatra Jazz Swing Melody)"
    );
  }

  // 18. Taylor Swift — Love Story
  if (
    normId === "lovestorytaylorswift" ||
    normId === "lovestory" ||
    normId === "taylorswiftlovestory" ||
    normId.includes("lovestory")
  ) {
    const bpm = 119;
    const beatSec = 60 / bpm; // 0.5042s
    const eighthSec = beatSec / 2;
    const notes: Note[] = [];
    let noteId = 1;

    const popChords = [
      { bass: 38, ch: [57, 62, 66] },
      { bass: 45, ch: [57, 61, 64] },
      { bass: 47, ch: [54, 59, 62] },
      { bass: 43, ch: [55, 59, 62] },
      { bass: 38, ch: [57, 62, 66] },
      { bass: 45, ch: [57, 61, 64] },
      { bass: 47, ch: [54, 59, 62] },
      { bass: 43, ch: [55, 59, 62] },
    ];

    for (let bar = 0; bar < 8; bar++) {
      const bStart = bar * 4 * beatSec;
      const pc = popChords[bar];

      [pc.bass, pc.bass + 12].forEach((p) => {
        notes.push({
          id: noteId++,
          pitch: p,
          name: pitchToName(p),
          velocity: 64,
          start: Number(bStart.toFixed(3)),
          end: Number((bStart + beatSec * 3.8).toFixed(3)),
          duration: Number((beatSec * 3.8).toFixed(3)),
          track: 0,
          hand: "L",
        });
      });

      [0, 1, 2, 3].forEach((beat) => {
        pc.ch.forEach((cp) => {
          notes.push({
            id: noteId++,
            pitch: cp,
            name: pitchToName(cp),
            velocity: 48,
            start: Number((bStart + beat * beatSec).toFixed(3)),
            end: Number((bStart + (beat + 0.8) * beatSec).toFixed(3)),
            duration: Number((beatSec * 0.8).toFixed(3)),
            track: 0,
            hand: "L",
          });
        });
      });
    }

    const b0Start = 0;
    [66, 69, 69, 69, 66, 64].forEach((p, idx) => {
      const st = b0Start + idx * eighthSec;
      notes.push({ id: noteId++, pitch: p, name: pitchToName(p), velocity: 84, start: Number(st.toFixed(3)), end: Number((st + eighthSec * 0.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" });
    });
    notes.push({ id: noteId++, pitch: 62, name: "D4", velocity: 84, start: Number((b0Start + 6 * eighthSec).toFixed(3)), end: Number((b0Start + 8 * eighthSec * 0.95).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" });

    const b1Start = 4 * beatSec;
    [64, 66, 66, 64].forEach((p, idx) => {
      const st = b1Start + idx * eighthSec;
      notes.push({ id: noteId++, pitch: p, name: pitchToName(p), velocity: 84, start: Number(st.toFixed(3)), end: Number((st + eighthSec * 0.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" });
    });
    notes.push({ id: noteId++, pitch: 62, name: "D4", velocity: 82, start: Number((b1Start + 4 * eighthSec).toFixed(3)), end: Number((b1Start + 8 * eighthSec * 0.95).toFixed(3)), duration: Number((beatSec * 1.95).toFixed(3)), track: 1, hand: "R" });

    const b2Start = 8 * beatSec;
    [66, 69, 69, 69, 66, 64].forEach((p, idx) => {
      const st = b2Start + idx * eighthSec;
      notes.push({ id: noteId++, pitch: p, name: pitchToName(p), velocity: 84, start: Number(st.toFixed(3)), end: Number((st + eighthSec * 0.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" });
    });
    notes.push({ id: noteId++, pitch: 62, name: "D4", velocity: 84, start: Number((b2Start + 6 * eighthSec).toFixed(3)), end: Number((b2Start + 8 * eighthSec * 0.95).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" });

    const b3Start = 12 * beatSec;
    notes.push(
      { id: noteId++, pitch: 62, name: "D4", velocity: 82, start: Number(b3Start.toFixed(3)), end: Number((b3Start + eighthSec * 0.9).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 71, name: "B4", velocity: 86, start: Number((b3Start + eighthSec).toFixed(3)), end: Number((b3Start + eighthSec * 2.9).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 69, name: "A4", velocity: 84, start: Number((b3Start + 3 * eighthSec).toFixed(3)), end: Number((b3Start + 3.9 * eighthSec).toFixed(3)), duration: Number((eighthSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 66, name: "F#4", velocity: 84, start: Number((b3Start + 4 * eighthSec).toFixed(3)), end: Number((b3Start + 8 * eighthSec * 0.95).toFixed(3)), duration: Number((beatSec * 1.95).toFixed(3)), track: 1, hand: "R" }
    );

    const b4Start = 16 * beatSec;
    [69, 69, 71, 69].forEach((p, idx) => {
      const st = b4Start + idx * beatSec;
      notes.push({ id: noteId++, pitch: p, name: pitchToName(p), velocity: 88, start: Number(st.toFixed(3)), end: Number((st + beatSec * 0.95).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" });
    });

    const b5Start = 20 * beatSec;
    notes.push(
      { id: noteId++, pitch: 66, name: "F#4", velocity: 86, start: Number(b5Start.toFixed(3)), end: Number((b5Start + beatSec * 0.95).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 64, name: "E4", velocity: 84, start: Number((b5Start + beatSec).toFixed(3)), end: Number((b5Start + beatSec * 1.95).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 62, name: "D4", velocity: 86, start: Number((b5Start + beatSec * 2).toFixed(3)), end: Number((b5Start + beatSec * 3.85).toFixed(3)), duration: Number((beatSec * 1.85).toFixed(3)), track: 1, hand: "R" }
    );

    const b6Start = 24 * beatSec;
    [66, 66, 64, 64].forEach((p, idx) => {
      const st = b6Start + idx * beatSec;
      notes.push({ id: noteId++, pitch: p, name: pitchToName(p), velocity: 84, start: Number(st.toFixed(3)), end: Number((st + beatSec * 0.95).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" });
    });

    const b7Start = 28 * beatSec;
    notes.push({ id: noteId++, pitch: 62, name: "D4", velocity: 86, start: Number(b7Start.toFixed(3)), end: Number((b7Start + beatSec * 3.85).toFixed(3)), duration: Number((beatSec * 3.85).toFixed(3)), track: 1, hand: "R" });

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Pop Ballad Piano Chords & Bass Octaves)",
      "Right Hand (Taylor Swift's Love Story Hook Melody)"
    );
  }

  // 19. Coldplay — The Scientist
  if (
    normId === "thescientistcoldplay" ||
    normId === "thescientist" ||
    normId === "coldplaythescientist" ||
    normId.includes("thescientist")
  ) {
    const bpm = 73;
    const beatSec = 60 / bpm; // ~0.822s
    const notes: Note[] = [];
    let noteId = 1;

    const coldplayBars = [
      { bass: 38, ch: [65, 69, 72] },
      { bass: 34, ch: [65, 70, 74] },
      { bass: 29, ch: [65, 69, 72] },
      { bass: 29, ch: [65, 67, 72] },
      { bass: 38, ch: [65, 69, 72] },
      { bass: 34, ch: [65, 70, 74] },
      { bass: 29, ch: [65, 69, 72] },
      { bass: 29, ch: [65, 67, 72] },
    ];

    for (let bar = 0; bar < 8; bar++) {
      const bStart = bar * 4 * beatSec;
      const cb = coldplayBars[bar];

      [cb.bass, cb.bass + 12].forEach((p) => {
        notes.push({
          id: noteId++,
          pitch: p,
          name: pitchToName(p),
          velocity: 64,
          start: Number(bStart.toFixed(3)),
          end: Number((bStart + beatSec * 3.85).toFixed(3)),
          duration: Number((beatSec * 3.85).toFixed(3)),
          track: 0,
          hand: "L",
        });
      });

      [0, 1, 1.5, 2, 3].forEach((bOffset) => {
        cb.ch.forEach((cp) => {
          notes.push({
            id: noteId++,
            pitch: cp,
            name: pitchToName(cp),
            velocity: bOffset === 1.5 ? 80 : 74,
            start: Number((bStart + bOffset * beatSec).toFixed(3)),
            end: Number((bStart + (bOffset + 0.45) * beatSec).toFixed(3)),
            duration: Number((beatSec * 0.45).toFixed(3)),
            track: 1,
            hand: "R",
          });
        });
      });
    }

    const b4Start = 4 * 4 * beatSec;
    [69, 69, 69].forEach((p, idx) => {
      notes.push({ id: noteId++, pitch: p, name: pitchToName(p), velocity: 88, start: Number((b4Start + idx * beatSec).toFixed(3)), end: Number((b4Start + (idx + 0.9) * beatSec).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" });
    });
    notes.push(
      { id: noteId++, pitch: 67, name: "G4", velocity: 84, start: Number((b4Start + 3 * beatSec).toFixed(3)), end: Number((b4Start + 3.45 * beatSec).toFixed(3)), duration: Number((beatSec * 0.45).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 65, name: "F4", velocity: 86, start: Number((b4Start + 3.5 * beatSec).toFixed(3)), end: Number((b4Start + 3.95 * beatSec).toFixed(3)), duration: Number((beatSec * 0.45).toFixed(3)), track: 1, hand: "R" }
    );

    const b5Start = 5 * 4 * beatSec;
    notes.push(
      { id: noteId++, pitch: 65, name: "F4", velocity: 84, start: Number(b5Start.toFixed(3)), end: Number((b5Start + beatSec * 0.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 67, name: "G4", velocity: 84, start: Number((b5Start + beatSec).toFixed(3)), end: Number((b5Start + beatSec * 1.45).toFixed(3)), duration: Number((beatSec * 0.45).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 65, name: "F4", velocity: 86, start: Number((b5Start + 1.5 * beatSec).toFixed(3)), end: Number((b5Start + 1.95 * beatSec).toFixed(3)), duration: Number((beatSec * 0.45).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 62, name: "D4", velocity: 84, start: Number((b5Start + 2 * beatSec).toFixed(3)), end: Number((b5Start + 3.85 * beatSec).toFixed(3)), duration: Number((beatSec * 1.85).toFixed(3)), track: 1, hand: "R" }
    );

    const b6Start = 6 * 4 * beatSec;
    notes.push({ id: noteId++, pitch: 60, name: "C4", velocity: 82, start: Number(b6Start.toFixed(3)), end: Number((b6Start + beatSec * 0.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" });
    [1, 2, 3].forEach((idx) => {
      notes.push({ id: noteId++, pitch: 65, name: "F4", velocity: 86, start: Number((b6Start + idx * beatSec).toFixed(3)), end: Number((b6Start + (idx + 0.9) * beatSec).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" });
    });

    const b7Start = 7 * 4 * beatSec;
    notes.push(
      { id: noteId++, pitch: 67, name: "G4", velocity: 86, start: Number(b7Start.toFixed(3)), end: Number((b7Start + beatSec * 0.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 65, name: "F4", velocity: 84, start: Number((b7Start + beatSec).toFixed(3)), end: Number((b7Start + beatSec * 1.9).toFixed(3)), duration: Number((beatSec * 0.9).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 65, name: "F4", velocity: 86, start: Number((b7Start + 2 * beatSec).toFixed(3)), end: Number((b7Start + 3.85 * beatSec).toFixed(3)), duration: Number((beatSec * 1.85).toFixed(3)), track: 1, hand: "R" }
    );

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Warm Acoustic Piano Bass Octaves)",
      "Right Hand (Iconic Syncopated Dm7-Bb-F Chords & Vocal Hook)"
    );
  }

  // 20. BTS — Spring Day (봄날)
  if (
    normId === "springdaybts" ||
    normId === "springday" ||
    normId === "btsspringday" ||
    normId.includes("springday")
  ) {
    const bpm = 106;
    const beatSec = 60 / bpm; // 0.566s
    const notes: Note[] = [];
    let noteId = 1;

    const btsChords = [
      { bass: 39, arpeggio: [39, 46, 55, 58, 63] },
      { bass: 43, arpeggio: [43, 50, 58, 62] },
      { bass: 44, arpeggio: [44, 51, 60, 63] },
      { bass: 46, arpeggio: [46, 53, 62, 65] },
      { bass: 36, arpeggio: [36, 43, 51, 55] },
      { bass: 43, arpeggio: [43, 50, 58, 62] },
      { bass: 44, arpeggio: [44, 51, 60, 63] },
      { bass: 46, arpeggio: [46, 53, 58, 63] },
    ];

    for (let bar = 0; bar < 8; bar++) {
      const bStart = bar * 4 * beatSec;
      const bc = btsChords[bar];

      const stepTime = (beatSec * 4) / bc.arpeggio.length;
      bc.arpeggio.forEach((lp, sIdx) => {
        const st = bStart + sIdx * stepTime;
        notes.push({
          id: noteId++,
          pitch: lp,
          name: pitchToName(lp),
          velocity: sIdx === 0 ? 64 : 52,
          start: Number(st.toFixed(3)),
          end: Number((st + stepTime * 1.5).toFixed(3)),
          duration: Number((stepTime * 1.5).toFixed(3)),
          track: 0,
          hand: "L",
        });
      });
    }

    const b0Start = 0;
    notes.push(
      { id: noteId++, pitch: 75, name: "Eb5", velocity: 84, start: Number(b0Start.toFixed(3)), end: Number((b0Start + beatSec * 0.95).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 74, name: "D5", velocity: 80, start: Number((b0Start + beatSec).toFixed(3)), end: Number((b0Start + beatSec * 1.45).toFixed(3)), duration: Number((beatSec * 0.45).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 72, name: "C5", velocity: 82, start: Number((b0Start + 1.5 * beatSec).toFixed(3)), end: Number((b0Start + 1.95 * beatSec).toFixed(3)), duration: Number((beatSec * 0.45).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 70, name: "Bb4", velocity: 84, start: Number((b0Start + 2 * beatSec).toFixed(3)), end: Number((b0Start + 3.85 * beatSec).toFixed(3)), duration: Number((beatSec * 1.85).toFixed(3)), track: 1, hand: "R" }
    );

    const b1Start = 4 * beatSec;
    notes.push(
      { id: noteId++, pitch: 70, name: "Bb4", velocity: 80, start: Number(b1Start.toFixed(3)), end: Number((b1Start + beatSec * 0.45).toFixed(3)), duration: Number((beatSec * 0.45).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 72, name: "C5", velocity: 82, start: Number((b1Start + 0.5 * beatSec).toFixed(3)), end: Number((b1Start + 0.95 * beatSec).toFixed(3)), duration: Number((beatSec * 0.45).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 74, name: "D5", velocity: 84, start: Number((b1Start + beatSec).toFixed(3)), end: Number((b1Start + beatSec * 1.95).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 67, name: "G4", velocity: 82, start: Number((b1Start + 2 * beatSec).toFixed(3)), end: Number((b1Start + 3.85 * beatSec).toFixed(3)), duration: Number((beatSec * 1.85).toFixed(3)), track: 1, hand: "R" }
    );

    const b2Start = 8 * beatSec;
    [68, 72, 75, 79].forEach((p, idx) => {
      notes.push({ id: noteId++, pitch: p, name: pitchToName(p), velocity: 84, start: Number((b2Start + idx * beatSec).toFixed(3)), end: Number((b2Start + (idx + 0.95) * beatSec).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" });
    });

    const b3Start = 12 * beatSec;
    notes.push(
      { id: noteId++, pitch: 77, name: "F5", velocity: 84, start: Number(b3Start.toFixed(3)), end: Number((b3Start + 2.85 * beatSec).toFixed(3)), duration: Number((beatSec * 2.85).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 75, name: "Eb5", velocity: 82, start: Number((b3Start + 3 * beatSec).toFixed(3)), end: Number((b3Start + 3.95 * beatSec).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" }
    );

    const b4Start = 16 * beatSec;
    notes.push(
      { id: noteId++, pitch: 75, name: "Eb5", velocity: 88, start: Number(b4Start.toFixed(3)), end: Number((b4Start + beatSec * 1.95).toFixed(3)), duration: Number((beatSec * 1.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 77, name: "F5", velocity: 84, start: Number((b4Start + 2 * beatSec).toFixed(3)), end: Number((b4Start + 2.95 * beatSec).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 79, name: "G5", velocity: 88, start: Number((b4Start + 3 * beatSec).toFixed(3)), end: Number((b4Start + 3.95 * beatSec).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" }
    );

    const b5Start = 20 * beatSec;
    notes.push(
      { id: noteId++, pitch: 79, name: "G5", velocity: 88, start: Number(b5Start.toFixed(3)), end: Number((b5Start + 1.45 * beatSec).toFixed(3)), duration: Number((beatSec * 1.45).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 77, name: "F5", velocity: 84, start: Number((b5Start + 1.5 * beatSec).toFixed(3)), end: Number((b5Start + 1.95 * beatSec).toFixed(3)), duration: Number((beatSec * 0.45).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 75, name: "Eb5", velocity: 86, start: Number((b5Start + 2 * beatSec).toFixed(3)), end: Number((b5Start + 3.85 * beatSec).toFixed(3)), duration: Number((beatSec * 1.85).toFixed(3)), track: 1, hand: "R" }
    );

    const b6Start = 24 * beatSec;
    notes.push(
      { id: noteId++, pitch: 72, name: "C5", velocity: 84, start: Number(b6Start.toFixed(3)), end: Number((b6Start + beatSec * 0.95).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 75, name: "Eb5", velocity: 86, start: Number((b6Start + beatSec).toFixed(3)), end: Number((b6Start + beatSec * 1.95).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 77, name: "F5", velocity: 86, start: Number((b6Start + 2 * beatSec).toFixed(3)), end: Number((b6Start + 2.95 * beatSec).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" },
      { id: noteId++, pitch: 75, name: "Eb5", velocity: 86, start: Number((b6Start + 3 * beatSec).toFixed(3)), end: Number((b6Start + 3.95 * beatSec).toFixed(3)), duration: Number((beatSec * 0.95).toFixed(3)), track: 1, hand: "R" }
    );

    const b7Start = 28 * beatSec;
    notes.push({ id: noteId++, pitch: 75, name: "Eb5", velocity: 88, start: Number(b7Start.toFixed(3)), end: Number((b7Start + 3.85 * beatSec).toFixed(3)), duration: Number((beatSec * 3.85).toFixed(3)), track: 1, hand: "R" });

    return createCanonicalSong(
      input,
      notes,
      "Left Hand (Warm K-Pop Ballad Arpeggios & Deep Bass)",
      "Right Hand (BTS's Iconic Bell Intro Motif & Singing Hook)"
    );
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

  // Dynamic bar count based on difficulty, meter, and hash
  let totalBars: number;
  if (input.bars) {
    totalBars = input.bars;
  } else if (isWaltz) {
    if (difficulty === "Beginner") {
      totalBars = 22 + (hash % 5) * 2;
    } else if (difficulty === "Intermediate") {
      totalBars = 34 + (hash % 7) * 2;
    } else {
      totalBars = 52 + (hash % 11) * 2;
    }
  } else {
    if (difficulty === "Beginner") {
      totalBars = 16 + (hash % 5) * 2;
    } else if (difficulty === "Intermediate") {
      totalBars = 30 + (hash % 7) * 2;
    } else {
      totalBars = 46 + (hash % 11) * 2;
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

    // ── Dynamic Hierarchy: Singing RH Melody (76-92) vs Warm Subtle LH Accompaniment (48-62) ──
    const dynamics = {
      intro: { lh: 48, rh: 76 },
      verse: { lh: 52, rh: 82 },
      chorus: { lh: 60, rh: 92 },
      bridge: { lh: 54, rh: 84 },
      outro: { lh: 48, rh: 76 },
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
    noteData,
  };
}
