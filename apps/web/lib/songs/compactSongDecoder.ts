/**
 * PianoFlow AI — Compact Song Storage Format & Decoder
 * Provides ultra-lightweight, high-density note storage format with <15% footprint
 * of standard JSON, decoding to @pianoflow/shared-types NoteData at runtime.
 */

import type { Hand, Note, NoteData } from "@pianoflow/shared-types";

export type CompactNoteTuple = [
  pitch: number,
  startMs: number,
  durMs: number,
  velocity?: number,
  hand?: 0 | 1 | "L" | "R"
];

export interface CompactSongData {
  v: 1; // format version
  id?: string;
  t: string; // title
  a?: string; // artist / composer
  b: number; // bpm
  s?: string; // time signature (default "4/4")
  d?: number; // duration in seconds
  n: CompactNoteTuple[]; // compact note tuples
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

/**
 * Converts MIDI pitch number (e.g. 60) to standard scientific pitch notation (e.g. "C4").
 */
export function pitchToNoteName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  const name = NOTE_NAMES[((pitch % 12) + 12) % 12];
  return `${name}${octave}`;
}

/**
 * Reconstructs standard NoteData from high-density CompactSongData.
 */
export function decodeCompactSong(compact: CompactSongData): NoteData {
  const notes: Note[] = compact.n.map((tuple, index) => {
    const [pitch, startMs, durMs, vel, rawHand] = tuple;
    const start = Number((startMs / 1000).toFixed(3));
    const duration = Number((durMs / 1000).toFixed(3));
    const end = Number((start + duration).toFixed(3));
    const velocity = typeof vel === "number" ? vel : 80;

    let hand: Hand;
    if (rawHand === 0 || rawHand === "L") {
      hand = "L";
    } else if (rawHand === 1 || rawHand === "R") {
      hand = "R";
    } else {
      hand = pitch >= 60 ? "R" : "L";
    }

    return {
      id: index + 1,
      pitch,
      name: pitchToNoteName(pitch),
      velocity,
      start,
      end,
      duration,
      track: 0,
      hand,
    };
  });

  const duration_sec =
    typeof compact.d === "number"
      ? compact.d
      : notes.reduce((max, n) => (n.end > max ? n.end : max), 0);

  const lhCount = notes.filter((n) => n.hand === "L").length;
  const rhCount = notes.filter((n) => n.hand === "R").length;

  return {
    schema_version: 1,
    bpm: compact.b,
    duration_sec,
    time_signature: compact.s || "4/4",
    tracks: [
      { index: 0, name: "Left Hand", note_count: lhCount },
      { index: 1, name: "Right Hand", note_count: rhCount },
    ],
    notes,
    meta: {
      id: compact.id,
      title: compact.t,
      artist: compact.a,
    },
  };
}

/**
 * Encodes standard NoteData into high-density CompactSongData.
 */
export function encodeToCompactSong(data: NoteData, id?: string): CompactSongData {
  const songId = id ?? (data.meta?.id as string | undefined);
  const title = (data.meta?.title as string | undefined) ?? songId ?? "Untitled";
  const artist =
    (data.meta?.artist as string | undefined) ??
    (data.meta?.composer as string | undefined) ??
    "Unknown";

  const n: CompactNoteTuple[] = data.notes.map((note) => {
    const pitch = note.pitch;
    const startMs = Math.round(note.start * 1000);
    const durMs = Math.round((note.duration || (note.end - note.start)) * 1000);
    const velocity = note.velocity;
    const hand: 0 | 1 = note.hand === "L" ? 0 : 1;

    return [pitch, startMs, durMs, velocity, hand];
  });

  return {
    v: 1,
    id: songId,
    t: title,
    a: artist,
    b: Math.round(data.bpm),
    s: data.time_signature || "4/4",
    d: Number(data.duration_sec.toFixed(3)),
    n,
  };
}
