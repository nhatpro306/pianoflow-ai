import type { Note, NoteData, Hand } from "@pianoflow/shared-types";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function midiPitchToName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  const name = NOTE_NAMES[((pitch % 12) + 12) % 12];
  return `${name}${octave}`;
}

interface RawNoteOn {
  pitch: number;
  velocity: number;
  startTick: number;
  trackIndex: number;
  channel: number;
}

interface TempoEntry {
  tick: number;
  tempoUs: number; // microseconds per beat
}

/**
 * Pure TypeScript parser for Standard MIDI Files (SMF Format 0 and 1)
 * Works both in Node.js (Buffer) and Browser (Uint8Array / ArrayBuffer).
 */
export function parseMidiBytes(data: Uint8Array | ArrayBuffer): NoteData {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let pos = 0;

  function readString(len: number): string {
    let str = "";
    for (let i = 0; i < len; i++) {
      str += String.fromCharCode(bytes[pos++]);
    }
    return str;
  }

  function readUInt16(): number {
    const val = (bytes[pos] << 8) | bytes[pos + 1];
    pos += 2;
    return val;
  }

  function readUInt24(): number {
    const val = (bytes[pos] << 16) | (bytes[pos + 1] << 8) | bytes[pos + 2];
    pos += 3;
    return val;
  }

  function readUInt32(): number {
    const val =
      ((bytes[pos] << 24) >>> 0) |
      (bytes[pos + 1] << 16) |
      (bytes[pos + 2] << 8) |
      bytes[pos + 3];
    pos += 4;
    return val;
  }

  function readVarLen(): number {
    let result = 0;
    while (pos < bytes.length) {
      const b = bytes[pos++];
      result = (result << 7) | (b & 0x7f);
      if ((b & 0x80) === 0) break;
    }
    return result;
  }

  // 1. Header Chunk (MThd)
  const headerId = readString(4);
  if (headerId !== "MThd") {
    throw new Error(`Invalid MIDI file header: expected 'MThd', found '${headerId}'`);
  }

  const headerLength = readUInt32();
  readUInt16(); // format (0, 1, or 2)
  const numTracks = readUInt16();
  const timeDivision = readUInt16();

  // If header length > 6, skip extra header bytes
  if (headerLength > 6) {
    pos += headerLength - 6;
  }

  const ppq = (timeDivision & 0x8000) === 0 ? timeDivision : 480;

  // Tempo map & time signature
  const tempoMap: TempoEntry[] = [{ tick: 0, tempoUs: 500000 }]; // default 120 BPM
  let detectedTimeSig = "4/4";
  const rawNotes: {
    pitch: number;
    velocity: number;
    startTick: number;
    endTick: number;
    trackIndex: number;
    channel: number;
  }[] = [];

  // Parse each track
  for (let trackIdx = 0; trackIdx < numTracks && pos < bytes.length; trackIdx++) {
    const trackId = readString(4);
    if (trackId !== "MTrk") {
      // Skip unknown chunk
      const chunkSize = readUInt32();
      pos += chunkSize;
      continue;
    }

    const trackLength = readUInt32();
    const trackEnd = pos + trackLength;
    let currentTick = 0;
    let runningStatus = 0;
    const openNotes = new Map<number, RawNoteOn>();

    while (pos < trackEnd && pos < bytes.length) {
      const delta = readVarLen();
      currentTick += delta;

      let status = bytes[pos];
      if (status >= 0x80) {
        runningStatus = status;
        pos++;
      } else {
        status = runningStatus;
      }

      const eventType = status & 0xf0;
      const channel = status & 0x0f;

      if (eventType === 0x80) {
        // Note Off
        const pitch = bytes[pos++];
        pos++; // velocity byte ignored for Note Off
        const key = (channel << 8) | pitch;
        const open = openNotes.get(key);
        if (open) {
          rawNotes.push({
            pitch: open.pitch,
            velocity: open.velocity,
            startTick: open.startTick,
            endTick: currentTick,
            trackIndex: open.trackIndex,
            channel: open.channel,
          });
          openNotes.delete(key);
        }
      } else if (eventType === 0x90) {
        // Note On
        const pitch = bytes[pos++];
        const velocity = bytes[pos++];
        const key = (channel << 8) | pitch;

        if (velocity === 0) {
          // Note Off via velocity 0
          const open = openNotes.get(key);
          if (open) {
            rawNotes.push({
              pitch: open.pitch,
              velocity: open.velocity,
              startTick: open.startTick,
              endTick: currentTick,
              trackIndex: open.trackIndex,
              channel: open.channel,
            });
            openNotes.delete(key);
          }
        } else {
          // If already open, close old note first
          const prev = openNotes.get(key);
          if (prev) {
            rawNotes.push({
              pitch: prev.pitch,
              velocity: prev.velocity,
              startTick: prev.startTick,
              endTick: currentTick,
              trackIndex: prev.trackIndex,
              channel: prev.channel,
            });
          }
          openNotes.set(key, {
            pitch,
            velocity,
            startTick: currentTick,
            trackIndex: trackIdx,
            channel,
          });
        }
      } else if (eventType === 0xa0 || eventType === 0xb0 || eventType === 0xe0) {
        // 2-data-byte events (poly aftertouch, control change, pitch bend)
        pos += 2;
      } else if (eventType === 0xc0 || eventType === 0xd0) {
        // 1-data-byte events (program change, channel pressure)
        pos += 1;
      } else if (status === 0xff) {
        // Meta Event
        const metaType = bytes[pos++];
        const metaLen = readVarLen();

        if (metaType === 0x51 && metaLen === 3) {
          // Set Tempo
          const tempoUs = readUInt24();
          tempoMap.push({ tick: currentTick, tempoUs });
        } else if (metaType === 0x58 && metaLen >= 2) {
          // Time Signature
          const num = bytes[pos];
          const denExp = bytes[pos + 1];
          detectedTimeSig = `${num}/${Math.pow(2, denExp)}`;
          pos += metaLen;
        } else {
          pos += metaLen;
        }
      } else if (status === 0xf0 || status === 0xf7) {
        // SysEx
        const sysExLen = readVarLen();
        pos += sysExLen;
      }
    }

    // Close any unclosed notes at currentTick
    for (const open of openNotes.values()) {
      rawNotes.push({
        pitch: open.pitch,
        velocity: open.velocity,
        startTick: open.startTick,
        endTick: Math.max(currentTick, open.startTick + ppq / 2),
        trackIndex: open.trackIndex,
        channel: open.channel,
      });
    }

    // Align pos with trackEnd
    pos = trackEnd;
  }

  // Sort tempo map by tick
  tempoMap.sort((a, b) => a.tick - b.tick);

  // Helper to convert ticks to seconds
  function tickToSec(tick: number): number {
    let totalSec = 0;
    let prevTick = 0;
    let currentTempoUs = tempoMap[0]?.tempoUs ?? 500000;

    for (let i = 0; i < tempoMap.length; i++) {
      const tm = tempoMap[i];
      if (tick < tm.tick) {
        break;
      }
      const ticksInSegment = tm.tick - prevTick;
      totalSec += (ticksInSegment * (currentTempoUs / 1000000)) / ppq;
      prevTick = tm.tick;
      currentTempoUs = tm.tempoUs;
    }

    const remainingTicks = tick - prevTick;
    totalSec += (remainingTicks * (currentTempoUs / 1000000)) / ppq;
    return totalSec;
  }

  const initialBpm = Math.round(60000000 / (tempoMap[0]?.tempoUs ?? 500000));

  // Determine hand split strategy
  // Group raw notes by trackIndex
  const trackGroups = new Map<number, typeof rawNotes>();
  for (const n of rawNotes) {
    if (!trackGroups.has(n.trackIndex)) {
      trackGroups.set(n.trackIndex, []);
    }
    trackGroups.get(n.trackIndex)!.push(n);
  }

  const validTracks = Array.from(trackGroups.entries()).filter(
    ([, notes]) => notes.length > 0
  );

  let leftHandTrackIdx = -1;
  let rightHandTrackIdx = -1;

  if (validTracks.length >= 2) {
    // Determine which track is lower register vs higher register
    const averages = validTracks.map(([tIdx, notes]) => {
      const avgPitch =
        notes.reduce((acc, note) => acc + note.pitch, 0) / notes.length;
      return { tIdx, avgPitch };
    });
    averages.sort((a, b) => a.avgPitch - b.avgPitch);
    leftHandTrackIdx = averages[0].tIdx;
    rightHandTrackIdx = averages[1].tIdx;
  }

  // Convert raw notes to PianoFlow Note[]
  const finalNotes: Note[] = [];
  let noteId = 1;

  for (const rn of rawNotes) {
    const startSec = tickToSec(rn.startTick);
    const endSec = tickToSec(rn.endTick);
    const duration = Math.max(0.05, endSec - startSec);

    let hand: Hand;
    let trackOut: number;

    if (leftHandTrackIdx >= 0 && rightHandTrackIdx >= 0) {
      if (rn.trackIndex === leftHandTrackIdx) {
        hand = "L";
        trackOut = 0;
      } else if (rn.trackIndex === rightHandTrackIdx) {
        hand = "R";
        trackOut = 1;
      } else {
        hand = rn.pitch < 60 ? "L" : "R";
        trackOut = hand === "L" ? 0 : 1;
      }
    } else {
      // Single track or pitch-based split
      hand = rn.pitch < 60 ? "L" : "R";
      trackOut = hand === "L" ? 0 : 1;
    }

    finalNotes.push({
      id: noteId++,
      pitch: rn.pitch,
      name: midiPitchToName(rn.pitch),
      velocity: Math.max(20, Math.min(127, rn.velocity)),
      start: Number(startSec.toFixed(3)),
      end: Number((startSec + duration).toFixed(3)),
      duration: Number(duration.toFixed(3)),
      track: trackOut,
      hand,
    });
  }

  // Sort notes by start time, then pitch
  finalNotes.sort((a, b) => a.start - b.start || a.pitch - b.pitch);

  const durationSec =
    finalNotes.length > 0
      ? Number((Math.max(...finalNotes.map((n) => n.end)) + 1.0).toFixed(1))
      : 30;

  const lhCount = finalNotes.filter((n) => n.hand === "L").length;
  const rhCount = finalNotes.filter((n) => n.hand === "R").length;

  return {
    schema_version: 1,
    bpm: initialBpm > 0 ? initialBpm : 120,
    duration_sec: durationSec,
    time_signature: detectedTimeSig,
    tracks: [
      { index: 0, name: "Left Hand (Bass & Accompaniment)", note_count: lhCount },
      { index: 1, name: "Right Hand (Lead & Melody)", note_count: rhCount },
    ],
    notes: finalNotes,
  };
}
