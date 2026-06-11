/**
 * Sustain pedal (CC64): while pedal is down (value >= 64), note releases are
 * deferred to the pedal-off moment. Pure function over unscaled note times —
 * PIANO_SOUND_SPEC.md §2. Mirrored in music-core for export (Phase 7).
 */
import type { Note, NoteData } from "@pianoflow/shared-types";

const PEDAL_DOWN = 64;

export function applySustain(data: NoteData): Note[] {
  const events = data.sustain ?? [];
  if (events.length === 0) return data.notes;

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
