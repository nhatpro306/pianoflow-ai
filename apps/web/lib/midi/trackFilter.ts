import type { Note, NoteData } from "@pianoflow/shared-types";

/** General MIDI Instrument Families (0-127) */
export type InstrumentFamily =
  | "piano" // Programs 0-7: Acoustic Grand, Bright, Electric, Honky-tonk, Rhodes, Harpsichord, Clavinet
  | "chromatic" // Programs 8-15: Celesta, Glockenspiel, Music Box, Vibraphone, Marimba, Xylophone
  | "organ" // Programs 16-23: Hammond, Percussive, Rock, Church, Reed, Accordion, Harmonica
  | "guitar" // Programs 24-31: Nylon, Steel, Jazz, Clean, Muted, Overdrive, Distortion
  | "bass" // Programs 32-39: Acoustic Bass, Finger Bass, Pick Bass, Fretless, Slap Bass, Synth Bass
  | "strings" // Programs 40-47: Violin, Viola, Cello, Contrabass, Tremolo, Pizzicato, Harp
  | "ensemble" // Programs 48-55: String Ensembles, Synth Strings, Choir Aahs, Voice Oohs, Orchestra Hit
  | "brass" // Programs 56-63: Trumpet, Trombone, Tuba, Muted Trumpet, French Horn, Brass Section
  | "reed" // Programs 64-71: Soprano Sax, Alto Sax, Tenor Sax, Baritone Sax, Oboe, Bassoon, Clarinet
  | "pipe" // Programs 72-79: Piccolo, Flute, Recorder, Pan Flute, Blown Bottle, Shakuhachi, Whistle
  | "synth_lead" // Programs 80-87: Square, Sawtooth, Calliope, Chiff, Charang, Voice, Fifths, Bass+Lead
  | "synth_pad" // Programs 88-95: New Age, Warm, Polysynth, Choir, Bowed, Metallic, Halo, Sweep
  | "percussion" // Programs 112-119 & Channel 10: Drum Kit, Taiko, Melodic Tom, Synth Drum, Reverse Cymbal
  | "other";

export interface TrackMetadata {
  index: number;
  name: string;
  program: number; // 0-127 (General MIDI program)
  family: InstrumentFamily;
  isDrum: boolean; // Channel 10 or drum kit flag
  channel?: number; // 0-15
  noteCount: number;
  pitchMin: number; // Lowest MIDI pitch (21-108)
  pitchMax: number; // Highest MIDI pitch (21-108)
  durationSec: number; // Track active duration
  icon: string; // Emoji or icon token ("🎹", "🎸", "🎻", "🥁", "🎺", "🎷")
}

export interface TrackFilterSettings {
  selectedTrackIndices: number[]; // Set of checked track indices
  mutedTrackIndices: number[]; // Set of muted track indices
  soloTrackIndex: number | null; // Solo track index (null if none soloed)
  includeDrums: boolean; // Default false
}

/**
 * Maps General MIDI Program number (0-127) and drum status to instrument family & icon.
 */
export function getInstrumentFamily(
  program: number,
  isDrum?: boolean
): { family: InstrumentFamily; icon: string; label: string } {
  if (isDrum) {
    return { family: "percussion", icon: "🥁", label: "Drums & Percussion" };
  }
  if (program >= 0 && program <= 7) {
    const labels = [
      "Acoustic Grand Piano",
      "Bright Acoustic Piano",
      "Electric Grand Piano",
      "Honky-tonk Piano",
      "Electric Piano 1 (Rhodes)",
      "Electric Piano 2 (DX7)",
      "Harpsichord",
      "Clavinet",
    ];
    return { family: "piano", icon: "🎹", label: labels[program] || "Piano" };
  }
  if (program >= 8 && program <= 15) return { family: "chromatic", icon: "🔔", label: "Chromatic Percussion" };
  if (program >= 16 && program <= 23) return { family: "organ", icon: "🎛️", label: "Organ" };
  if (program >= 24 && program <= 31) return { family: "guitar", icon: "🎸", label: "Acoustic / Electric Guitar" };
  if (program >= 32 && program <= 39) return { family: "bass", icon: "🎸", label: "Bass" };
  if (program >= 40 && program <= 47) return { family: "strings", icon: "🎻", label: "Strings / Violin / Cello" };
  if (program >= 48 && program <= 55) return { family: "ensemble", icon: "🎼", label: "Orchestral Ensemble / Choir" };
  if (program >= 56 && program <= 63) return { family: "brass", icon: "🎺", label: "Brass / Trumpet / Horn" };
  if (program >= 64 && program <= 71) return { family: "reed", icon: "🎷", label: "Saxophone / Woodwinds" };
  if (program >= 72 && program <= 79) return { family: "pipe", icon: "🪈", label: "Flute / Pipe" };
  if (program >= 80 && program <= 87) return { family: "synth_lead", icon: "⚡", label: "Synth Lead" };
  if (program >= 88 && program <= 95) return { family: "synth_pad", icon: "🌌", label: "Synth Pad" };
  if (program >= 112 && program <= 119) return { family: "percussion", icon: "🥁", label: "Drums & Percussion" };
  return { family: "other", icon: "🎵", label: `Instrument (${program})` };
}

/**
 * Calculates complete TrackMetadata for all tracks in a NoteData payload.
 */
