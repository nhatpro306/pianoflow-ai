/**
 * Sustain pedal (CC64): while pedal is down (value >= 64), note releases are
 * deferred to the pedal-off moment. Pure function over unscaled note times —
 * PIANO_SOUND_SPEC.md §2. Mirrored in music-core for export (Phase 7).
 *
 * When no explicit CC64 sustain events exist (typical for procedural and standard MIDI),
 * applies Automatic Concert Damper Pedal Simulation so notes ring with natural resonance
 * and warmth instead of staccato cutoff.
 */
import type { Note, NoteData } from "@pianoflow/shared-types";

const PEDAL_DOWN = 64;

export type SustainMode = "original" | "assisted" | "off";

export function applyAutoSustain(data: NoteData): Note[] {
  const beatSec = 60 / Math.max(30, data.bpm || 100);

  // Map of sorted note start times per pitch to avoid note overlap
  const pitchStarts = new Map<number, number[]>();
  for (const n of data.notes) {
    let arr = pitchStarts.get(n.pitch);
    if (!arr) {
      arr = [];
      pitchStarts.set(n.pitch, arr);
    }
    arr.push(n.start);
  }
  for (const arr of pitchStarts.values()) {
    arr.sort((a, b) => a - b);
  }

  // Sorted bass note onsets (hand === "L" or track === 0, with pitch <= 52) to detect harmonic changes
  const bassOnsets: number[] = [];
  for (const n of data.notes) {
    if ((n.hand === "L" || n.track === 0) && n.pitch <= 52) {
      bassOnsets.push(n.start);
    }
  }
  bassOnsets.sort((a, b) => a - b);

  return data.notes.map((note) => {
    // Find next start of the same pitch
    const samePitchArr = pitchStarts.get(note.pitch) ?? [];
    let nextSamePitchStart = Infinity;
    for (const s of samePitchArr) {
      if (s > note.start + 0.005) {
        nextSamePitchStart = s;
        break;
      }
    }
    const maxAllowedEnd = nextSamePitchStart - 0.025;

    // Find next bass/harmony change
    let nextPedalChange = note.start + beatSec * 2.2;
    for (const b of bassOnsets) {
      if (b >= note.start + beatSec * 0.9) {
        nextPedalChange = b;
        break;
      }
    }

    const isLH = note.hand === "L" || note.track === 0;

    if (isLH) {
      const targetEnd = Math.max(note.end, Math.min(nextPedalChange - 0.02, note.start + 2.4));
      let newEnd = Math.min(maxAllowedEnd, targetEnd);
      const minDur = Math.max(note.duration || (note.end - note.start), 0.65);
      if (newEnd - note.start < minDur) {
        newEnd = Math.min(maxAllowedEnd, note.start + minDur);
      }
      newEnd = Math.max(note.end, newEnd);
      const newDur = Math.max(0.1, newEnd - note.start);
      return {
        ...note,
        end: Number(newEnd.toFixed(3)),
        duration: Number(newDur.toFixed(3)),
      };
    } else {
      const rawDur = note.duration || (note.end - note.start);
      const desiredTail = Math.max(rawDur * 1.65, Math.min(beatSec * 1.15, 0.55));
      const maxPossibleDur = Math.max(0.1, maxAllowedEnd - note.start);
      const newDur = Math.min(maxPossibleDur, desiredTail);
      const newEnd = note.start + newDur;
      return {
        ...note,
        end: Number(newEnd.toFixed(3)),
        duration: Number(newDur.toFixed(3)),
      };
    }
  });
}

export function applySustain(
  data: NoteData,
  mode: "original" | "assisted" | "off" = "original"
): Note[] {
  if (mode === "off") {
    return data.notes;
  }

  if (mode === "assisted") {
    return applyAutoSustain(data);
  }

  // mode === "original" (default):
  const events = data.sustain ?? [];
  if (events.length === 0) {
    // Return data.notes WITHOUT altering durations (honor the original MIDI/score articulation!)
    return data.notes;
  }

  // Pedal-down intervals [start, end) from the event stream.
  const intervals: { start: number; end: number }[] = [];
  let downAt: number | null = null;
  for (const event of events) {
    if (event.value >= PEDAL_DOWN && downAt === null) {
      downAt = event.time;
    } else if (event.value < PEDAL_DOWN && downAt !== null) {
      intervals.push({ start: downAt, end: event.time });
      downAt = null;
    }
  }
  if (downAt !== null) intervals.push({ start: downAt, end: data.duration_sec });

  if (intervals.length === 0) return data.notes;

  return data.notes.map((note) => {
    const interval = intervals.find((iv) => note.end >= iv.start && note.end < iv.end);
    if (!interval || interval.end <= note.end) return note;
    return { ...note, end: interval.end, duration: interval.end - note.start };
  });
}
