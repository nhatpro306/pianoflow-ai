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
  pattern?: "ballad" | "waltz" | "pop" | "arpeggio" | "cinematic" | "energetic";
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

export function createMotifSong(input: MotifSongInput): RepertoireSong {
  const { rootPitch: defaultRoot, isMinor } = getKeyRootPitch(input.key);
  const root = input.rootPitch ?? defaultRoot;
  const scaleType = input.scale ?? (isMinor ? "minor" : "major");
  const timeSig = input.time_signature ?? "4/4";
  const bpm = input.bpm;

  const thirdInterval = scaleType === "minor" || scaleType === "dorian" ? 3 : 4;
  const fifthInterval = 7;

  // Meter timing
  const isWaltz = timeSig === "3/4" || timeSig === "3/8";
  const beatsPerBar = isWaltz ? 3 : 4;
  const beatSec = (60 / bpm) * (timeSig === "3/8" ? 0.5 : 1);
  const totalBars = input.bars ?? (isWaltz ? 36 : 32);

  // Multi-section musical form progressions (32-36 bars)
  const SECTION_PROGRESSIONS = {
    major: {
      intro: [0, 5, 0, 7],
      verse: [0, 7, 9, 5, 0, 7, 5, 0],
      chorus: [9, 5, 0, 7, 9, 5, 7, 0],
      bridge: [5, 0, 5, 7, 9, 7, 5, 7],
      outro: [5, 7, 0, 0, 5, 7, 0, 0],
    },
    minor: {
      intro: [0, 8, 0, 7],
      verse: [0, 8, 3, 10, 0, 8, 5, 7],
      chorus: [8, 10, 0, 3, 8, 10, 7, 0],
      bridge: [3, 7, 8, 10, 3, 5, 7, 7],
      outro: [8, 5, 7, 0, 8, 5, 7, 0],
    },
  };

  // Melody offsets relative to chord root or tonic
  const defaultMelody =
    input.melodyContour ??
    (scaleType === "minor"
      ? [12, 15, 14, 12, 10, 8, 7, 5, 12, 15, 17, 15, 14, 12, 11, 12]
      : [12, 16, 14, 12, 11, 9, 7, 5, 12, 14, 16, 17, 19, 16, 14, 12]);

  const notes: Note[] = [];
  let noteId = 1;

  for (let bar = 0; bar < totalBars; bar++) {
    const barStart = bar * beatsPerBar * beatSec;

    // Musical section definition
    let section: "intro" | "verse" | "chorus" | "bridge" | "outro";
    let sectionBar: number;
    if (bar < 4) {
      section = "intro";
      sectionBar = bar;
    } else if (bar < 12) {
      section = "verse";
      sectionBar = bar - 4;
    } else if (bar < 20) {
      section = "chorus";
      sectionBar = bar - 12;
    } else if (bar < 28) {
      section = "bridge";
      sectionBar = bar - 20;
    } else {
      section = "outro";
      sectionBar = bar - 28;
    }

    // Chord progression
    let chordOffset = 0;
    if (input.chordRoots && input.chordRoots.length > 0) {
      chordOffset = input.chordRoots[bar % input.chordRoots.length] ?? 0;
    } else {
      const modeKey = scaleType === "minor" ? "minor" : "major";
      const prog = SECTION_PROGRESSIONS[modeKey][section];
      chordOffset = prog[sectionBar % prog.length] ?? 0;
    }

    const currentRoot = root + chordOffset;
    const bassPitch = currentRoot - 24; // Low octave for bass root
    const registerShift = section === "chorus" ? 12 : 0;

    // Velocity configurations mapped to section dynamics:
    // Intro (~65), Verse (~78), Chorus (~88), Bridge (~76), Outro (~70)
    const dynamics = {
      intro: {
        lhBass: 65,
        lhChord1: 56,
        lhChord2: 52,
        rhTriad2: 58,
        rhTriad1: 62,
        rhMelody: 68,
        rhMelody1: 65,
        rhMelody2a: 62,
        rhMelody2b: 65,
        rhMelody3a: 62,
        rhMelody3b: 65,
        rhHarm2: 58,
      },
      verse: {
        lhBass: 78,
        lhChord1: 64,
        lhChord2: 60,
        rhTriad2: 68,
        rhTriad1: 74,
        rhMelody: 86,
        rhMelody1: 80,
        rhMelody2a: 78,
        rhMelody2b: 82,
        rhMelody3a: 78,
        rhMelody3b: 82,
        rhHarm2: 70,
      },
      chorus: {
        lhBass: 88,
        lhChord1: 76,
        lhChord2: 72,
        rhTriad2: 76,
        rhTriad1: 82,
        rhMelody: 94,
        rhMelody1: 88,
        rhMelody2a: 86,
        rhMelody2b: 90,
        rhMelody3a: 86,
        rhMelody3b: 90,
        rhHarm2: 78,
      },
      bridge: {
        lhBass: 76,
        lhChord1: 62,
        lhChord2: 58,
        rhTriad2: 66,
        rhTriad1: 72,
        rhMelody: 82,
        rhMelody1: 78,
        rhMelody2a: 76,
        rhMelody2b: 80,
        rhMelody3a: 76,
        rhMelody3b: 80,
        rhHarm2: 68,
      },
      outro: {
        lhBass: 70,
        lhChord1: 58,
        lhChord2: 54,
        rhTriad2: 60,
        rhTriad1: 66,
        rhMelody: 76,
        rhMelody1: 72,
        rhMelody2a: 70,
        rhMelody2b: 74,
        rhMelody3a: 70,
        rhMelody3b: 74,
        rhHarm2: 62,
      },
    }[section];

    // Outro / Grand Cadence: Final sustaining chord in last bar
    if (bar === totalBars - 1) {
      const finalChordDur = Number((beatSec * (isWaltz ? 2.85 : 3.85)).toFixed(3));
      // LH Grand Cadence: Sustained Root + Fifth + Octave
      notes.push(
        {
          id: noteId++,
          pitch: root - 24,
          name: pitchToName(root - 24),
          velocity: 74,
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
          velocity: 68,
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
          velocity: 70,
          start: Number(barStart.toFixed(3)),
          end: Number((barStart + finalChordDur).toFixed(3)),
          duration: finalChordDur,
          track: 0,
          hand: "L",
        }
      );
      // RH Grand Cadence: Sustained Full Tonic Quad-Chord (Tonic, 3rd, 5th, Octave)
      notes.push(
        {
          id: noteId++,
          pitch: root,
          name: pitchToName(root),
          velocity: 66,
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
          velocity: 70,
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
          velocity: 72,
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
          velocity: 76,
          start: Number(barStart.toFixed(3)),
          end: Number((barStart + finalChordDur).toFixed(3)),
          duration: finalChordDur,
          track: 1,
          hand: "R",
        }
      );
      continue;
    }

    if (isWaltz) {
      // ── WALTZ PATTERN (3/4 or 3/8) across 36 bars ──
      // LH: Beat 0 = deep bass root (sustained)
      notes.push({
        id: noteId++,
        pitch: bassPitch,
        name: pitchToName(bassPitch),
        velocity: dynamics.lhBass,
        start: Number(barStart.toFixed(3)),
        end: Number((barStart + beatSec * 2.8).toFixed(3)),
        duration: Number((beatSec * 2.8).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // LH: Beat 1 = mid chord (third + fifth)
      const chordPitch1 = currentRoot - 12 + thirdInterval;
      const chordPitch2 = currentRoot - 12 + fifthInterval;
      notes.push({
        id: noteId++,
        pitch: chordPitch1,
        name: pitchToName(chordPitch1),
        velocity: dynamics.lhChord1,
        start: Number((barStart + beatSec).toFixed(3)),
        end: Number((barStart + beatSec * 1.85).toFixed(3)),
        duration: Number((beatSec * 0.85).toFixed(3)),
        track: 0,
        hand: "L",
      });
      notes.push({
        id: noteId++,
        pitch: chordPitch2,
        name: pitchToName(chordPitch2),
        velocity: dynamics.lhChord1,
        start: Number((barStart + beatSec).toFixed(3)),
        end: Number((barStart + beatSec * 1.85).toFixed(3)),
        duration: Number((beatSec * 0.85).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // LH: Beat 2 = mid chord
      notes.push({
        id: noteId++,
        pitch: chordPitch1,
        name: pitchToName(chordPitch1),
        velocity: dynamics.lhChord2,
        start: Number((barStart + beatSec * 2).toFixed(3)),
        end: Number((barStart + beatSec * 2.85).toFixed(3)),
        duration: Number((beatSec * 0.85).toFixed(3)),
        track: 0,
        hand: "L",
      });
      notes.push({
        id: noteId++,
        pitch: chordPitch2,
        name: pitchToName(chordPitch2),
        velocity: dynamics.lhChord2,
        start: Number((barStart + beatSec * 2).toFixed(3)),
        end: Number((barStart + beatSec * 2.85).toFixed(3)),
        duration: Number((beatSec * 0.85).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // RH: Beat 0 = 3-note melodic triad (ensures N_very_easy < N_easy < N_original)
      const melodyIdx = ((bar * 3) + (section === "bridge" ? 2 : 0)) % defaultMelody.length;
      const melPitch = root + registerShift + defaultMelody[melodyIdx];
      const harmPitch1 = melPitch - thirdInterval;
      const harmPitch2 = melPitch - fifthInterval;

      notes.push({
        id: noteId++,
        pitch: harmPitch2,
        name: pitchToName(harmPitch2),
        velocity: dynamics.rhTriad2,
        start: Number(barStart.toFixed(3)),
        end: Number((barStart + beatSec * 0.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      });
      notes.push({
        id: noteId++,
        pitch: harmPitch1,
        name: pitchToName(harmPitch1),
        velocity: dynamics.rhTriad1,
        start: Number(barStart.toFixed(3)),
        end: Number((barStart + beatSec * 0.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      });
      notes.push({
        id: noteId++,
        pitch: melPitch,
        name: pitchToName(melPitch),
        velocity: dynamics.rhMelody,
        start: Number(barStart.toFixed(3)),
        end: Number((barStart + beatSec * 0.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      });

      // RH: Beat 1 = cantabile melody note
      const m1 = root + registerShift + defaultMelody[(melodyIdx + 1) % defaultMelody.length];
      notes.push({
        id: noteId++,
        pitch: m1,
        name: pitchToName(m1),
        velocity: dynamics.rhMelody1,
        start: Number((barStart + beatSec).toFixed(3)),
        end: Number((barStart + beatSec * 1.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      });

      // RH: Beat 2 = two eighth melody notes (passing contour)
      const m2a = root + registerShift + defaultMelody[(melodyIdx + 2) % defaultMelody.length];
      const m2b = root + registerShift + defaultMelody[(melodyIdx + 3) % defaultMelody.length];
      notes.push({
        id: noteId++,
        pitch: m2a,
        name: pitchToName(m2a),
        velocity: dynamics.rhMelody2a,
        start: Number((barStart + beatSec * 2).toFixed(3)),
        end: Number((barStart + beatSec * 2.45).toFixed(3)),
        duration: Number((beatSec * 0.45).toFixed(3)),
        track: 1,
        hand: "R",
      });
      notes.push({
        id: noteId++,
        pitch: m2b,
        name: pitchToName(m2b),
        velocity: dynamics.rhMelody2b,
        start: Number((barStart + beatSec * 2.5).toFixed(3)),
        end: Number((barStart + beatSec * 2.95).toFixed(3)),
        duration: Number((beatSec * 0.45).toFixed(3)),
        track: 1,
        hand: "R",
      });
    } else {
      // ── 4/4 PATTERNS (BALLAD / POP / ARPEGGIO / CINEMATIC) across 32 bars ──
      // LH: Beat 0 = Bass Root
      notes.push({
        id: noteId++,
        pitch: bassPitch,
        name: pitchToName(bassPitch),
        velocity: dynamics.lhBass,
        start: Number(barStart.toFixed(3)),
        end: Number((barStart + beatSec * 1.8).toFixed(3)),
        duration: Number((beatSec * 1.8).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // LH: Beat 1 = Fifth
      const fifthPitch = currentRoot - 17;
      notes.push({
        id: noteId++,
        pitch: fifthPitch,
        name: pitchToName(fifthPitch),
        velocity: dynamics.lhChord1,
        start: Number((barStart + beatSec).toFixed(3)),
        end: Number((barStart + beatSec * 1.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // LH: Beat 2 = Octave + third
      const octPitch = currentRoot - 12;
      notes.push({
        id: noteId++,
        pitch: octPitch,
        name: pitchToName(octPitch),
        velocity: dynamics.lhChord1 + 4,
        start: Number((barStart + beatSec * 2).toFixed(3)),
        end: Number((barStart + beatSec * 3.8).toFixed(3)),
        duration: Number((beatSec * 1.8).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // LH: Beat 3 = inner arpeggio note
      const tenthPitch = currentRoot - 12 + thirdInterval;
      notes.push({
        id: noteId++,
        pitch: tenthPitch,
        name: pitchToName(tenthPitch),
        velocity: dynamics.lhChord2,
        start: Number((barStart + beatSec * 3).toFixed(3)),
        end: Number((barStart + beatSec * 3.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 0,
        hand: "L",
      });

      // RH: Beat 0 = 3-note melodic triad chord
      const melodyIdx = ((bar * 4) + (section === "bridge" ? 2 : 0)) % defaultMelody.length;
      const melPitch = root + registerShift + defaultMelody[melodyIdx];
      const harmPitch1 = melPitch - thirdInterval;
      const harmPitch2 = melPitch - fifthInterval;

      notes.push({
        id: noteId++,
        pitch: harmPitch2,
        name: pitchToName(harmPitch2),
        velocity: dynamics.rhTriad2,
        start: Number(barStart.toFixed(3)),
        end: Number((barStart + beatSec * 0.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      });
      notes.push({
        id: noteId++,
        pitch: harmPitch1,
        name: pitchToName(harmPitch1),
        velocity: dynamics.rhTriad1,
        start: Number(barStart.toFixed(3)),
        end: Number((barStart + beatSec * 0.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      });
      notes.push({
        id: noteId++,
        pitch: melPitch,
        name: pitchToName(melPitch),
        velocity: dynamics.rhMelody,
        start: Number(barStart.toFixed(3)),
        end: Number((barStart + beatSec * 0.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      });

      // RH: Beat 1 = 8th notes
      const m1a = root + registerShift + defaultMelody[(melodyIdx + 1) % defaultMelody.length];
      const m1b = root + registerShift + defaultMelody[(melodyIdx + 2) % defaultMelody.length];
      notes.push({
        id: noteId++,
        pitch: m1a,
        name: pitchToName(m1a),
        velocity: dynamics.rhMelody1,
        start: Number((barStart + beatSec).toFixed(3)),
        end: Number((barStart + beatSec * 1.45).toFixed(3)),
        duration: Number((beatSec * 0.45).toFixed(3)),
        track: 1,
        hand: "R",
      });
      notes.push({
        id: noteId++,
        pitch: m1b,
        name: pitchToName(m1b),
        velocity: dynamics.rhMelody1 + 2,
        start: Number((barStart + beatSec * 1.5).toFixed(3)),
        end: Number((barStart + beatSec * 1.95).toFixed(3)),
        duration: Number((beatSec * 0.45).toFixed(3)),
        track: 1,
        hand: "R",
      });

      // RH: Beat 2 = 2-note melody interval
      const m2 = root + registerShift + defaultMelody[(melodyIdx + 3) % defaultMelody.length];
      const h2 = m2 - 5;
      notes.push({
        id: noteId++,
        pitch: h2,
        name: pitchToName(h2),
        velocity: dynamics.rhHarm2,
        start: Number((barStart + beatSec * 2).toFixed(3)),
        end: Number((barStart + beatSec * 2.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      });
      notes.push({
        id: noteId++,
        pitch: m2,
        name: pitchToName(m2),
        velocity: dynamics.rhMelody - 2,
        start: Number((barStart + beatSec * 2).toFixed(3)),
        end: Number((barStart + beatSec * 2.9).toFixed(3)),
        duration: Number((beatSec * 0.9).toFixed(3)),
        track: 1,
        hand: "R",
      });

      // RH: Beat 3 = 8th notes leading into next bar
      const m3a = root + registerShift + defaultMelody[(melodyIdx + 4) % defaultMelody.length];
      const m3b = root + registerShift + defaultMelody[(melodyIdx + 5) % defaultMelody.length];
      notes.push({
        id: noteId++,
        pitch: m3a,
        name: pitchToName(m3a),
        velocity: dynamics.rhMelody3a,
        start: Number((barStart + beatSec * 3).toFixed(3)),
        end: Number((barStart + beatSec * 3.45).toFixed(3)),
        duration: Number((beatSec * 0.45).toFixed(3)),
        track: 1,
        hand: "R",
      });
      notes.push({
        id: noteId++,
        pitch: m3b,
        name: pitchToName(m3b),
        velocity: dynamics.rhMelody3b,
        start: Number((barStart + beatSec * 3.5).toFixed(3)),
        end: Number((barStart + beatSec * 3.95).toFixed(3)),
        duration: Number((beatSec * 0.45).toFixed(3)),
        track: 1,
        hand: "R",
      });
    }
  }

  // Sort notes chronologically and reassign IDs 1..N
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