export function extractTrackMetadata(noteData: NoteData): TrackMetadata[] {
  const trackMap = new Map<
    number,
    {
      name: string;
      notes: Note[];
      isDrum: boolean;
      program: number;
    }
  >();

  // Populate from existing track headers if present
  if (noteData.tracks && Array.isArray(noteData.tracks)) {
    for (const t of noteData.tracks) {
      trackMap.set(t.index, {
        name: t.name || `Track ${t.index + 1}`,
        notes: [],
        isDrum: (t as unknown as { is_drum?: boolean; isDrum?: boolean }).is_drum ?? (t as unknown as { isDrum?: boolean }).isDrum ?? false,
        program: (t as unknown as { program?: number }).program ?? 0,
      });
    }
  }

  // Aggregate note statistics
  for (const n of noteData.notes) {
    const trackIdx = n.track ?? 0;
    if (!trackMap.has(trackIdx)) {
      const isDrum = (n as unknown as { isDrum?: boolean; is_drum?: boolean }).isDrum ?? (n as unknown as { is_drum?: boolean }).is_drum ?? false;
      const program = (n as unknown as { program?: number }).program ?? 0;
      trackMap.set(trackIdx, {
        name: `Track ${trackIdx + 1}`,
        notes: [],
        isDrum,
        program,
      });
    }
    trackMap.get(trackIdx)!.notes.push(n);
  }

  const result: TrackMetadata[] = [];
  for (const [index, data] of trackMap.entries()) {
    const pitches = data.notes.map((n) => n.pitch);
    const pMin = pitches.length > 0 ? Math.min(...pitches) : 60;
    const pMax = pitches.length > 0 ? Math.max(...pitches) : 60;
    const starts = data.notes.map((n) => n.start);
    const ends = data.notes.map((n) => n.end);
    const duration = ends.length > 0 ? Math.max(...ends) - Math.min(...starts) : 0;
    const { family, icon, label } = getInstrumentFamily(data.program, data.isDrum);

    result.push({
      index,
      name: data.name.startsWith("Track ") && label ? `${data.name} (${label})` : data.name || label,
      program: data.program,
      family,
      isDrum: data.isDrum,
      noteCount: data.notes.length,
      pitchMin: pMin,
      pitchMax: pMax,
      durationSec: Math.round(duration * 100) / 100,
      icon,
    });
  }

  return result.sort((a, b) => a.index - b.index);
}

/**
 * Heuristically detects primary piano / keyboard tracks to auto-suggest solo practice.
 */
export function detectPianoTracks(tracks: TrackMetadata[]): number[] {
  const pianoTracks = tracks
    .filter((t) => !t.isDrum && t.family === "piano" && t.noteCount > 0)
    .map((t) => t.index);

  if (pianoTracks.length > 0) return pianoTracks;

  // Fallback: Pick track with highest note count that is not drums
  const nonDrums = tracks.filter((t) => !t.isDrum && t.noteCount > 0);
  if (nonDrums.length > 0) {
    const sorted = [...nonDrums].sort((a, b) => b.noteCount - a.noteCount);
    return [sorted[0].index];
  }

  return tracks.map((t) => t.index);
}

/**
 * Generates default track filter settings based on available tracks (all non-drum tracks selected).
 */
export function getDefaultTrackSettings(tracks: TrackMetadata[]): TrackFilterSettings {
  const nonDrumIndices = tracks.filter((t) => !t.isDrum).map((t) => t.index);
  return {
    selectedTrackIndices: nonDrumIndices.length > 0 ? nonDrumIndices : tracks.map((t) => t.index),
    mutedTrackIndices: [],
    soloTrackIndex: null,
    includeDrums: false,
  };
}

/**
 * Pure filter function: returns a new NoteData instance containing only active notes.
 */
export function filterNotesByTracks(
  noteData: NoteData,
  settings: TrackFilterSettings
): NoteData {
  const { selectedTrackIndices, mutedTrackIndices, soloTrackIndex, includeDrums } = settings;

  // Determine active track set
  let activeTrackSet: Set<number>;
  if (soloTrackIndex !== null) {
    activeTrackSet = new Set([soloTrackIndex]);
  } else {
    activeTrackSet = new Set(
      selectedTrackIndices.filter((idx) => !mutedTrackIndices.includes(idx))
    );
  }

  const isSoloActive = soloTrackIndex !== null || activeTrackSet.size === 1;

  const filteredNotes: Note[] = [];
  for (const n of noteData.notes) {
    const tIdx = n.track ?? 0;
    if (!activeTrackSet.has(tIdx)) continue;

    // Check drums
    const isDrum = (n as unknown as { isDrum?: boolean; is_drum?: boolean }).isDrum ?? (n as unknown as { is_drum?: boolean }).is_drum ?? false;
    if (isDrum && !includeDrums) continue;

    // If a single track is isolated and original hand assignment was track-based,
    // ensure pitch split below Middle C (60) is left hand, else right hand
    let hand = n.hand;
    if (isSoloActive && (!hand || (hand !== "L" && hand !== "R"))) {
      hand = n.pitch < 60 ? "L" : "R";
    }

    filteredNotes.push({
      ...n,
      hand,
    });
  }

  return {
    ...noteData,
    notes: filteredNotes,
  };
}
