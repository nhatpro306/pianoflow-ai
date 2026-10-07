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

  const accompStyle = resolveAccompanimentStyle(
    input.pattern,
    isWaltz,
    input.genre,
    difficulty,
    hash
  );

  // Multi-section musical form progressions
  const SECTION_PROGRESSIONS = {
    major: {
      intro: [0, 5, 0, 7],
      verse: [0, 7, 9, 5, 0, 7, 5, 0],
      chorus: [9, 5, 0, 7, 9, 5, 7, 0],
      bridge: [5, 0, 5, 7, 9, 7, 5, 7],
      outro: [5, 7, 0, 0],
    },
    minor: {
      intro: [0, 8, 0, 7],
      verse: [0, 8, 3, 10, 0, 8, 5, 7],
      chorus: [8, 10, 0, 3, 8, 10, 7, 0],
      bridge: [3, 7, 8, 10, 3, 5, 7, 7],
      outro: [8, 5, 7, 0],
    },
    jazz: {
      intro: [0, 9, 2, 7],
      verse: [0, 5, 2, 7, 0, 9, 2, 7],
      chorus: [5, 5, 0, 0, 2, 7, 0, 7],
      bridge: [2, 7, 9, 2, 5, 7, 0, 7],
      outro: [2, 7, 0, 0],
    },
  };

  const modeKey =
    input.genre === "Jazz & Lo-Fi"
      ? "jazz"
      : scaleType === "minor"
      ? "minor"
      : "major";

  // Melody offsets relative to tonic
  const contourOffset = hash % 5;
  const baseContour =
    scaleType === "minor"
      ? [12, 15, 14, 12, 10, 8, 7, 5, 12, 15, 17, 15, 14, 12, 11, 12, 19, 17, 15, 14, 12, 10, 8, 7]
      : [12, 16, 14, 12, 11, 9, 7, 5, 12, 14, 16, 17, 19, 16, 14, 12, 16, 19, 21, 19, 16, 14, 12, 11];

  const defaultMelody =
    input.melodyContour ??
    baseContour.slice(contourOffset).concat(baseContour.slice(0, contourOffset));

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
    let chordOffset = 0;
    if (input.chordRoots && input.chordRoots.length > 0) {
      chordOffset = input.chordRoots[bar % input.chordRoots.length] ?? 0;
    } else {
      const prog = SECTION_PROGRESSIONS[modeKey][section];
      chordOffset = prog[sectionBar % prog.length] ?? 0;
    }

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
