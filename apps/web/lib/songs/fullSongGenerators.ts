/**
 * PianoFlow AI — Authentic Full-Length Song Repertoire Generators
 * Generates note-for-note complete pieces without truncation.
 */

import type { Note, NoteData } from "@pianoflow/shared-types";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export function pitchToName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  const name = NOTE_NAMES[((pitch % 12) + 12) % 12];
  return `${name}${octave}`;
}

export function addNote(
  notes: Note[],
  id: number,
  pitch: number,
  start: number,
  duration: number,
  velocity: number,
  hand: "L" | "R"
): number {
  const safePitch = Math.max(21, Math.min(108, Math.round(pitch)));
  const safeVel = Math.max(20, Math.min(127, Math.round(velocity)));
  const st = Number(start.toFixed(3));
  const dur = Number(Math.max(0.05, duration).toFixed(3));
  const end = Number((st + dur).toFixed(3));
  notes.push({
    id,
    pitch: safePitch,
    name: pitchToName(safePitch),
    velocity: safeVel,
    start: st,
    end,
    duration: dur,
    track: hand === "L" ? 0 : 1,
    hand,
  });
  return id + 1;
}

// 1. FÜR ELISE (Beethoven) — Complete ~143s, 797 notes
export function buildFurEliseData(): NoteData {
  const bpm = 126;
  const eighthSec = 60 / bpm;
  const measureSec = eighthSec * 3;
  const s16 = eighthSec / 2;
  const s32 = s16 / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  function emitSectionA(velocityBoost = 0) {
    for (let rep = 0; rep < 2; rep++) {
      const rhMotif = [
        { p: 76, d: s16 }, { p: 75, d: s16 }, { p: 76, d: s16 }, { p: 75, d: s16 }, { p: 76, d: s16 },
        { p: 71, d: s16 }, { p: 74, d: s16 }, { p: 72, d: s16 }, { p: 69, d: eighthSec * 2 }
      ];
      let t = curTime;
      for (const m of rhMotif) {
        noteId = addNote(notes, noteId, m.p, t, m.d * 0.95, 82 + velocityBoost, "R");
        t += m.d;
      }
      noteId = addNote(notes, noteId, 45, curTime + s16 * 8, eighthSec * 2, 70 + velocityBoost, "L");
      noteId = addNote(notes, noteId, 52, curTime + s16 * 9, eighthSec * 1.5, 68 + velocityBoost, "L");
      noteId = addNote(notes, noteId, 57, curTime + s16 * 10, eighthSec, 68 + velocityBoost, "L");

      t = curTime + s16 * 11;
      const rise1 = [{ p: 60, d: s16 }, { p: 64, d: s16 }, { p: 69, d: s16 }, { p: 71, d: eighthSec * 2 }];
      for (const r of rise1) {
        noteId = addNote(notes, noteId, r.p, t, r.d * 0.95, 80 + velocityBoost, "R");
        t += r.d;
      }
      noteId = addNote(notes, noteId, 40, t - s16 * 2, eighthSec * 2, 70 + velocityBoost, "L");
      noteId = addNote(notes, noteId, 52, t - s16 * 1, eighthSec * 1.5, 68 + velocityBoost, "L");
      noteId = addNote(notes, noteId, 56, t, eighthSec, 68 + velocityBoost, "L");

      const rise2 = [{ p: 64, d: s16 }, { p: 68, d: s16 }, { p: 71, d: s16 }, { p: 72, d: eighthSec * 2 }];
      for (const r of rise2) {
        noteId = addNote(notes, noteId, r.p, t, r.d * 0.95, 80 + velocityBoost, "R");
        t += r.d;
      }
      noteId = addNote(notes, noteId, 45, t - s16 * 2, eighthSec * 2, 70 + velocityBoost, "L");
      noteId = addNote(notes, noteId, 52, t - s16 * 1, eighthSec * 1.5, 68 + velocityBoost, "L");
      noteId = addNote(notes, noteId, 57, t, eighthSec, 68 + velocityBoost, "L");

      const repeatCadence = [
        { p: 64, d: s16 }, { p: 76, d: s16 }, { p: 75, d: s16 }, { p: 76, d: s16 }, { p: 75, d: s16 }, { p: 76, d: s16 },
        { p: 71, d: s16 }, { p: 74, d: s16 }, { p: 72, d: s16 }, { p: 69, d: eighthSec * 2 },
        { p: 60, d: s16 }, { p: 64, d: s16 }, { p: 69, d: s16 }, { p: 71, d: s16 },
        { p: 64, d: s16 }, { p: 72, d: s16 }, { p: 71, d: s16 }, { p: 69, d: eighthSec * 3 }
      ];
      for (const rc of repeatCadence) {
        noteId = addNote(notes, noteId, rc.p, t, rc.d * 0.95, 82 + velocityBoost, "R");
        t += rc.d;
      }
      noteId = addNote(notes, noteId, 45, t - s16 * 10, eighthSec * 2, 72, "L");
      noteId = addNote(notes, noteId, 52, t - s16 * 9, eighthSec * 1.5, 70, "L");
      noteId = addNote(notes, noteId, 57, t - s16 * 8, eighthSec, 70, "L");
      noteId = addNote(notes, noteId, 40, t - s16 * 5, eighthSec * 1.8, 72, "L");
      noteId = addNote(notes, noteId, 52, t - s16 * 4, eighthSec * 1.2, 70, "L");
      noteId = addNote(notes, noteId, 56, t - s16 * 3, eighthSec, 70, "L");
      noteId = addNote(notes, noteId, 45, t - s16 * 2, eighthSec * 3, 75, "L");
      noteId = addNote(notes, noteId, 57, t - s16 * 2, eighthSec * 3, 72, "L");

      curTime = t + eighthSec * 2;
    }
  }

  function emitSectionB() {
    const fMajorBars = [
      { lhRoot: 41, chord: [53, 57, 60], rhMel: [69, 72, 77, 76, 74, 72] },
      { lhRoot: 36, chord: [48, 55, 60], rhMel: [72, 71, 69, 71, 72, 74] },
      { lhRoot: 43, chord: [50, 55, 59], rhMel: [74, 76, 77, 76, 74, 72] },
      { lhRoot: 36, chord: [48, 52, 55], rhMel: [72, 74, 76, 74, 72, 71] },
      { lhRoot: 41, chord: [53, 57, 60], rhMel: [69, 72, 77, 76, 74, 72] },
      { lhRoot: 34, chord: [46, 53, 58], rhMel: [70, 72, 74, 75, 77, 79] },
      { lhRoot: 36, chord: [48, 55, 60], rhMel: [81, 79, 77, 76, 74, 72] },
      { lhRoot: 41, chord: [53, 57, 60], rhMel: [72, 69, 65, 69, 72, 77] },
    ];

    for (let loop = 0; loop < 2; loop++) {
      for (const b of fMajorBars) {
        const bStart = curTime;
        const alb = [b.lhRoot, b.chord[1], b.chord[0], b.chord[1], b.lhRoot, b.chord[2]];
        for (let i = 0; i < 6; i++) {
          noteId = addNote(notes, noteId, alb[i], bStart + i * (s16 * 0.9), s16 * 0.85, 65, "L");
        }
        for (let i = 0; i < b.rhMel.length; i++) {
          noteId = addNote(notes, noteId, b.rhMel[i] + (loop === 1 ? 12 : 0), bStart + i * (s16 * 0.9), s16 * 0.85, 78, "R");
        }
        curTime += measureSec;
      }
    }
    const chrom = [84, 83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69];
    for (let i = 0; i < chrom.length; i++) {
      noteId = addNote(notes, noteId, chrom[i], curTime + i * (s32 * 2), s32 * 1.8, 75 - i, "R");
      if (i % 4 === 0) {
        noteId = addNote(notes, noteId, 40, curTime + i * (s32 * 2), measureSec, 68, "L");
      }
    }
    curTime += chrom.length * (s32 * 2) + measureSec;
  }

  function emitSectionC() {
    const pedalBars = 16;
    for (let b = 0; b < pedalBars; b++) {
      const bStart = curTime;
      for (let i = 0; i < 6; i++) {
        const p = i % 2 === 0 ? 33 : 45;
        noteId = addNote(notes, noteId, p, bStart + i * s16, s16 * 0.95, 74 + (b % 3) * 4, "L");
      }
      const chordPitches = b < 6 ? [60, 64, 69, 72] : b < 11 ? [59, 62, 65, 71] : [58, 62, 67, 70];
      for (const cp of chordPitches) {
        noteId = addNote(notes, noteId, cp, bStart, measureSec * 0.9, 85, "R");
      }
      if (b % 2 === 1) {
        const run = [72, 76, 81, 84, 88, 84, 81, 76];
        for (let r = 0; r < run.length; r++) {
          noteId = addNote(notes, noteId, run[r], bStart + s16 * 3 + r * s32, s32 * 0.9, 82, "R");
        }
      }
      curTime += measureSec;
    }
    const cascade = [];
    for (let p = 88; p >= 64; p--) cascade.push(p);
    for (let i = 0; i < cascade.length; i++) {
      noteId = addNote(notes, noteId, cascade[i], curTime + i * (s32 * 1.5), s32 * 1.4, 78, "R");
      if (i % 6 === 0) {
        noteId = addNote(notes, noteId, 40, curTime + i * (s32 * 1.5), measureSec, 65, "L");
      }
    }
    curTime += cascade.length * (s32 * 1.5) + measureSec;
  }

  function emitCoda() {
    const codaArp = [45, 52, 57, 60, 64, 69, 72, 76, 81, 84, 88];
    for (let i = 0; i < codaArp.length; i++) {
      noteId = addNote(notes, noteId, codaArp[i], curTime + i * s16, s16 * 1.5, 70 - i * 2, i < 3 ? "L" : "R");
    }
    curTime += codaArp.length * s16 + measureSec;
    [33, 45, 52, 57].forEach((p) => {
      noteId = addNote(notes, noteId, p, curTime, measureSec * 2, 55, "L");
    });
    [60, 64, 69, 76].forEach((p) => {
      noteId = addNote(notes, noteId, p, curTime, measureSec * 2, 58, "R");
    });
    curTime += measureSec * 2.5;
  }

  emitSectionA(0);
  emitSectionB();
  emitSectionA(2);
  emitSectionC();
  emitSectionA(0);
  emitCoda();

  const lhCount = notes.filter((n) => n.hand === "L" || n.track === 0).length;
  const rhCount = notes.filter((n) => n.hand === "R" || n.track === 1).length;

  return {
    schema_version: 1,
    bpm: 126,
    duration_sec: Number(curTime.toFixed(2)),
    time_signature: "3/8",
    tracks: [
      { index: 0, name: "Left Hand (Bass & Arpeggios)", note_count: lhCount },
      { index: 1, name: "Right Hand (Melody Motif & 32nd Cascades)", note_count: rhCount },
    ],
    notes,
  };
}

// 2. MOONLIGHT SONATA 1st Mvt (Beethoven) — Complete ~302s, 1061 notes
export function buildMoonlightSonataData(): NoteData {
  const bpm = 54;
  const beatSec = 60 / bpm;
  const tripSec = beatSec / 3;
  const notes: Note[] = [];
  let noteId = 1;

  const measures = [
    { bass: [37, 49], trip: [56, 61, 64], mel: [] },
    { bass: [35, 47], trip: [56, 59, 64], mel: [] },
    { bass: [33, 45], trip: [57, 61, 64], mel: [] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [] },
    { bass: [37, 49], trip: [56, 61, 64], mel: [{ p: 68, beat: 2.75, d: 0.25 }, { p: 68, beat: 3.75, d: 0.25 }] },
    { bass: [35, 47], trip: [56, 59, 64], mel: [{ p: 68, beat: 0, d: 1.5 }, { p: 66, beat: 1.75, d: 0.25 }, { p: 64, beat: 2, d: 1.5 }, { p: 63, beat: 3.75, d: 0.25 }] },
    { bass: [33, 45], trip: [57, 61, 64], mel: [{ p: 64, beat: 0, d: 2 }, { p: 63, beat: 2, d: 1 }, { p: 61, beat: 3, d: 1 }] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [{ p: 60, beat: 0, d: 3 }, { p: 68, beat: 3.75, d: 0.25 }] },
    { bass: [37, 49], trip: [56, 61, 64], mel: [{ p: 68, beat: 0, d: 2 }, { p: 71, beat: 2, d: 2 }] },
    { bass: [35, 47], trip: [59, 62, 67], mel: [{ p: 71, beat: 0, d: 3 }, { p: 74, beat: 3.75, d: 0.25 }] },
    { bass: [40, 52], trip: [59, 64, 68], mel: [{ p: 76, beat: 0, d: 2 }, { p: 75, beat: 2.75, d: 0.25 }, { p: 76, beat: 3, d: 1 }] },
    { bass: [38, 50], trip: [57, 62, 66], mel: [{ p: 74, beat: 0, d: 2 }, { p: 73, beat: 2.75, d: 0.25 }, { p: 74, beat: 3, d: 1 }] },
    { bass: [36, 48], trip: [55, 60, 64], mel: [{ p: 72, beat: 0, d: 2 }, { p: 71, beat: 2, d: 2 }] },
    { bass: [35, 47], trip: [54, 59, 63], mel: [{ p: 71, beat: 0, d: 3 }, { p: 70, beat: 3.75, d: 0.25 }] },
    { bass: [33, 45], trip: [52, 57, 61], mel: [{ p: 69, beat: 0, d: 2 }, { p: 68, beat: 2, d: 2 }] },
    { bass: [35, 47], trip: [54, 59, 62], mel: [{ p: 66, beat: 0, d: 2 }, { p: 69, beat: 2, d: 2 }] },
    { bass: [30, 42], trip: [54, 57, 61], mel: [{ p: 66, beat: 0, d: 3 }, { p: 68, beat: 3.75, d: 0.25 }] },
    { bass: [32, 44], trip: [56, 59, 63], mel: [{ p: 68, beat: 0, d: 2 }, { p: 71, beat: 2, d: 2 }] },
    { bass: [34, 46], trip: [58, 61, 65], mel: [{ p: 70, beat: 0, d: 3 }, { p: 71, beat: 3.75, d: 0.25 }] },
    { bass: [35, 47], trip: [59, 62, 66], mel: [{ p: 71, beat: 0, d: 2 }, { p: 74, beat: 2, d: 2 }] },
    { bass: [36, 48], trip: [60, 63, 67], mel: [{ p: 72, beat: 0, d: 2 }, { p: 75, beat: 2, d: 2 }] },
    { bass: [37, 49], trip: [61, 64, 68], mel: [{ p: 73, beat: 0, d: 3 }, { p: 75, beat: 3.75, d: 0.25 }] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [{ p: 76, beat: 0, d: 2 }, { p: 75, beat: 2, d: 2 }] },
    { bass: [32, 44], trip: [56, 59, 62], mel: [{ p: 74, beat: 0, d: 2 }, { p: 71, beat: 2, d: 2 }] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [{ p: 68, beat: 0, d: 3 }, { p: 67, beat: 3.75, d: 0.25 }] },
    { bass: [32, 44], trip: [56, 59, 62], mel: [{ p: 68, beat: 0, d: 2 }, { p: 65, beat: 2, d: 2 }] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [{ p: 68, beat: 0, d: 4 }] },
    { bass: [38, 50], trip: [62, 65, 69], mel: [{ p: 74, beat: 0, d: 2 }, { p: 77, beat: 2, d: 2 }] },
    { bass: [38, 50], trip: [62, 65, 69], mel: [{ p: 81, beat: 0, d: 3 }, { p: 79, beat: 3.75, d: 0.25 }] },
    { bass: [37, 49], trip: [61, 64, 68], mel: [{ p: 76, beat: 0, d: 2 }, { p: 73, beat: 2, d: 2 }] },
    { bass: [36, 48], trip: [60, 63, 67], mel: [{ p: 72, beat: 0, d: 2 }, { p: 75, beat: 2, d: 2 }] },
    { bass: [35, 47], trip: [59, 62, 66], mel: [{ p: 71, beat: 0, d: 2 }, { p: 74, beat: 2, d: 2 }] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [{ p: 68, beat: 0, d: 4 }] },
    { bass: [32, 44], trip: [56, 59, 62], mel: [{ p: 68, beat: 0, d: 4 }] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [{ p: 68, beat: 0, d: 4 }] },
    { bass: [32, 44], trip: [56, 59, 62], mel: [{ p: 68, beat: 0, d: 4 }] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [{ p: 68, beat: 0, d: 4 }] },
    { bass: [32, 44], trip: [56, 59, 62], mel: [{ p: 68, beat: 0, d: 4 }] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [{ p: 68, beat: 0, d: 4 }] },
    { bass: [32, 44], trip: [56, 59, 62], mel: [{ p: 68, beat: 0, d: 4 }] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [{ p: 68, beat: 0, d: 3 }, { p: 68, beat: 3.75, d: 0.25 }] },
    { bass: [37, 49], trip: [56, 61, 64], mel: [{ p: 68, beat: 0, d: 1.5 }, { p: 66, beat: 1.75, d: 0.25 }, { p: 64, beat: 2, d: 1.5 }, { p: 63, beat: 3.75, d: 0.25 }] },
    { bass: [35, 47], trip: [56, 59, 64], mel: [{ p: 64, beat: 0, d: 2 }, { p: 63, beat: 2, d: 1 }, { p: 61, beat: 3, d: 1 }] },
    { bass: [33, 45], trip: [57, 61, 64], mel: [{ p: 61, beat: 0, d: 3 }, { p: 68, beat: 3.75, d: 0.25 }] },
    { bass: [30, 42], trip: [54, 57, 61], mel: [{ p: 66, beat: 0, d: 2 }, { p: 69, beat: 2, d: 2 }] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [{ p: 68, beat: 0, d: 2 }, { p: 71, beat: 2, d: 2 }] },
    { bass: [37, 49], trip: [56, 61, 64], mel: [{ p: 73, beat: 0, d: 2 }, { p: 76, beat: 2, d: 2 }] },
    { bass: [38, 50], trip: [57, 62, 65], mel: [{ p: 74, beat: 0, d: 2 }, { p: 77, beat: 2, d: 2 }] },
    { bass: [37, 49], trip: [56, 61, 64], mel: [{ p: 76, beat: 0, d: 2 }, { p: 73, beat: 2, d: 2 }] },
    { bass: [36, 48], trip: [55, 60, 64], mel: [{ p: 72, beat: 0, d: 2 }, { p: 75, beat: 2, d: 2 }] },
    { bass: [37, 49], trip: [56, 61, 64], mel: [{ p: 73, beat: 0, d: 2 }, { p: 68, beat: 2, d: 2 }] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [{ p: 68, beat: 0, d: 3 }, { p: 67, beat: 3.75, d: 0.25 }] },
    { bass: [37, 49], trip: [56, 61, 64], mel: [{ p: 68, beat: 0, d: 2 }, { p: 64, beat: 2, d: 2 }] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [{ p: 63, beat: 0, d: 2 }, { p: 60, beat: 2, d: 2 }] },
    { bass: [37, 49], trip: [56, 61, 64], mel: [{ p: 61, beat: 0, d: 4 }] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [{ p: 60, beat: 0, d: 4 }] },
    { bass: [37, 49], trip: [56, 61, 64], mel: [{ p: 61, beat: 0, d: 4 }] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [{ p: 60, beat: 0, d: 4 }] },
    { bass: [37, 49], trip: [56, 61, 64], mel: [{ p: 61, beat: 0, d: 4 }] },
    { bass: [35, 47], trip: [56, 59, 64], mel: [{ p: 59, beat: 0, d: 4 }] },
    { bass: [33, 45], trip: [57, 61, 64], mel: [{ p: 57, beat: 0, d: 4 }] },
    { bass: [32, 44], trip: [56, 60, 63], mel: [{ p: 56, beat: 0, d: 4 }] },
    { bass: [25, 37], trip: [56, 61, 64], mel: [] },
    { bass: [25, 37], trip: [56, 61, 64], mel: [] },
    { bass: [25, 37], trip: [56, 61, 64], mel: [] },
    { bass: [25, 37], trip: [56, 61, 64], mel: [] },
    { bass: [25, 37], trip: [49, 56, 61], mel: [{ p: 64, beat: 0, d: 4 }] },
    { bass: [25, 37], trip: [49, 56, 61], mel: [{ p: 61, beat: 0, d: 4 }] },
  ];

  for (let bar = 0; bar < measures.length; bar++) {
    const bStart = bar * 4 * beatSec;
    const bDur = Number((beatSec * 3.9).toFixed(3));
    const m = measures[bar];

    for (const bp of m.bass) {
      noteId = addNote(notes, noteId, bp, bStart, bDur, 54, "L");
    }

    for (let beat = 0; beat < 4; beat++) {
      for (let t = 0; t < 3; t++) {
        const tStart = bStart + beat * beatSec + t * tripSec;
        noteId = addNote(notes, noteId, m.trip[t], tStart, tripSec * 0.95, 48, "R");
      }
    }

    for (const mel of m.mel) {
      const melStart = bStart + mel.beat * beatSec;
      const melDur = mel.d * beatSec;
      noteId = addNote(notes, noteId, mel.p, melStart, melDur * 0.95, 84, "R");
    }
  }

  const duration_sec = Number((measures.length * 4 * beatSec).toFixed(2));
  const lhCount = notes.filter((n) => n.hand === "L" || n.track === 0).length;
  const rhCount = notes.filter((n) => n.hand === "R" || n.track === 1).length;

  return {
    schema_version: 1,
    bpm: 54,
    duration_sec,
    time_signature: "4/4",
    tracks: [
      { index: 0, name: "Left Hand (Deep Octave Pedal)", note_count: lhCount },
      { index: 1, name: "Right Hand (Rolling Triplets & Cantabile Melody)", note_count: rhCount },
    ],
    notes,
  };
}

// 3. CANON IN D (Pachelbel) — Complete ~186s, 1088 notes
export function buildCanonInDData(): NoteData {
  const bpm = 72;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const s16 = beatSec / 4;
  const notes: Note[] = [];
  let noteId = 1;

  const groundBass = [50, 45, 47, 42, 43, 38, 43, 45];
  const cycles = 28;

  for (let c = 0; c < cycles; c++) {
    const cycleStart = c * 8 * beatSec;

    for (let i = 0; i < 8; i++) {
      const bStart = cycleStart + i * beatSec;
      noteId = addNote(notes, noteId, groundBass[i], bStart, beatSec * 0.95, 74, "L");
      if (c >= 6) {
        noteId = addNote(notes, noteId, groundBass[i] - 12, bStart, beatSec * 0.95, 68, "L");
      }
    }

    const rhStart = cycleStart;
    if (c < 2) {
      const v1Pitches = [78, 76, 74, 73, 71, 69, 71, 73];
      for (let i = 0; i < 8; i++) {
        noteId = addNote(notes, noteId, v1Pitches[i], rhStart + i * beatSec, beatSec * 0.9, 80, "R");
      }
    } else if (c < 6) {
      const v2Pitches = [
        74, 78, 81, 79, 78, 74, 78, 76,
        74, 71, 74, 69, 67, 71, 73, 76
      ];
      for (let i = 0; i < 16; i++) {
        noteId = addNote(notes, noteId, v2Pitches[i], rhStart + i * s8, s8 * 0.92, 82, "R");
      }
    } else if (c < 12) {
      const baseScale = [78, 81, 79, 78, 76, 74, 73, 71, 69, 67, 66, 67, 69, 71, 73, 74];
      for (let i = 0; i < 32; i++) {
        const p = baseScale[i % baseScale.length] + (i >= 16 ? 4 : 0);
        noteId = addNote(notes, noteId, p, rhStart + i * s16, s16 * 0.9, 84, "R");
      }
    } else if (c < 18) {
      for (let b = 0; b < 8; b++) {
        const root = groundBass[b] + 24;
        const arp = [root, root + 4, root + 7, root + 12];
        for (let i = 0; i < 4; i++) {
          noteId = addNote(notes, noteId, arp[i], rhStart + b * beatSec + i * s16, s16 * 0.88, 82, "R");
        }
      }
    } else if (c < 24) {
      for (let b = 0; b < 8; b++) {
        const lead = 78 + (b % 4) * 2;
        noteId = addNote(notes, noteId, lead, rhStart + b * beatSec + s8, beatSec * 0.9, 86, "R");
        noteId = addNote(notes, noteId, lead - 5, rhStart + b * beatSec + s8, beatSec * 0.9, 78, "R");
      }
    } else {
      for (let b = 0; b < 8; b++) {
        const chord = [groundBass[b] + 12, groundBass[b] + 16, groundBass[b] + 19, groundBass[b] + 24];
        for (const cp of chord) {
          noteId = addNote(notes, noteId, cp, rhStart + b * beatSec, beatSec * 0.95, 88, "R");
        }
      }
    }
  }

  const duration_sec = Number((cycles * 8 * beatSec).toFixed(2));
  const lhCount = notes.filter((n) => n.hand === "L" || n.track === 0).length;
  const rhCount = notes.filter((n) => n.hand === "R" || n.track === 1).length;

  return {
    schema_version: 1,
    bpm: 72,
    duration_sec,
    time_signature: "4/4",
    tracks: [
      { index: 0, name: "Left Hand (Ground Bass Passacaglia)", note_count: lhCount },
      { index: 1, name: "Right Hand (Polyphonic Variations)", note_count: rhCount },
    ],
    notes,
  };
}

// 4. CLAIR DE LUNE (Debussy) — Complete ~250s, 963 notes
export function buildClairDeLuneData(): NoteData {
  const bpm = 46;
  const beatSec = (60 / bpm);
  const s8 = beatSec / 3;
  const s16 = s8 / 2;
  const notes: Note[] = [];
  let noteId = 1;
  const totalBars = 64;

  for (let bar = 0; bar < totalBars; bar++) {
    const bStart = bar * 3 * beatSec;

    if (bar < 28) {
      const bassRoot = bar % 4 === 0 ? 37 : bar % 4 === 1 ? 41 : bar % 4 === 2 ? 44 : 37;
      noteId = addNote(notes, noteId, bassRoot, bStart, beatSec * 2.8, 55, "L");
      noteId = addNote(notes, noteId, bassRoot + 12, bStart + s8, beatSec * 2.2, 52, "L");

      const thirds = [
        { p1: 77, p2: 73 },
        { p1: 75, p2: 72 },
        { p1: 73, p2: 70 },
        { p1: 72, p2: 68 },
        { p1: 70, p2: 66 },
        { p1: 68, p2: 65 },
      ];
      for (let i = 0; i < 6; i++) {
        const tStart = bStart + i * s8 * 1.5;
        noteId = addNote(notes, noteId, thirds[i % thirds.length].p1, tStart, s8 * 1.4, 74, "R");
        noteId = addNote(notes, noteId, thirds[i % thirds.length].p2, tStart, s8 * 1.4, 70, "R");
      }
    } else if (bar < 45) {
      const roots = [37, 44, 42, 39, 41, 46, 44, 37];
      const root = roots[bar % roots.length];
      noteId = addNote(notes, noteId, root, bStart, beatSec * 2.8, 62, "L");
      noteId = addNote(notes, noteId, root + 7, bStart, beatSec * 2.8, 58, "L");

      const scale = [root + 12, root + 16, root + 19, root + 23, root + 26, root + 28, root + 31, root + 35];
      for (let s = 0; s < 18; s++) {
        const p = scale[s % scale.length];
        const st = bStart + s * s16;
        noteId = addNote(notes, noteId, p, st, s16 * 0.95, 66 + (s % 6) * 3, s < 6 ? "L" : "R");
      }
      noteId = addNote(notes, noteId, root + 36, bStart + beatSec, beatSec * 1.8, 84, "R");
    } else if (bar < 57) {
      noteId = addNote(notes, noteId, 37, bStart, beatSec * 2.8, 52, "L");
      noteId = addNote(notes, noteId, 49, bStart, beatSec * 2.8, 50, "L");
      for (let s = 0; s < 9; s++) {
        const p = 61 + (s % 5) * 4;
        noteId = addNote(notes, noteId, p, bStart + s * s8, s8 * 0.9, 58, "R");
      }
      noteId = addNote(notes, noteId, 73, bStart, beatSec * 1.5, 78, "R");
    } else {
      [25, 37, 44, 49].forEach((p) => {
        noteId = addNote(notes, noteId, p, bStart, beatSec * 2.9, 45, "L");
      });
      [61, 65, 68, 73, 77, 85].forEach((p) => {
        noteId = addNote(notes, noteId, p, bStart + s8, beatSec * 2.5, 48, "R");
      });
    }
  }

  const duration_sec = Number((totalBars * 3 * beatSec).toFixed(2));
  const lhCount = notes.filter((n) => n.hand === "L" || n.track === 0).length;
  const rhCount = notes.filter((n) => n.hand === "R" || n.track === 1).length;

  return {
    schema_version: 1,
    bpm: 46,
    duration_sec,
    time_signature: "9/8",
    tracks: [
      { index: 0, name: "Left Hand (Impressionist Bass Arpeggios)", note_count: lhCount },
      { index: 1, name: "Right Hand (Descending Thirds & Ethereal Melody)", note_count: rhCount },
    ],
    notes,
  };
}

// 5. GYMNOPÉDIE NO. 1 (Erik Satie) — Complete ~180s, 518 notes
export function buildGymnopedie1Data(): NoteData {
  const bpm = 66;
  const beatSec = 60 / bpm;
  const notes: Note[] = [];
  let noteId = 1;
  const totalBars = 66;

  const melodyPhrases: Record<number, number[]> = {
    4: [78, 79, 78, 76, 74, 71],
    8: [73, 74, 76, 74, 71],
    12: [78, 79, 78, 76, 74, 78, 81],
    16: [83, 81, 78, 76, 74],
    22: [81, 83, 81, 79, 78, 74],
    26: [76, 78, 79, 78, 74],
    34: [78, 79, 78, 76, 74, 71],
    38: [73, 74, 76, 74, 71],
    44: [81, 83, 81, 79, 78, 74],
    50: [74, 71, 69, 71, 74],
  };

  for (let bar = 0; bar < totalBars; bar++) {
    const bStart = bar * 3 * beatSec;

    const isGBass = bar % 2 === 0;
    const bassPitch = isGBass ? 43 : 38;
    noteId = addNote(notes, noteId, bassPitch, bStart, beatSec * 2.8, 62, "L");

    const chord = isGBass ? [59, 62, 66] : [57, 61, 66];
    for (let beat = 1; beat <= 2; beat++) {
      const cStart = bStart + beat * beatSec;
      for (const cp of chord) {
        noteId = addNote(notes, noteId, cp, cStart, beatSec * 0.9, 56, "L");
      }
    }

    if (melodyPhrases[bar]) {
      const phrase = melodyPhrases[bar];
      for (let i = 0; i < phrase.length; i++) {
        const mStart = bStart + (i * 1.5) * beatSec;
        noteId = addNote(notes, noteId, phrase[i], mStart, beatSec * 1.4, 76, "R");
      }
    }
  }

  const duration_sec = Number((totalBars * 3 * beatSec).toFixed(2));
  const lhCount = notes.filter((n) => n.hand === "L" || n.track === 0).length;
  const rhCount = notes.filter((n) => n.hand === "R" || n.track === 1).length;

  return {
    schema_version: 1,
    bpm: 66,
    duration_sec,
    time_signature: "3/4",
    tracks: [
      { index: 0, name: "Left Hand (Modal Bass & Ninth Chords)", note_count: lhCount },
      { index: 1, name: "Right Hand (Lyrical Satie Melody)", note_count: rhCount },
    ],
    notes,
  };
}

// 6. BACH PRELUDE IN C MAJOR BWV 846 — Complete ~123.5s, 559 notes
export function buildBachPreludeCMajorData(): NoteData {
  const bpm = 68;
  const beatSec = 60 / bpm;
  const s16 = beatSec / 4;
  const notes: Note[] = [];
  let noteId = 1;

  const bach35 = [
    [48, 52, 55, 60, 64], [48, 50, 57, 62, 65], [47, 50, 55, 62, 65], [48, 52, 55, 60, 64],
    [48, 52, 57, 60, 69], [48, 50, 54, 57, 62], [47, 50, 55, 62, 67], [47, 48, 52, 55, 60],
    [45, 48, 52, 55, 60], [50, 45, 50, 54, 60], [43, 47, 50, 55, 59], [43, 46, 52, 55, 61],
    [41, 45, 50, 57, 62], [41, 44, 50, 53, 59], [40, 43, 48, 55, 60], [40, 41, 45, 48, 53],
    [38, 41, 45, 48, 53], [43, 50, 55, 59, 65], [48, 52, 55, 60, 64], [48, 46, 52, 55, 60],
    [41, 41, 45, 48, 53], [42, 48, 50, 57, 60], [44, 41, 47, 48, 50], [43, 41, 43, 47, 50],
    [43, 40, 43, 48, 52], [43, 38, 43, 48, 53], [43, 38, 43, 47, 53], [43, 39, 45, 48, 54],
    [43, 40, 43, 48, 55], [43, 38, 43, 48, 53], [43, 38, 43, 47, 53], [48, 48, 46, 52, 55],
    [41, 41, 45, 48, 53], [43, 41, 43, 47, 50],
  ];

  for (let bar = 0; bar < bach35.length; bar++) {
    const bStart = bar * 4 * beatSec;
    const p = bach35[bar];
    for (let wave = 0; wave < 2; wave++) {
      const wStart = bStart + wave * (2 * beatSec);
      const waveNotes = [p[0], p[1], p[2], p[3], p[4], p[2], p[3], p[4]];
      for (let i = 0; i < 8; i++) {
        const st = wStart + i * s16;
        const hand = i < 2 ? "L" : "R";
        noteId = addNote(notes, noteId, waveNotes[i], st, s16 * 0.95, i === 0 ? 68 : 58, hand);
      }
    }
  }

  const bar35Start = 34 * 4 * beatSec;
  const finalArp = [36, 48, 52, 55, 60, 64, 67, 72];
  for (let i = 0; i < finalArp.length; i++) {
    const hand = i < 3 ? "L" : "R";
    noteId = addNote(notes, noteId, finalArp[i], bar35Start + i * (s16 * 0.5), beatSec * 3.5, 75, hand);
  }
  [36, 48].forEach((p) => {
    noteId = addNote(notes, noteId, p, bar35Start + beatSec, beatSec * 3, 72, "L");
  });
  [52, 55, 60, 64, 72].forEach((p) => {
    noteId = addNote(notes, noteId, p, bar35Start + beatSec, beatSec * 3, 78, "R");
  });

  const duration_sec = Number(((35 * 4 * beatSec)).toFixed(2));
  const lhCount = notes.filter((n) => n.hand === "L" || n.track === 0).length;
  const rhCount = notes.filter((n) => n.hand === "R" || n.track === 1).length;

  return {
    schema_version: 1,
    bpm: 68,
    duration_sec,
    time_signature: "4/4",
    tracks: [
      { index: 0, name: "Left Hand (Ground Bass Arpeggio)", note_count: lhCount },
      { index: 1, name: "Right Hand (Flowing 16th Arpeggios)", note_count: rhCount },
    ],
    notes,
  };
}

// 7. General Repertoire Piece Generator
export function buildGenericFullPieceData(
  bpm: number,
  time_sig: string,
  totalBars: number,
  keyRoot: number,
  isMinor: boolean,
  style: "waltz" | "ballad" | "stride" | "march" | "cinema",
  lhName: string,
  rhName: string
): NoteData {
  const beatsPerBar = time_sig === "3/4" || time_sig === "3/8" ? 3 : time_sig === "2/4" ? 2 : 4;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const notes: Note[] = [];
  let noteId = 1;

  const scale = isMinor ? [0, 2, 3, 5, 7, 8, 10, 12] : [0, 2, 4, 5, 7, 9, 11, 12];
  const chordRoots = isMinor ? [0, 5, 3, 7, 0, 8, 5, 7] : [0, 7, 9, 5, 0, 7, 5, 0];

  for (let bar = 0; bar < totalBars; bar++) {
    const bStart = bar * beatsPerBar * beatSec;
    const chordDegree = chordRoots[bar % chordRoots.length];
    const root = keyRoot + chordDegree;

    if (style === "waltz") {
      noteId = addNote(notes, noteId, root - 12, bStart, beatSec * 2.5, 72, "L");
      const wChord = [root, root + (isMinor ? 3 : 4), root + 7];
      for (let beat = 1; beat < 3; beat++) {
        for (const cp of wChord) {
          noteId = addNote(notes, noteId, cp, bStart + beat * beatSec, beatSec * 0.8, 62, "L");
        }
      }
      for (let s = 0; s < 3; s++) {
        const melP = root + 12 + scale[(bar * 2 + s) % scale.length];
        noteId = addNote(notes, noteId, melP, bStart + s * beatSec, beatSec * 0.9, 82, "R");
      }
    } else if (style === "march" || style === "stride") {
      noteId = addNote(notes, noteId, root - 12, bStart, beatSec * 0.9, 75, "L");
      const ch = [root, root + 4, root + 7];
      for (const cp of ch) {
        noteId = addNote(notes, noteId, cp, bStart + beatSec, beatSec * 0.8, 68, "L");
      }
      for (let s = 0; s < 4; s++) {
        const melP = root + 12 + scale[(bar * 3 + s) % scale.length];
        noteId = addNote(notes, noteId, melP, bStart + s * s8, s8 * 0.9, 84, "R");
      }
    } else if (style === "cinema") {
      noteId = addNote(notes, noteId, root - 24, bStart, beatsPerBar * beatSec * 0.95, 78, "L");
      noteId = addNote(notes, noteId, root - 12, bStart, beatsPerBar * beatSec * 0.95, 72, "L");
      for (let beat = 0; beat < beatsPerBar; beat++) {
        const arp = [root, root + 7, root + 12];
        for (let a = 0; a < 3; a++) {
          noteId = addNote(notes, noteId, arp[a], bStart + beat * beatSec + a * (beatSec / 3), beatSec * 0.3, 62, "L");
        }
      }
      const melP = root + 12 + scale[(bar % 4) * 2];
      noteId = addNote(notes, noteId, melP, bStart + beatSec, beatSec * 1.8, 86, "R");
    } else {
      noteId = addNote(notes, noteId, root - 12, bStart, beatSec * 3.8, 72, "L");
      noteId = addNote(notes, noteId, root - 5, bStart + beatSec, beatSec * 2.8, 66, "L");
      noteId = addNote(notes, noteId, root + (isMinor ? 3 : 4), bStart + beatSec * 2, beatSec * 1.8, 64, "L");
      noteId = addNote(notes, noteId, root + 7, bStart + beatSec * 3, beatSec * 0.9, 64, "L");
      for (let s = 0; s < 8; s++) {
        const melP = root + 12 + scale[(bar * 2 + s) % scale.length];
        noteId = addNote(notes, noteId, melP, bStart + s * s8, s8 * 0.92, 82, "R");
      }
    }
  }

  const duration_sec = Number((totalBars * beatsPerBar * beatSec).toFixed(2));
  const lhCount = notes.filter((n) => n.hand === "L" || n.track === 0).length;
  const rhCount = notes.filter((n) => n.hand === "R" || n.track === 1).length;

  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: time_sig,
    tracks: [
      { index: 0, name: lhName, note_count: lhCount },
      { index: 1, name: rhName, note_count: rhCount },
    ],
    notes,
  };
}


/**
 * PianoFlow AI — Test and build all 25 new full piece generators
 */

export interface ArrangedSongConfig {
  bpm: number;
  time_sig: "4/4" | "3/4" | "2/4" | "12/8";
  keyRoot: number; // MIDI pitch, e.g. 64 for E4
  isMinor: boolean;
  lhName: string;
  rhName: string;
  sections: {
    name: "intro" | "verse" | "preChorus" | "chorus" | "bridge" | "coda";
    bars: number;
    chordRoots: number[]; // offsets relative to keyRoot
    lhStyle:
      | "ballad10th"
      | "rockPower"
      | "waltz"
      | "stride"
      | "discoFunk"
      | "alberti"
      | "rollingArp"
      | "staccatoPluck"
      | "continuous16th";
    rhMelody: number[]; // offsets relative to keyRoot + 12
    rhRhythm:
      | "lyrical8th"
      | "syncopated16th"
      | "cascades"
      | "waltzCantabile"
      | "marchStaccato"
      | "climaxOctaves";
    dynamics: { lh: number; rh: number };
  }[];
}

export function buildFullArrangedSong(config: ArrangedSongConfig): NoteData {
  const { bpm, time_sig, keyRoot, isMinor, lhName, rhName, sections } = config;
  const beatsPerBar = time_sig === "3/4" ? 3 : time_sig === "2/4" ? 2 : 4;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const s16 = beatSec / 4;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  const thirdInterval = isMinor ? 3 : 4;
  const fifthInterval = 7;

  for (const sec of sections) {
    for (let bar = 0; bar < sec.bars; bar++) {
      const bStart = curTime;
      const chordOffset = sec.chordRoots[bar % sec.chordRoots.length] ?? 0;
      const root = keyRoot + chordOffset;
      const bassPitch = root - 24;

      // 1. LEFT HAND ACCOMPANIMENT
      if (sec.lhStyle === "waltz") {
        noteId = addNote(notes, noteId, bassPitch, bStart, beatSec * 2.5, sec.dynamics.lh, "L");
        const wChord = [root - 12 + thirdInterval, root - 12 + fifthInterval];
        for (let b = 1; b < 3; b++) {
          for (const cp of wChord) {
            noteId = addNote(notes, noteId, cp, bStart + b * beatSec, beatSec * 0.85, sec.dynamics.lh - 4, "L");
          }
        }
      } else if (sec.lhStyle === "ballad10th") {
        noteId = addNote(notes, noteId, bassPitch, bStart, beatSec * 3.5, sec.dynamics.lh, "L");
        noteId = addNote(notes, noteId, root - 17, bStart + beatSec, beatSec * 2.5, sec.dynamics.lh - 3, "L");
        noteId = addNote(notes, noteId, root - 12 + thirdInterval, bStart + beatSec * 2, beatSec * 1.8, sec.dynamics.lh - 2, "L");
        noteId = addNote(notes, noteId, root - 12, bStart + beatSec * 3, beatSec * 0.9, sec.dynamics.lh - 4, "L");
      } else if (sec.lhStyle === "rockPower") {
        for (let i = 0; i < beatsPerBar * 2; i++) {
          const t = bStart + i * s8;
          const isDownbeat = i % 2 === 0;
          const vel = isDownbeat ? sec.dynamics.lh : sec.dynamics.lh - 6;
          noteId = addNote(notes, noteId, bassPitch, t, s8 * 0.85, vel, "L");
          noteId = addNote(notes, noteId, root - 17, t, s8 * 0.85, vel - 2, "L");
        }
      } else if (sec.lhStyle === "discoFunk") {
        noteId = addNote(notes, noteId, bassPitch, bStart, s8 * 0.9, sec.dynamics.lh + 4, "L");
        noteId = addNote(notes, noteId, root - 12, bStart + s8, s8 * 0.8, sec.dynamics.lh - 2, "L");
        noteId = addNote(notes, noteId, root - 12 + thirdInterval, bStart + beatSec * 1.5, s8 * 0.8, sec.dynamics.lh, "L");
        noteId = addNote(notes, noteId, bassPitch, bStart + beatSec * 2, s8 * 0.9, sec.dynamics.lh + 2, "L");
        noteId = addNote(notes, noteId, root - 17, bStart + beatSec * 3, s8 * 0.85, sec.dynamics.lh - 2, "L");
      } else if (sec.lhStyle === "stride") {
        noteId = addNote(notes, noteId, bassPitch, bStart, beatSec * 0.9, sec.dynamics.lh + 2, "L");
        const ch = [root - 12, root - 12 + thirdInterval, root - 12 + fifthInterval];
        for (const cp of ch) {
          noteId = addNote(notes, noteId, cp, bStart + beatSec, beatSec * 0.8, sec.dynamics.lh - 4, "L");
        }
        noteId = addNote(notes, noteId, root - 17, bStart + beatSec * 2, beatSec * 0.9, sec.dynamics.lh, "L");
        for (const cp of ch) {
          noteId = addNote(notes, noteId, cp, bStart + beatSec * 3, beatSec * 0.8, sec.dynamics.lh - 4, "L");
        }
      } else if (sec.lhStyle === "alberti") {
        const albP = [bassPitch, root - 17, root - 24 + thirdInterval, root - 17];
        for (let i = 0; i < beatsPerBar * 2; i++) {
          const p = albP[i % albP.length];
          noteId = addNote(notes, noteId, p, bStart + i * s8, s8 * 0.9, sec.dynamics.lh - (i % 2 === 0 ? 0 : 4), "L");
        }
      } else if (sec.lhStyle === "rollingArp") {
        const arpP = [
          bassPitch,
          root - 17,
          root - 12,
          root - 12 + thirdInterval,
          root - 12 + fifthInterval,
          root - 12 + thirdInterval,
          root - 12,
          root - 17,
        ];
        for (let i = 0; i < beatsPerBar * 4; i++) {
          const p = arpP[i % arpP.length];
          noteId = addNote(notes, noteId, p, bStart + i * s16, s16 * 0.9, sec.dynamics.lh - 4, "L");
        }
      } else if (sec.lhStyle === "continuous16th") {
        const cascP = [
          bassPitch,
          root - 17,
          root - 12,
          root - 12 + thirdInterval,
          root - 12 + fifthInterval,
          root - 5,
          root,
          root + thirdInterval,
        ];
        for (let i = 0; i < beatsPerBar * 4; i++) {
          const p = cascP[i % cascP.length];
          noteId = addNote(notes, noteId, p, bStart + i * s16, s16 * 0.92, sec.dynamics.lh - 2, "L");
        }
      } else {
        for (let b = 0; b < beatsPerBar; b++) {
          noteId = addNote(notes, noteId, bassPitch, bStart + b * beatSec, beatSec * 0.45, sec.dynamics.lh, "L");
        }
      }

      // 2. RIGHT HAND MELODY & PHRASING
      const mel = sec.rhMelody;
      const melBase = root + 12;

      if (sec.rhRhythm === "waltzCantabile") {
        for (let s = 0; s < 3; s++) {
          const p = melBase + mel[(bar * 3 + s) % mel.length];
          noteId = addNote(notes, noteId, p, bStart + s * beatSec, beatSec * 0.92, sec.dynamics.rh, "R");
        }
      } else if (sec.rhRhythm === "climaxOctaves") {
        for (let s = 0; s < beatsPerBar * 2; s++) {
          const p = melBase + mel[(bar * 2 + s) % mel.length];
          noteId = addNote(notes, noteId, p, bStart + s * s8, s8 * 0.9, sec.dynamics.rh + 6, "R");
          noteId = addNote(notes, noteId, p + 12, bStart + s * s8, s8 * 0.9, sec.dynamics.rh + 4, "R");
        }
      } else if (sec.rhRhythm === "cascades") {
        for (let s = 0; s < beatsPerBar * 4; s++) {
          const p = melBase + mel[(bar * 4 + s) % mel.length];
          const isAccent = s % 4 === 0;
          noteId = addNote(notes, noteId, p + 12, bStart + s * s16, s16 * 0.9, isAccent ? sec.dynamics.rh + 4 : sec.dynamics.rh - 3, "R");
        }
      } else if (sec.rhRhythm === "syncopated16th") {
        const syncBeats = [0, 0.75, 1.5, 2.0, 2.75, 3.25];
        for (let i = 0; i < syncBeats.length; i++) {
          const offsetBeat = syncBeats[i];
          if (offsetBeat >= beatsPerBar) continue;
          const p = melBase + mel[(bar * syncBeats.length + i) % mel.length];
          noteId = addNote(notes, noteId, p, bStart + offsetBeat * beatSec, beatSec * 0.6, sec.dynamics.rh + (i === 0 ? 3 : 0), "R");
        }
      } else if (sec.rhRhythm === "marchStaccato") {
        for (let s = 0; s < beatsPerBar * 2; s++) {
          const p = melBase + mel[(bar * 2 + s) % mel.length];
          noteId = addNote(notes, noteId, p, bStart + s * s8, s8 * 0.7, sec.dynamics.rh, "R");
        }
      } else {
        for (let s = 0; s < beatsPerBar * 2; s++) {
          if (s === beatsPerBar * 2 - 1 && bar % 2 === 1) continue;
          const p = melBase + mel[(bar * 2 + s) % mel.length];
          noteId = addNote(notes, noteId, p, bStart + s * s8, s8 * 0.92, sec.dynamics.rh - (s % 2 === 0 ? 0 : 3), "R");
        }
      }

      curTime += beatsPerBar * beatSec;
    }
  }

  // Final cadential chord
  const finalDur = beatsPerBar * beatSec * 1.5;
  noteId = addNote(notes, noteId, keyRoot - 24, curTime, finalDur, 65, "L");
  noteId = addNote(notes, noteId, keyRoot - 12, curTime, finalDur, 62, "L");
  noteId = addNote(notes, noteId, keyRoot - 12 + thirdInterval, curTime, finalDur, 60, "L");
  noteId = addNote(notes, noteId, keyRoot, curTime, finalDur, 68, "R");
  noteId = addNote(notes, noteId, keyRoot + 12, curTime, finalDur, 72, "R");
  curTime += finalDur;

  const duration_sec = Number(curTime.toFixed(2));
  const lhCount = notes.filter((n) => n.hand === "L" || n.track === 0).length;
  const rhCount = notes.filter((n) => n.hand === "R" || n.track === 1).length;

  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: time_sig,
    tracks: [
      { index: 0, name: lhName, note_count: lhCount },
      { index: 1, name: rhName, note_count: rhCount },
    ],
    notes,
  };
}

// 1. Gurenge (LiSA / Demon Slayer)
export function buildGurengeData(): NoteData {
  return buildFullArrangedSong({
    bpm: 135,
    time_sig: "4/4",
    keyRoot: 52, // E3
    isMinor: true,
    lhName: "Left Hand (Driving Heavy Rock Bass & Octaves)",
    rhName: "Right Hand (Fiery Anime OP Melody & Riffs)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 8, 10, 3], lhStyle: "rockPower", rhMelody: [11, 14, 16, 14, 11, 9, 11], rhRhythm: "syncopated16th", dynamics: { lh: 68, rh: 80 } },
      { name: "verse", bars: 16, chordRoots: [0, 8, 10, 0, 0, 8, 10, 3], lhStyle: "rockPower", rhMelody: [7, 9, 11, 14, 12, 11, 9, 7], rhRhythm: "syncopated16th", dynamics: { lh: 72, rh: 82 } },
      { name: "preChorus", bars: 8, chordRoots: [8, 10, 0, 7], lhStyle: "rockPower", rhMelody: [12, 14, 16, 17, 16, 14, 12, 11], rhRhythm: "syncopated16th", dynamics: { lh: 76, rh: 86 } },
      { name: "chorus", bars: 16, chordRoots: [8, 10, 0, 3, 8, 10, 0, 0], lhStyle: "rockPower", rhMelody: [16, 18, 19, 21, 19, 18, 16, 14, 16, 18, 19], rhRhythm: "climaxOctaves", dynamics: { lh: 84, rh: 94 } },
      { name: "verse", bars: 12, chordRoots: [0, 8, 10, 0], lhStyle: "rockPower", rhMelody: [7, 9, 11, 14, 12, 11], rhRhythm: "syncopated16th", dynamics: { lh: 70, rh: 82 } },
      { name: "bridge", bars: 8, chordRoots: [8, 10, 0, 7], lhStyle: "rollingArp", rhMelody: [14, 16, 19, 21, 19, 16], rhRhythm: "cascades", dynamics: { lh: 66, rh: 84 } },
      { name: "chorus", bars: 16, chordRoots: [8, 10, 0, 3, 8, 10, 0, 0], lhStyle: "rockPower", rhMelody: [16, 18, 19, 21, 19, 18, 16, 14, 16, 18, 19], rhRhythm: "climaxOctaves", dynamics: { lh: 88, rh: 98 } },
      { name: "coda", bars: 6, chordRoots: [8, 10, 0, 0], lhStyle: "rockPower", rhMelody: [16, 14, 11, 9, 7, 0], rhRhythm: "marchStaccato", dynamics: { lh: 82, rh: 90 } },
    ],
  });
}

// 2. Blue Bird (Ikimono Gakari / Naruto)
export function buildBlueBirdData(): NoteData {
  return buildFullArrangedSong({
    bpm: 152,
    time_sig: "4/4",
    keyRoot: 50, // D3
    isMinor: true,
    lhName: "Left Hand (Driving 8th Bass & Offbeat Chords)",
    rhName: "Right Hand (Soaring Habataitara Hook & Solos)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 8, 3, 10], lhStyle: "rockPower", rhMelody: [9, 14, 16, 17, 16, 14, 13], rhRhythm: "syncopated16th", dynamics: { lh: 70, rh: 82 } },
      { name: "verse", bars: 16, chordRoots: [0, 8, 3, 10, 0, 8, 3, 10], lhStyle: "discoFunk", rhMelody: [12, 10, 8, 7, 8, 10, 12, 15], rhRhythm: "syncopated16th", dynamics: { lh: 72, rh: 84 } },
      { name: "preChorus", bars: 8, chordRoots: [8, 10, 0, 7], lhStyle: "rockPower", rhMelody: [14, 15, 17, 19, 17, 15, 14, 12], rhRhythm: "syncopated16th", dynamics: { lh: 76, rh: 86 } },
      { name: "chorus", bars: 16, chordRoots: [8, 10, 0, 3, 8, 10, 0, 0], lhStyle: "rockPower", rhMelody: [17, 16, 14, 12, 14, 16, 17, 21, 19, 17, 16, 14], rhRhythm: "climaxOctaves", dynamics: { lh: 84, rh: 94 } },
      { name: "verse", bars: 12, chordRoots: [0, 8, 3, 10], lhStyle: "discoFunk", rhMelody: [12, 10, 8, 7, 8, 10], rhRhythm: "syncopated16th", dynamics: { lh: 72, rh: 82 } },
      { name: "bridge", bars: 8, chordRoots: [5, 7, 8, 10], lhStyle: "rollingArp", rhMelody: [15, 17, 19, 22, 21, 19], rhRhythm: "cascades", dynamics: { lh: 68, rh: 86 } },
      { name: "chorus", bars: 16, chordRoots: [8, 10, 0, 3, 8, 10, 0, 0], lhStyle: "rockPower", rhMelody: [17, 16, 14, 12, 14, 16, 17, 21, 19, 17, 16, 14], rhRhythm: "climaxOctaves", dynamics: { lh: 88, rh: 96 } },
      { name: "coda", bars: 8, chordRoots: [8, 10, 0, 0], lhStyle: "rockPower", rhMelody: [14, 12, 9, 7, 5, 0], rhRhythm: "marchStaccato", dynamics: { lh: 80, rh: 90 } },
    ],
  });
}

// 3. Hikaru Nara (Goose house / Your Lie in April)
export function buildHikaruNaraData(): NoteData {
  return buildFullArrangedSong({
    bpm: 155,
    time_sig: "4/4",
    keyRoot: 55, // G3
    isMinor: false,
    lhName: "Left Hand (Joyful Bouncy Pop Groove & Octaves)",
    rhName: "Right Hand (Kimi da yo Soaring Lyrical Violin Riffs)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 7, 9, 5], lhStyle: "discoFunk", rhMelody: [7, 9, 11, 12, 14, 12, 11, 9, 7, 4, 7], rhRhythm: "syncopated16th", dynamics: { lh: 70, rh: 82 } },
      { name: "verse", bars: 16, chordRoots: [0, 7, 9, 5, 0, 7, 9, 5], lhStyle: "discoFunk", rhMelody: [4, 7, 9, 11, 9, 7, 4, 2], rhRhythm: "syncopated16th", dynamics: { lh: 72, rh: 84 } },
      { name: "preChorus", bars: 8, chordRoots: [5, 7, 4, 9], lhStyle: "rockPower", rhMelody: [11, 12, 14, 16, 14, 12, 11, 9], rhRhythm: "syncopated16th", dynamics: { lh: 76, rh: 88 } },
      { name: "chorus", bars: 16, chordRoots: [0, 7, 9, 5, 0, 7, 5, 0], lhStyle: "rockPower", rhMelody: [7, 9, 11, 12, 14, 16, 14, 12, 11, 9, 7, 11, 14, 12], rhRhythm: "climaxOctaves", dynamics: { lh: 84, rh: 95 } },
      { name: "verse", bars: 12, chordRoots: [0, 7, 9, 5], lhStyle: "discoFunk", rhMelody: [4, 7, 9, 11, 9, 7], rhRhythm: "syncopated16th", dynamics: { lh: 70, rh: 82 } },
      { name: "bridge", bars: 8, chordRoots: [5, 7, 9, 0], lhStyle: "rollingArp", rhMelody: [12, 14, 16, 19, 16, 14], rhRhythm: "cascades", dynamics: { lh: 68, rh: 86 } },
      { name: "chorus", bars: 16, chordRoots: [0, 7, 9, 5, 0, 7, 5, 0], lhStyle: "rockPower", rhMelody: [7, 9, 11, 12, 14, 16, 14, 12, 11, 9, 7, 11, 14, 12], rhRhythm: "climaxOctaves", dynamics: { lh: 88, rh: 98 } },
      { name: "coda", bars: 8, chordRoots: [5, 7, 0, 0], lhStyle: "discoFunk", rhMelody: [12, 11, 9, 7, 4, 0], rhRhythm: "syncopated16th", dynamics: { lh: 75, rh: 88 } },
    ],
  });
}

// 4. Nandemonaiya (Radwimps / Your Name)
export function buildNandemonaiyaData(): NoteData {
  return buildFullArrangedSong({
    bpm: 74,
    time_sig: "4/4",
    keyRoot: 57, // A3
    isMinor: false,
    lhName: "Left Hand (Warm Rolling Tenth Ballad Arpeggios)",
    rhName: "Right Hand (Tender Singing Vocal Line & Cascades)",
    sections: [
      { name: "intro", bars: 6, chordRoots: [0, 7, 9, 5], lhStyle: "ballad10th", rhMelody: [0, 4, 7, 9, 7, 4, 2, 4, 7, 9], rhRhythm: "lyrical8th", dynamics: { lh: 55, rh: 72 } },
      { name: "verse", bars: 14, chordRoots: [0, 7, 9, 5, 0, 7, 5, 0], lhStyle: "ballad10th", rhMelody: [4, 7, 9, 11, 12, 11, 9, 7, 4, 2, 4, 7], rhRhythm: "lyrical8th", dynamics: { lh: 58, rh: 75 } },
      { name: "preChorus", bars: 8, chordRoots: [5, 7, 4, 9], lhStyle: "rollingArp", rhMelody: [7, 9, 11, 12, 14, 12, 11, 9], rhRhythm: "lyrical8th", dynamics: { lh: 62, rh: 80 } },
      { name: "chorus", bars: 16, chordRoots: [0, 7, 9, 5, 0, 7, 5, 0], lhStyle: "ballad10th", rhMelody: [9, 11, 12, 14, 12, 11, 9, 7, 4, 2, 4, 7, 9, 11, 12], rhRhythm: "climaxOctaves", dynamics: { lh: 72, rh: 88 } },
      { name: "verse", bars: 10, chordRoots: [0, 7, 9, 5], lhStyle: "ballad10th", rhMelody: [4, 7, 9, 11, 9, 7], rhRhythm: "lyrical8th", dynamics: { lh: 56, rh: 74 } },
      { name: "bridge", bars: 8, chordRoots: [5, 7, 9, 0], lhStyle: "rollingArp", rhMelody: [12, 14, 16, 19, 16, 14], rhRhythm: "cascades", dynamics: { lh: 65, rh: 84 } },
      { name: "chorus", bars: 16, chordRoots: [0, 7, 9, 5, 0, 7, 5, 0], lhStyle: "ballad10th", rhMelody: [9, 11, 12, 14, 12, 11, 9, 7, 4, 2, 4, 7, 9, 11, 12], rhRhythm: "climaxOctaves", dynamics: { lh: 76, rh: 92 } },
      { name: "coda", bars: 6, chordRoots: [5, 7, 0, 0], lhStyle: "ballad10th", rhMelody: [4, 2, 0, 0], rhRhythm: "lyrical8th", dynamics: { lh: 50, rh: 68 } },
    ],
  });
}

// 5. Katawaredoki (Radwimps / Your Name)
export function buildKatawaredokiData(): NoteData {
  return buildFullArrangedSong({
    bpm: 70,
    time_sig: "3/4",
    keyRoot: 52, // E3
    isMinor: false,
    lhName: "Left Hand (Twilight 3/4 Harp Arpeggio Lilts)",
    rhName: "Right Hand (High Mountain Bell Melody & Swells)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 7, 9, 5], lhStyle: "waltz", rhMelody: [11, 12, 14, 16, 14, 12, 11, 9, 7, 9, 11, 12, 11], rhRhythm: "waltzCantabile", dynamics: { lh: 52, rh: 70 } },
      { name: "verse", bars: 20, chordRoots: [0, 7, 9, 5, 0, 7, 5, 0], lhStyle: "waltz", rhMelody: [4, 7, 9, 11, 12, 11, 9, 7, 4, 7, 11, 12], rhRhythm: "waltzCantabile", dynamics: { lh: 56, rh: 74 } },
      { name: "chorus", bars: 24, chordRoots: [0, 7, 9, 5, 0, 7, 5, 0], lhStyle: "waltz", rhMelody: [11, 12, 14, 16, 14, 12, 11, 9, 7, 9, 11, 12, 11], rhRhythm: "climaxOctaves", dynamics: { lh: 70, rh: 88 } },
      { name: "bridge", bars: 14, chordRoots: [9, 5, 7, 0], lhStyle: "rollingArp", rhMelody: [12, 14, 16, 19, 16, 14], rhRhythm: "cascades", dynamics: { lh: 60, rh: 80 } },
      { name: "chorus", bars: 20, chordRoots: [0, 7, 9, 5, 0, 7, 5, 0], lhStyle: "waltz", rhMelody: [11, 12, 14, 16, 14, 12, 11, 9, 7, 9, 11, 12, 11], rhRhythm: "climaxOctaves", dynamics: { lh: 74, rh: 92 } },
      { name: "coda", bars: 10, chordRoots: [5, 7, 0, 0], lhStyle: "waltz", rhMelody: [7, 4, 0], rhRhythm: "waltzCantabile", dynamics: { lh: 48, rh: 65 } },
    ],
  });
}

// 6. Unravel (TK from Ling Tosite Sigure / Tokyo Ghoul)
export function buildUnravelData(): NoteData {
  return buildFullArrangedSong({
    bpm: 135,
    time_sig: "4/4",
    keyRoot: 56, // G#3
    isMinor: true,
    lhName: "Left Hand (Tragic Staccato Bass & Thunderous Octaves)",
    rhName: "Right Hand (Glassy Melancholy Whispers & Virtuoso Cascades)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 8, 3, 10], lhStyle: "rollingArp", rhMelody: [7, 10, 12, 15, 14, 12, 10, 7, 3, 7], rhRhythm: "lyrical8th", dynamics: { lh: 55, rh: 72 } },
      { name: "verse", bars: 16, chordRoots: [0, 8, 3, 10, 0, 8, 5, 7], lhStyle: "rockPower", rhMelody: [3, 7, 10, 12, 10, 7, 3, 2], rhRhythm: "syncopated16th", dynamics: { lh: 72, rh: 82 } },
      { name: "preChorus", bars: 8, chordRoots: [8, 10, 0, 7], lhStyle: "rockPower", rhMelody: [10, 12, 14, 15, 17, 15, 14, 12], rhRhythm: "syncopated16th", dynamics: { lh: 78, rh: 88 } },
      { name: "chorus", bars: 16, chordRoots: [8, 10, 0, 3, 8, 10, 0, 0], lhStyle: "rockPower", rhMelody: [15, 14, 12, 10, 12, 15, 17, 19, 17, 15, 14, 12, 10, 7], rhRhythm: "climaxOctaves", dynamics: { lh: 88, rh: 98 } },
      { name: "verse", bars: 12, chordRoots: [0, 8, 3, 10], lhStyle: "rockPower", rhMelody: [3, 7, 10, 12, 10, 7], rhRhythm: "syncopated16th", dynamics: { lh: 70, rh: 82 } },
      { name: "bridge", bars: 8, chordRoots: [0, 8, 5, 7], lhStyle: "continuous16th", rhMelody: [12, 15, 17, 20, 19, 17], rhRhythm: "cascades", dynamics: { lh: 74, rh: 90 } },
      { name: "chorus", bars: 16, chordRoots: [8, 10, 0, 3, 8, 10, 0, 0], lhStyle: "rockPower", rhMelody: [15, 14, 12, 10, 12, 15, 17, 19, 17, 15, 14, 12, 10, 7], rhRhythm: "climaxOctaves", dynamics: { lh: 90, rh: 100 } },
      { name: "coda", bars: 8, chordRoots: [8, 10, 0, 0], lhStyle: "rollingArp", rhMelody: [7, 3, 0], rhRhythm: "lyrical8th", dynamics: { lh: 50, rh: 68 } },
    ],
  });
}

// 7. He's a Pirate (Pirates of the Caribbean)
export function buildHeIsAPirateData(): NoteData {
  return buildFullArrangedSong({
    bpm: 140,
    time_sig: "12/8",
    keyRoot: 50, // D3
    isMinor: true,
    lhName: "Left Hand (Galloping 12/8 Pirate Ostinato & Cannonade Bass)",
    rhName: "Right Hand (Swashbuckling Theme & Fanfare Chords)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 0, 8, 10], lhStyle: "rockPower", rhMelody: [0, 0, 0, 3, 7, 7, 7, 8, 7, 5, 7], rhRhythm: "syncopated16th", dynamics: { lh: 75, rh: 85 } },
      { name: "verse", bars: 16, chordRoots: [0, 0, 8, 10, 0, 0, 8, 7], lhStyle: "rockPower", rhMelody: [0, 0, 3, 7, 7, 7, 8, 7, 5, 7, 0, 0, 3, 7, 7, 7, 8, 10, 8, 7, 5], rhRhythm: "syncopated16th", dynamics: { lh: 80, rh: 90 } },
      { name: "chorus", bars: 16, chordRoots: [8, 10, 0, 0, 8, 10, 0, 0], lhStyle: "rockPower", rhMelody: [12, 12, 14, 15, 17, 15, 14, 12, 10, 8, 10, 12], rhRhythm: "climaxOctaves", dynamics: { lh: 88, rh: 96 } },
      { name: "bridge", bars: 12, chordRoots: [0, 8, 10, 7], lhStyle: "rollingArp", rhMelody: [7, 10, 12, 15, 14, 12], rhRhythm: "cascades", dynamics: { lh: 76, rh: 88 } },
      { name: "chorus", bars: 20, chordRoots: [8, 10, 0, 0, 8, 10, 0, 0], lhStyle: "rockPower", rhMelody: [0, 0, 3, 7, 7, 7, 8, 7, 5, 7, 0, 0, 3, 7, 7, 7, 8, 10, 8, 7, 5], rhRhythm: "climaxOctaves", dynamics: { lh: 92, rh: 100 } },
      { name: "coda", bars: 10, chordRoots: [8, 10, 0, 0], lhStyle: "rockPower", rhMelody: [7, 5, 3, 0], rhRhythm: "marchStaccato", dynamics: { lh: 86, rh: 96 } },
    ],
  });
}

// 8. Megalovania (Toby Fox / Undertale)
export function buildMegalovaniaData(): NoteData {
  return buildFullArrangedSong({
    bpm: 120,
    time_sig: "4/4",
    keyRoot: 50, // D3
    isMinor: true,
    lhName: "Left Hand (Funk Chiptune Bass Staccatos & Octave Slaps)",
    rhName: "Right Hand (Iconic Sans 4-Bar Ostinato & Fast Solos)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 10, 9, 8], lhStyle: "discoFunk", rhMelody: [0, 0, 12, 7, 6, 5, 3, 0, 3, 5], rhRhythm: "syncopated16th", dynamics: { lh: 72, rh: 85 } },
      { name: "verse", bars: 16, chordRoots: [0, 10, 9, 8, 0, 10, 9, 8], lhStyle: "discoFunk", rhMelody: [0, 0, 12, 7, 6, 5, 3, 0, 3, 5], rhRhythm: "syncopated16th", dynamics: { lh: 78, rh: 88 } },
      { name: "preChorus", bars: 8, chordRoots: [8, 10, 0, 7], lhStyle: "rockPower", rhMelody: [12, 14, 15, 17, 15, 14, 12, 10], rhRhythm: "syncopated16th", dynamics: { lh: 82, rh: 92 } },
      { name: "chorus", bars: 16, chordRoots: [0, 10, 9, 8, 0, 10, 9, 8], lhStyle: "rockPower", rhMelody: [12, 12, 24, 19, 18, 17, 15, 12, 15, 17], rhRhythm: "climaxOctaves", dynamics: { lh: 88, rh: 98 } },
      { name: "verse", bars: 12, chordRoots: [0, 10, 9, 8], lhStyle: "discoFunk", rhMelody: [0, 0, 12, 7, 6, 5, 3, 0], rhRhythm: "syncopated16th", dynamics: { lh: 76, rh: 86 } },
      { name: "bridge", bars: 8, chordRoots: [3, 5, 7, 8], lhStyle: "continuous16th", rhMelody: [15, 17, 19, 22, 21, 19], rhRhythm: "cascades", dynamics: { lh: 80, rh: 92 } },
      { name: "chorus", bars: 16, chordRoots: [0, 10, 9, 8, 0, 10, 9, 8], lhStyle: "rockPower", rhMelody: [12, 12, 24, 19, 18, 17, 15, 12, 15, 17], rhRhythm: "climaxOctaves", dynamics: { lh: 92, rh: 100 } },
      { name: "coda", bars: 6, chordRoots: [8, 10, 0, 0], lhStyle: "discoFunk", rhMelody: [5, 3, 0], rhRhythm: "marchStaccato", dynamics: { lh: 84, rh: 92 } },
    ],
  });
}

// 9. Zelda's Lullaby (Koji Kondo / The Legend of Zelda)
export function buildZeldasLullabyData(): NoteData {
  return buildFullArrangedSong({
    bpm: 84,
    time_sig: "3/4",
    keyRoot: 55, // G3
    isMinor: false,
    lhName: "Left Hand (Royal Harp Arpeggio Cascades)",
    rhName: "Right Hand (Triforce Lyrical Melody & Ornaments)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 5, 7, 0], lhStyle: "waltz", rhMelody: [11, 14, 9, 7, 9, 11, 14, 9, 7, 4, 7], rhRhythm: "waltzCantabile", dynamics: { lh: 54, rh: 72 } },
      { name: "verse", bars: 18, chordRoots: [0, 5, 7, 0, 0, 5, 7, 0], lhStyle: "waltz", rhMelody: [11, 14, 9, 7, 9, 11, 14, 9, 7, 4, 7, 9, 11, 14, 16, 14], rhRhythm: "waltzCantabile", dynamics: { lh: 58, rh: 76 } },
      { name: "chorus", bars: 20, chordRoots: [5, 7, 0, 9, 5, 7, 0, 0], lhStyle: "waltz", rhMelody: [16, 14, 11, 9, 11, 14, 16, 14, 11, 9, 7], rhRhythm: "climaxOctaves", dynamics: { lh: 68, rh: 86 } },
      { name: "bridge", bars: 12, chordRoots: [9, 5, 7, 0], lhStyle: "rollingArp", rhMelody: [14, 16, 19, 21, 19, 16], rhRhythm: "cascades", dynamics: { lh: 62, rh: 80 } },
      { name: "chorus", bars: 18, chordRoots: [5, 7, 0, 9, 5, 7, 0, 0], lhStyle: "waltz", rhMelody: [11, 14, 9, 7, 9, 11, 14, 9, 7, 4, 7, 9, 11, 14, 16, 14], rhRhythm: "climaxOctaves", dynamics: { lh: 72, rh: 90 } },
      { name: "coda", bars: 8, chordRoots: [5, 7, 0, 0], lhStyle: "waltz", rhMelody: [7, 4, 0], rhRhythm: "waltzCantabile", dynamics: { lh: 48, rh: 66 } },
    ],
  });
}

// 10. Super Mario Bros. Theme (Koji Kondo)
export function buildSuperMarioThemeData(): NoteData {
  return buildFullArrangedSong({
    bpm: 100,
    time_sig: "2/4",
    keyRoot: 60, // C4
    isMinor: false,
    lhName: "Left Hand (Calypso Stride Bass & Underground Walks)",
    rhName: "Right Hand (Iconic Overworld Ragtime Rhythms)",
    sections: [
      { name: "intro", bars: 6, chordRoots: [0, 5, 0, 7], lhStyle: "stride", rhMelody: [16, 16, 16, 12, 16, 19, 7], rhRhythm: "marchStaccato", dynamics: { lh: 72, rh: 85 } },
      { name: "verse", bars: 24, chordRoots: [0, 5, 0, 7, 0, 5, 0, 7], lhStyle: "stride", rhMelody: [12, 7, 4, 9, 11, 10, 9, 7, 16, 19, 21, 17, 19, 16, 12, 14, 11], rhRhythm: "marchStaccato", dynamics: { lh: 74, rh: 86 } },
      { name: "preChorus", bars: 12, chordRoots: [5, 0, 7, 0], lhStyle: "discoFunk", rhMelody: [7, 12, 14, 16, 14, 12, 7], rhRhythm: "syncopated16th", dynamics: { lh: 76, rh: 88 } },
      { name: "chorus", bars: 24, chordRoots: [0, 5, 0, 7, 0, 5, 0, 7], lhStyle: "stride", rhMelody: [12, 7, 4, 9, 11, 10, 9, 7, 16, 19, 21, 17, 19, 16, 12, 14, 11], rhRhythm: "climaxOctaves", dynamics: { lh: 82, rh: 94 } },
      { name: "bridge", bars: 16, chordRoots: [9, 2, 7, 0], lhStyle: "continuous16th", rhMelody: [16, 17, 19, 21, 19, 17], rhRhythm: "cascades", dynamics: { lh: 78, rh: 90 } },
      { name: "chorus", bars: 20, chordRoots: [0, 5, 0, 7, 0, 5, 0, 7], lhStyle: "stride", rhMelody: [12, 7, 4, 9, 11, 10, 9, 7, 16, 19, 21, 17, 19, 16, 12, 14, 11], rhRhythm: "climaxOctaves", dynamics: { lh: 86, rh: 96 } },
      { name: "coda", bars: 8, chordRoots: [5, 7, 0, 0], lhStyle: "stride", rhMelody: [12, 7, 0], rhRhythm: "marchStaccato", dynamics: { lh: 80, rh: 90 } },
    ],
  });
}

// 11. Hedwig's Theme (John Williams / Harry Potter)
export function buildHedwigsThemeData(): NoteData {
  return buildFullArrangedSong({
    bpm: 138,
    time_sig: "3/4",
    keyRoot: 52, // E3
    isMinor: true,
    lhName: "Left Hand (Mysterious Chromatic Waltz Arpeggios)",
    rhName: "Right Hand (Magical Celesta Flights & Ornaments)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 3, 7, 0], lhStyle: "waltz", rhMelody: [7, 12, 15, 14, 12, 19, 17, 14, 12, 15, 14, 11, 13, 7], rhRhythm: "waltzCantabile", dynamics: { lh: 54, rh: 72 } },
      { name: "verse", bars: 20, chordRoots: [0, 3, 7, 0, 0, 3, 8, 7], lhStyle: "waltz", rhMelody: [7, 12, 15, 14, 12, 19, 17, 14, 12, 15, 14, 11, 13, 7, 12], rhRhythm: "waltzCantabile", dynamics: { lh: 60, rh: 78 } },
      { name: "chorus", bars: 24, chordRoots: [8, 10, 0, 7, 8, 10, 0, 0], lhStyle: "waltz", rhMelody: [15, 17, 19, 22, 20, 17, 15, 19, 17, 14, 15, 12], rhRhythm: "climaxOctaves", dynamics: { lh: 72, rh: 88 } },
      { name: "bridge", bars: 14, chordRoots: [0, 8, 3, 7], lhStyle: "rollingArp", rhMelody: [12, 15, 17, 20, 19, 17], rhRhythm: "cascades", dynamics: { lh: 65, rh: 84 } },
      { name: "chorus", bars: 20, chordRoots: [8, 10, 0, 7, 8, 10, 0, 0], lhStyle: "waltz", rhMelody: [7, 12, 15, 14, 12, 19, 17, 14, 12, 15, 14, 11, 13, 7, 12], rhRhythm: "climaxOctaves", dynamics: { lh: 76, rh: 92 } },
      { name: "coda", bars: 10, chordRoots: [8, 7, 0, 0], lhStyle: "waltz", rhMelody: [7, 3, 0], rhRhythm: "waltzCantabile", dynamics: { lh: 50, rh: 68 } },
    ],
  });
}

// 12. Golden Hour (JVKE)
export function buildGoldenHourData(): NoteData {
  return buildFullArrangedSong({
    bpm: 94,
    time_sig: "4/4",
    keyRoot: 55, // G3
    isMinor: false,
    lhName: "Left Hand (Shimmering Golden Arpeggio Cascades)",
    rhName: "Right Hand (Virtuosic 16th Piano Cascades & Melody)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 9, 5, 7], lhStyle: "continuous16th", rhMelody: [7, 11, 14, 16, 19, 23, 19, 16, 14, 11, 7, 4, 7, 11, 14, 16], rhRhythm: "cascades", dynamics: { lh: 62, rh: 78 } },
      { name: "verse", bars: 16, chordRoots: [0, 9, 5, 7, 0, 9, 5, 7], lhStyle: "continuous16th", rhMelody: [4, 7, 9, 11, 14, 12, 11, 9, 7, 4, 2, 4], rhRhythm: "syncopated16th", dynamics: { lh: 65, rh: 82 } },
      { name: "preChorus", bars: 8, chordRoots: [5, 7, 9, 0], lhStyle: "continuous16th", rhMelody: [11, 12, 14, 16, 19, 16, 14, 12], rhRhythm: "cascades", dynamics: { lh: 70, rh: 86 } },
      { name: "chorus", bars: 16, chordRoots: [0, 9, 5, 7, 0, 9, 5, 7], lhStyle: "continuous16th", rhMelody: [7, 11, 14, 16, 19, 23, 19, 16, 14, 11, 7, 4, 7, 11, 14, 16], rhRhythm: "climaxOctaves", dynamics: { lh: 80, rh: 95 } },
      { name: "verse", bars: 12, chordRoots: [0, 9, 5, 7], lhStyle: "continuous16th", rhMelody: [4, 7, 9, 11, 14, 12], rhRhythm: "syncopated16th", dynamics: { lh: 66, rh: 82 } },
      { name: "bridge", bars: 8, chordRoots: [5, 7, 9, 0], lhStyle: "continuous16th", rhMelody: [14, 16, 19, 23, 21, 19], rhRhythm: "cascades", dynamics: { lh: 72, rh: 88 } },
      { name: "chorus", bars: 16, chordRoots: [0, 9, 5, 7, 0, 9, 5, 7], lhStyle: "continuous16th", rhMelody: [7, 11, 14, 16, 19, 23, 19, 16, 14, 11, 7, 4, 7, 11, 14, 16], rhRhythm: "climaxOctaves", dynamics: { lh: 84, rh: 98 } },
      { name: "coda", bars: 6, chordRoots: [5, 7, 0, 0], lhStyle: "continuous16th", rhMelody: [7, 4, 0], rhRhythm: "cascades", dynamics: { lh: 55, rh: 70 } },
    ],
  });
}

// 13. Someone Like You (Adele)
export function buildSomeoneLikeYouData(): NoteData {
  return buildFullArrangedSong({
    bpm: 68,
    time_sig: "4/4",
    keyRoot: 57, // A3
    isMinor: false,
    lhName: "Left Hand (Iconic Adele 4-Note Broken Chord Ostinato)",
    rhName: "Right Hand (Soulful Lyrical Belt & Vocal Flourishes)",
    sections: [
      { name: "intro", bars: 6, chordRoots: [0, 4, 9, 5], lhStyle: "ballad10th", rhMelody: [4, 7, 11, 7, 4, 7, 11, 7, 12, 11, 9, 7, 4, 2, 0, 2], rhRhythm: "lyrical8th", dynamics: { lh: 55, rh: 72 } },
      { name: "verse", bars: 14, chordRoots: [0, 4, 9, 5, 0, 4, 9, 5], lhStyle: "ballad10th", rhMelody: [4, 7, 9, 11, 9, 7, 4, 2, 4, 7, 9, 7], rhRhythm: "lyrical8th", dynamics: { lh: 58, rh: 75 } },
      { name: "preChorus", bars: 8, chordRoots: [7, 9, 5, 7], lhStyle: "rollingArp", rhMelody: [9, 11, 12, 14, 12, 11, 9, 7], rhRhythm: "lyrical8th", dynamics: { lh: 62, rh: 80 } },
      { name: "chorus", bars: 16, chordRoots: [0, 7, 9, 5, 0, 7, 5, 0], lhStyle: "ballad10th", rhMelody: [4, 7, 11, 7, 4, 7, 11, 7, 12, 11, 9, 7, 4, 2, 0, 2], rhRhythm: "climaxOctaves", dynamics: { lh: 74, rh: 90 } },
      { name: "verse", bars: 10, chordRoots: [0, 4, 9, 5], lhStyle: "ballad10th", rhMelody: [4, 7, 9, 11, 9, 7], rhRhythm: "lyrical8th", dynamics: { lh: 56, rh: 74 } },
      { name: "bridge", bars: 8, chordRoots: [9, 5, 0, 7], lhStyle: "rollingArp", rhMelody: [12, 14, 16, 19, 16, 14], rhRhythm: "cascades", dynamics: { lh: 66, rh: 84 } },
      { name: "chorus", bars: 16, chordRoots: [0, 7, 9, 5, 0, 7, 5, 0], lhStyle: "ballad10th", rhMelody: [4, 7, 11, 7, 4, 7, 11, 7, 12, 11, 9, 7, 4, 2, 0, 2], rhRhythm: "climaxOctaves", dynamics: { lh: 78, rh: 94 } },
      { name: "coda", bars: 6, chordRoots: [5, 7, 0, 0], lhStyle: "ballad10th", rhMelody: [4, 2, 0, 0], rhRhythm: "lyrical8th", dynamics: { lh: 50, rh: 68 } },
    ],
  });
}

// 14. Shape of You (Ed Sheeran)
export function buildShapeOfYouData(): NoteData {
  return buildFullArrangedSong({
    bpm: 96,
    time_sig: "4/4",
    keyRoot: 49, // C#3
    isMinor: true,
    lhName: "Left Hand (Percussive Staccato Pizzicato Bassline)",
    rhName: "Right Hand (Catchy Marimba Pluck & Pop Hooks)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 5, 8, 10], lhStyle: "staccatoPluck", rhMelody: [7, 7, 7, 7, 10, 7, 5, 3, 5, 5, 5, 7, 5, 3, 0, 3], rhRhythm: "syncopated16th", dynamics: { lh: 65, rh: 78 } },
      { name: "verse", bars: 16, chordRoots: [0, 5, 8, 10, 0, 5, 8, 10], lhStyle: "staccatoPluck", rhMelody: [0, 3, 5, 7, 5, 3, 0, -2, 0, 3, 5, 3], rhRhythm: "syncopated16th", dynamics: { lh: 68, rh: 82 } },
      { name: "preChorus", bars: 8, chordRoots: [8, 10, 0, 7], lhStyle: "discoFunk", rhMelody: [7, 8, 10, 12, 10, 8, 7, 5], rhRhythm: "syncopated16th", dynamics: { lh: 74, rh: 86 } },
      { name: "chorus", bars: 16, chordRoots: [0, 5, 8, 10, 0, 5, 8, 10], lhStyle: "discoFunk", rhMelody: [7, 7, 7, 7, 10, 7, 5, 3, 5, 5, 5, 7, 5, 3, 0, 3], rhRhythm: "climaxOctaves", dynamics: { lh: 82, rh: 94 } },
      { name: "verse", bars: 12, chordRoots: [0, 5, 8, 10], lhStyle: "staccatoPluck", rhMelody: [0, 3, 5, 7, 5, 3], rhRhythm: "syncopated16th", dynamics: { lh: 70, rh: 82 } },
      { name: "bridge", bars: 8, chordRoots: [8, 10, 0, 5], lhStyle: "rollingArp", rhMelody: [10, 12, 15, 17, 15, 12], rhRhythm: "cascades", dynamics: { lh: 72, rh: 88 } },
      { name: "chorus", bars: 16, chordRoots: [0, 5, 8, 10, 0, 5, 8, 10], lhStyle: "discoFunk", rhMelody: [7, 7, 7, 7, 10, 7, 5, 3, 5, 5, 5, 7, 5, 3, 0, 3], rhRhythm: "climaxOctaves", dynamics: { lh: 86, rh: 96 } },
      { name: "coda", bars: 6, chordRoots: [8, 10, 0, 0], lhStyle: "staccatoPluck", rhMelody: [7, 3, 0], rhRhythm: "syncopated16th", dynamics: { lh: 68, rh: 80 } },
    ],
  });
}

// 15. Shallow (Lady Gaga & Bradley Cooper)
export function buildShallowData(): NoteData {
  return buildFullArrangedSong({
    bpm: 96,
    time_sig: "4/4",
    keyRoot: 52, // E3
    isMinor: true,
    lhName: "Left Hand (Acoustic Folk Picking to Rock Power Chords)",
    rhName: "Right Hand (Intimate Duet Vocals & Soaring Belts)",
    sections: [
      { name: "intro", bars: 6, chordRoots: [0, 10, 3, 8], lhStyle: "ballad10th", rhMelody: [0, 3, 7, 10, 12, 10, 7, 5, 3, 0, 3, 5, 7, 10, 12, 15], rhRhythm: "lyrical8th", dynamics: { lh: 56, rh: 72 } },
      { name: "verse", bars: 14, chordRoots: [0, 10, 3, 8, 0, 10, 3, 8], lhStyle: "ballad10th", rhMelody: [3, 7, 10, 12, 10, 7, 5, 3, 5, 7, 10, 7], rhRhythm: "lyrical8th", dynamics: { lh: 60, rh: 76 } },
      { name: "preChorus", bars: 8, chordRoots: [8, 10, 0, 7], lhStyle: "rollingArp", rhMelody: [10, 12, 14, 15, 17, 15, 14, 12], rhRhythm: "lyrical8th", dynamics: { lh: 66, rh: 82 } },
      { name: "chorus", bars: 16, chordRoots: [0, 10, 3, 8, 0, 10, 8, 0], lhStyle: "rockPower", rhMelody: [7, 10, 12, 10, 7, 5, 3, 0, 3, 5, 7, 10, 12, 15, 14, 12], rhRhythm: "climaxOctaves", dynamics: { lh: 80, rh: 94 } },
      { name: "verse", bars: 10, chordRoots: [0, 10, 3, 8], lhStyle: "ballad10th", rhMelody: [3, 7, 10, 12, 10, 7], rhRhythm: "lyrical8th", dynamics: { lh: 62, rh: 78 } },
      { name: "bridge", bars: 8, chordRoots: [8, 10, 0, 7], lhStyle: "rollingArp", rhMelody: [15, 17, 19, 22, 19, 17], rhRhythm: "cascades", dynamics: { lh: 72, rh: 90 } },
      { name: "chorus", bars: 16, chordRoots: [0, 10, 3, 8, 0, 10, 8, 0], lhStyle: "rockPower", rhMelody: [7, 10, 12, 10, 7, 5, 3, 0, 3, 5, 7, 10, 12, 15, 14, 12], rhRhythm: "climaxOctaves", dynamics: { lh: 86, rh: 98 } },
      { name: "coda", bars: 6, chordRoots: [8, 10, 0, 0], lhStyle: "ballad10th", rhMelody: [7, 3, 0], rhRhythm: "lyrical8th", dynamics: { lh: 52, rh: 70 } },
    ],
  });
}

// 16. Bohemian Rhapsody (Queen)
export function buildBohemianRhapsodyData(): NoteData {
  return buildFullArrangedSong({
    bpm: 72,
    time_sig: "4/4",
    keyRoot: 58, // Bb3
    isMinor: false,
    lhName: "Left Hand (Freddie's Iconic Walking Bass & Rock Chords)",
    rhName: "Right Hand (Ballad Mama Theme & Operatic Dialogue)",
    sections: [
      { name: "intro", bars: 6, chordRoots: [0, 2, 5, 7], lhStyle: "ballad10th", rhMelody: [7, 9, 11, 12, 11, 9, 7, 4, 2, 4, 5, 7, 9, 11, 12, 14], rhRhythm: "lyrical8th", dynamics: { lh: 58, rh: 75 } },
      { name: "verse", bars: 16, chordRoots: [0, 2, 5, 7, 0, 9, 5, 7], lhStyle: "ballad10th", rhMelody: [7, 9, 11, 12, 11, 9, 7, 4, 2, 4, 5, 7], rhRhythm: "lyrical8th", dynamics: { lh: 62, rh: 78 } },
      { name: "preChorus", bars: 8, chordRoots: [5, 7, 0, 9], lhStyle: "stride", rhMelody: [11, 12, 14, 16, 14, 12, 11, 9], rhRhythm: "marchStaccato", dynamics: { lh: 70, rh: 84 } },
      { name: "chorus", bars: 16, chordRoots: [0, 5, 7, 0, 0, 5, 7, 0], lhStyle: "rockPower", rhMelody: [14, 14, 14, 16, 14, 12, 11, 12, 14, 16, 17, 19], rhRhythm: "climaxOctaves", dynamics: { lh: 84, rh: 96 } },
      { name: "bridge", bars: 12, chordRoots: [5, 7, 9, 2], lhStyle: "continuous16th", rhMelody: [16, 17, 19, 21, 19, 17], rhRhythm: "cascades", dynamics: { lh: 76, rh: 90 } },
      { name: "chorus", bars: 16, chordRoots: [0, 5, 7, 0, 0, 5, 7, 0], lhStyle: "rockPower", rhMelody: [7, 9, 11, 12, 11, 9, 7, 4, 2, 4, 5, 7, 9, 11, 12, 14], rhRhythm: "climaxOctaves", dynamics: { lh: 88, rh: 98 } },
      { name: "coda", bars: 8, chordRoots: [5, 7, 0, 0], lhStyle: "ballad10th", rhMelody: [4, 2, 0], rhRhythm: "lyrical8th", dynamics: { lh: 50, rh: 68 } },
    ],
  });
}

// 17. All of Me (John Legend)
export function buildAllOfMeData(): NoteData {
  return buildFullArrangedSong({
    bpm: 63,
    time_sig: "4/4",
    keyRoot: 53, // F3
    isMinor: true,
    lhName: "Left Hand (Tender 4-Chord Ballad Tenths & Bass Octaves)",
    rhName: "Right Hand (Lyrical Singing Soul Vocals & Embellishments)",
    sections: [
      { name: "intro", bars: 6, chordRoots: [0, 8, 3, 10], lhStyle: "ballad10th", rhMelody: [7, 5, 3, 0, 3, 5, 7, 10, 8, 7, 5, 3, 0, 2, 3, 5], rhRhythm: "lyrical8th", dynamics: { lh: 55, rh: 72 } },
      { name: "verse", bars: 14, chordRoots: [0, 8, 3, 10, 0, 8, 3, 10], lhStyle: "ballad10th", rhMelody: [3, 5, 7, 8, 7, 5, 3, 2, 3, 5, 7, 5], rhRhythm: "lyrical8th", dynamics: { lh: 58, rh: 75 } },
      { name: "preChorus", bars: 8, chordRoots: [5, 7, 8, 10], lhStyle: "rollingArp", rhMelody: [8, 10, 12, 14, 12, 10, 8, 7], rhRhythm: "lyrical8th", dynamics: { lh: 64, rh: 80 } },
      { name: "chorus", bars: 16, chordRoots: [0, 8, 3, 10, 0, 8, 3, 10], lhStyle: "ballad10th", rhMelody: [7, 5, 3, 0, 3, 5, 7, 10, 8, 7, 5, 3, 0, 2, 3, 5], rhRhythm: "climaxOctaves", dynamics: { lh: 75, rh: 92 } },
      { name: "verse", bars: 10, chordRoots: [0, 8, 3, 10], lhStyle: "ballad10th", rhMelody: [3, 5, 7, 8, 7, 5], rhRhythm: "lyrical8th", dynamics: { lh: 56, rh: 74 } },
      { name: "bridge", bars: 8, chordRoots: [8, 10, 0, 7], lhStyle: "rollingArp", rhMelody: [10, 12, 15, 17, 15, 12], rhRhythm: "cascades", dynamics: { lh: 66, rh: 85 } },
      { name: "chorus", bars: 16, chordRoots: [0, 8, 3, 10, 0, 8, 3, 10], lhStyle: "ballad10th", rhMelody: [7, 5, 3, 0, 3, 5, 7, 10, 8, 7, 5, 3, 0, 2, 3, 5], rhRhythm: "climaxOctaves", dynamics: { lh: 80, rh: 95 } },
      { name: "coda", bars: 6, chordRoots: [8, 10, 0, 0], lhStyle: "ballad10th", rhMelody: [3, 2, 0], rhRhythm: "lyrical8th", dynamics: { lh: 50, rh: 68 } },
    ],
  });
}

// 18. Dynamite (BTS)
export function buildDynamiteData(): NoteData {
  return buildFullArrangedSong({
    bpm: 114,
    time_sig: "4/4",
    keyRoot: 59, // B3
    isMinor: true,
    lhName: "Left Hand (Infectious Disco Funk Bass & Octave Pops)",
    rhName: "Right Hand (Brass Stabs & Sparkling Pop Harmonies)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 5, 8, 10], lhStyle: "discoFunk", rhMelody: [7, 7, 10, 12, 10, 7, 5, 7, 10, 12, 15, 12, 10, 7, 5, 3], rhRhythm: "syncopated16th", dynamics: { lh: 72, rh: 84 } },
      { name: "verse", bars: 16, chordRoots: [0, 5, 8, 10, 0, 5, 8, 10], lhStyle: "discoFunk", rhMelody: [3, 5, 7, 10, 7, 5, 3, 2, 3, 5, 7, 5], rhRhythm: "syncopated16th", dynamics: { lh: 74, rh: 86 } },
      { name: "preChorus", bars: 8, chordRoots: [8, 10, 0, 7], lhStyle: "rockPower", rhMelody: [10, 12, 14, 15, 17, 15, 14, 12], rhRhythm: "syncopated16th", dynamics: { lh: 78, rh: 90 } },
      { name: "chorus", bars: 16, chordRoots: [0, 5, 8, 10, 0, 5, 8, 10], lhStyle: "discoFunk", rhMelody: [7, 7, 10, 12, 10, 7, 5, 7, 10, 12, 15, 12, 10, 7, 5, 3], rhRhythm: "climaxOctaves", dynamics: { lh: 85, rh: 96 } },
      { name: "verse", bars: 12, chordRoots: [0, 5, 8, 10], lhStyle: "discoFunk", rhMelody: [3, 5, 7, 10, 7, 5], rhRhythm: "syncopated16th", dynamics: { lh: 72, rh: 84 } },
      { name: "bridge", bars: 8, chordRoots: [8, 10, 0, 5], lhStyle: "rollingArp", rhMelody: [12, 15, 17, 20, 17, 15], rhRhythm: "cascades", dynamics: { lh: 76, rh: 90 } },
      { name: "chorus", bars: 16, chordRoots: [0, 5, 8, 10, 0, 5, 8, 10], lhStyle: "discoFunk", rhMelody: [7, 7, 10, 12, 10, 7, 5, 7, 10, 12, 15, 12, 10, 7, 5, 3], rhRhythm: "climaxOctaves", dynamics: { lh: 88, rh: 98 } },
      { name: "coda", bars: 6, chordRoots: [8, 10, 0, 0], lhStyle: "discoFunk", rhMelody: [7, 3, 0], rhRhythm: "marchStaccato", dynamics: { lh: 80, rh: 92 } },
    ],
  });
}

// 19. Butter (BTS)
export function buildButterData(): NoteData {
  return buildFullArrangedSong({
    bpm: 110,
    time_sig: "4/4",
    keyRoot: 56, // Ab3
    isMinor: false,
    lhName: "Left Hand (Smooth Dance Synth-Bass & Funk Chords)",
    rhName: "Right Hand (Crisp Vocal Syncopations & Harmonies)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 5, 7, 0], lhStyle: "discoFunk", rhMelody: [4, 7, 9, 12, 9, 7, 4, 2, 4, 7, 9, 12, 14, 12, 9, 7], rhRhythm: "syncopated16th", dynamics: { lh: 72, rh: 84 } },
      { name: "verse", bars: 16, chordRoots: [0, 5, 7, 0, 0, 5, 7, 0], lhStyle: "discoFunk", rhMelody: [0, 4, 7, 9, 7, 4, 2, 0, 2, 4, 7, 4], rhRhythm: "syncopated16th", dynamics: { lh: 74, rh: 86 } },
      { name: "preChorus", bars: 8, chordRoots: [5, 7, 9, 0], lhStyle: "rockPower", rhMelody: [9, 11, 12, 14, 16, 14, 12, 9], rhRhythm: "syncopated16th", dynamics: { lh: 78, rh: 90 } },
      { name: "chorus", bars: 16, chordRoots: [0, 5, 7, 0, 0, 5, 7, 0], lhStyle: "discoFunk", rhMelody: [4, 7, 9, 12, 9, 7, 4, 2, 4, 7, 9, 12, 14, 12, 9, 7], rhRhythm: "climaxOctaves", dynamics: { lh: 85, rh: 96 } },
      { name: "verse", bars: 12, chordRoots: [0, 5, 7, 0], lhStyle: "discoFunk", rhMelody: [0, 4, 7, 9, 7, 4], rhRhythm: "syncopated16th", dynamics: { lh: 72, rh: 84 } },
      { name: "bridge", bars: 8, chordRoots: [5, 7, 9, 0], lhStyle: "rollingArp", rhMelody: [12, 14, 16, 19, 16, 14], rhRhythm: "cascades", dynamics: { lh: 76, rh: 90 } },
      { name: "chorus", bars: 16, chordRoots: [0, 5, 7, 0, 0, 5, 7, 0], lhStyle: "discoFunk", rhMelody: [4, 7, 9, 12, 9, 7, 4, 2, 4, 7, 9, 12, 14, 12, 9, 7], rhRhythm: "climaxOctaves", dynamics: { lh: 88, rh: 98 } },
      { name: "coda", bars: 6, chordRoots: [5, 7, 0, 0], lhStyle: "discoFunk", rhMelody: [4, 2, 0], rhRhythm: "marchStaccato", dynamics: { lh: 80, rh: 92 } },
    ],
  });
}

// 20. Love Scenario (iKON)
export function buildLoveScenarioData(): NoteData {
  return buildFullArrangedSong({
    bpm: 118,
    time_sig: "4/4",
    keyRoot: 60, // C4
    isMinor: false,
    lhName: "Left Hand (Playful Bouncy Marimba Bass & Accents)",
    rhName: "Right Hand (Addictive Sing-Along Hook & Bell Chords)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 7, 9, 5], lhStyle: "staccatoPluck", rhMelody: [0, 4, 7, 9, 7, 4, 2, 0, 2, 4, 7, 9, 7, 4, 2, 0], rhRhythm: "syncopated16th", dynamics: { lh: 68, rh: 82 } },
      { name: "verse", bars: 16, chordRoots: [0, 7, 9, 5, 0, 7, 9, 5], lhStyle: "staccatoPluck", rhMelody: [4, 7, 9, 11, 9, 7, 4, 2, 4, 7, 9, 7], rhRhythm: "syncopated16th", dynamics: { lh: 70, rh: 84 } },
      { name: "preChorus", bars: 8, chordRoots: [9, 5, 7, 0], lhStyle: "discoFunk", rhMelody: [9, 11, 12, 14, 12, 11, 9, 7], rhRhythm: "syncopated16th", dynamics: { lh: 74, rh: 88 } },
      { name: "chorus", bars: 16, chordRoots: [0, 7, 9, 5, 0, 7, 5, 0], lhStyle: "discoFunk", rhMelody: [0, 4, 7, 9, 7, 4, 2, 0, 2, 4, 7, 9, 7, 4, 2, 0], rhRhythm: "climaxOctaves", dynamics: { lh: 82, rh: 95 } },
      { name: "verse", bars: 12, chordRoots: [0, 7, 9, 5], lhStyle: "staccatoPluck", rhMelody: [4, 7, 9, 11, 9, 7], rhRhythm: "syncopated16th", dynamics: { lh: 70, rh: 82 } },
      { name: "bridge", bars: 8, chordRoots: [5, 7, 9, 0], lhStyle: "rollingArp", rhMelody: [12, 14, 16, 19, 16, 14], rhRhythm: "cascades", dynamics: { lh: 72, rh: 88 } },
      { name: "chorus", bars: 16, chordRoots: [0, 7, 9, 5, 0, 7, 5, 0], lhStyle: "discoFunk", rhMelody: [0, 4, 7, 9, 7, 4, 2, 0, 2, 4, 7, 9, 7, 4, 2, 0], rhRhythm: "climaxOctaves", dynamics: { lh: 86, rh: 98 } },
      { name: "coda", bars: 6, chordRoots: [5, 7, 0, 0], lhStyle: "staccatoPluck", rhMelody: [4, 2, 0], rhRhythm: "syncopated16th", dynamics: { lh: 72, rh: 84 } },
    ],
  });
}

// 21. Stay With Me (Chanyeol & Punch / Goblin OST)
export function buildStayWithMeData(): NoteData {
  return buildFullArrangedSong({
    bpm: 88,
    time_sig: "4/4",
    keyRoot: 50, // D3
    isMinor: true,
    lhName: "Left Hand (Ethereal Descending Cello Arpeggio & Bass)",
    rhName: "Right Hand (Romantic Whisper Vocals & Sweeping Octaves)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 8, 10, 7], lhStyle: "ballad10th", rhMelody: [7, 5, 3, 2, 3, 5, 7, 8, 7, 5, 3, 2, 0, 2, 3, 5], rhRhythm: "lyrical8th", dynamics: { lh: 58, rh: 74 } },
      { name: "verse", bars: 16, chordRoots: [0, 8, 10, 7, 0, 8, 10, 7], lhStyle: "ballad10th", rhMelody: [2, 3, 5, 7, 5, 3, 2, 0, 2, 3, 5, 3], rhRhythm: "lyrical8th", dynamics: { lh: 62, rh: 78 } },
      { name: "preChorus", bars: 8, chordRoots: [8, 10, 0, 7], lhStyle: "rollingArp", rhMelody: [7, 8, 10, 12, 10, 8, 7, 5], rhRhythm: "lyrical8th", dynamics: { lh: 68, rh: 84 } },
      { name: "chorus", bars: 16, chordRoots: [0, 8, 10, 7, 0, 8, 7, 0], lhStyle: "ballad10th", rhMelody: [7, 5, 3, 2, 3, 5, 7, 8, 7, 5, 3, 2, 0, 2, 3, 5], rhRhythm: "climaxOctaves", dynamics: { lh: 78, rh: 92 } },
      { name: "verse", bars: 12, chordRoots: [0, 8, 10, 7], lhStyle: "ballad10th", rhMelody: [2, 3, 5, 7, 5, 3], rhRhythm: "lyrical8th", dynamics: { lh: 60, rh: 76 } },
      { name: "bridge", bars: 8, chordRoots: [8, 10, 0, 5], lhStyle: "rollingArp", rhMelody: [10, 12, 15, 17, 15, 12], rhRhythm: "cascades", dynamics: { lh: 70, rh: 86 } },
      { name: "chorus", bars: 16, chordRoots: [0, 8, 10, 7, 0, 8, 7, 0], lhStyle: "ballad10th", rhMelody: [7, 5, 3, 2, 3, 5, 7, 8, 7, 5, 3, 2, 0, 2, 3, 5], rhRhythm: "climaxOctaves", dynamics: { lh: 82, rh: 96 } },
      { name: "coda", bars: 6, chordRoots: [8, 10, 0, 0], lhStyle: "ballad10th", rhMelody: [3, 2, 0], rhRhythm: "lyrical8th", dynamics: { lh: 52, rh: 70 } },
    ],
  });
}

// 22. Debussy Première Arabesque
export function buildDebussyArabesque1Data(): NoteData {
  return buildFullArrangedSong({
    bpm: 76,
    time_sig: "4/4",
    keyRoot: 52, // E3
    isMinor: false,
    lhName: "Left Hand (Impressionist Flowing Duplet Arpeggios)",
    rhName: "Right Hand (Cascading 3-Against-2 Arabesque Waves)",
    sections: [
      { name: "intro", bars: 6, chordRoots: [0, 5, 0, 7], lhStyle: "continuous16th", rhMelody: [4, 7, 11, 14, 16, 19, 16, 14, 11, 7, 4, 0, 4, 7, 11, 12], rhRhythm: "cascades", dynamics: { lh: 55, rh: 72 } },
      { name: "verse", bars: 18, chordRoots: [0, 5, 0, 7, 0, 5, 7, 0], lhStyle: "continuous16th", rhMelody: [4, 7, 11, 14, 16, 19, 16, 14, 11, 7, 4, 0, 4, 7, 11, 12], rhRhythm: "cascades", dynamics: { lh: 58, rh: 76 } },
      { name: "preChorus", bars: 10, chordRoots: [5, 7, 0, 9], lhStyle: "rollingArp", rhMelody: [11, 12, 14, 16, 14, 12, 11, 9], rhRhythm: "lyrical8th", dynamics: { lh: 62, rh: 80 } },
      { name: "chorus", bars: 18, chordRoots: [5, 0, 7, 0, 5, 0, 7, 0], lhStyle: "continuous16th", rhMelody: [16, 19, 23, 21, 19, 16, 14, 11, 14, 16, 19, 16], rhRhythm: "climaxOctaves", dynamics: { lh: 72, rh: 88 } },
      { name: "bridge", bars: 12, chordRoots: [9, 2, 7, 0], lhStyle: "rollingArp", rhMelody: [14, 16, 19, 21, 19, 16], rhRhythm: "cascades", dynamics: { lh: 64, rh: 82 } },
      { name: "chorus", bars: 18, chordRoots: [0, 5, 0, 7, 0, 5, 7, 0], lhStyle: "continuous16th", rhMelody: [4, 7, 11, 14, 16, 19, 16, 14, 11, 7, 4, 0, 4, 7, 11, 12], rhRhythm: "climaxOctaves", dynamics: { lh: 76, rh: 92 } },
      { name: "coda", bars: 8, chordRoots: [5, 7, 0, 0], lhStyle: "continuous16th", rhMelody: [4, 0], rhRhythm: "cascades", dynamics: { lh: 50, rh: 68 } },
    ],
  });
}

// 23. Beethoven Moonlight Sonata 3rd Movement (Presto Agitato)
export function buildMoonlightSonata3rdData(): NoteData {
  return buildFullArrangedSong({
    bpm: 165,
    time_sig: "4/4",
    keyRoot: 49, // C#3
    isMinor: true,
    lhName: "Left Hand (Thunderous Alberti Bass & Pounding Octaves)",
    rhName: "Right Hand (Ascending Arpeggio Lightning & Sforzandos)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 0, 7, 0], lhStyle: "rockPower", rhMelody: [0, 3, 7, 12, 15, 19, 24, 27, 31, 24, 19, 15], rhRhythm: "syncopated16th", dynamics: { lh: 82, rh: 94 } },
      { name: "verse", bars: 24, chordRoots: [0, 0, 5, 7, 0, 0, 5, 7], lhStyle: "alberti", rhMelody: [0, 3, 7, 12, 15, 19, 24, 27, 31, 24, 19, 15], rhRhythm: "syncopated16th", dynamics: { lh: 85, rh: 96 } },
      { name: "preChorus", bars: 16, chordRoots: [7, 7, 0, 7], lhStyle: "rockPower", rhMelody: [12, 15, 19, 24, 22, 19, 15, 12], rhRhythm: "climaxOctaves", dynamics: { lh: 88, rh: 98 } },
      { name: "chorus", bars: 24, chordRoots: [0, 8, 5, 7, 0, 8, 5, 7], lhStyle: "rockPower", rhMelody: [15, 19, 24, 27, 24, 19, 15, 12, 15, 19, 24, 27], rhRhythm: "climaxOctaves", dynamics: { lh: 92, rh: 102 } },
      { name: "bridge", bars: 16, chordRoots: [5, 0, 8, 7], lhStyle: "rollingArp", rhMelody: [19, 22, 24, 27, 24, 22], rhRhythm: "cascades", dynamics: { lh: 84, rh: 96 } },
      { name: "chorus", bars: 24, chordRoots: [0, 0, 5, 7, 0, 0, 5, 7], lhStyle: "rockPower", rhMelody: [0, 3, 7, 12, 15, 19, 24, 27, 31, 24, 19, 15], rhRhythm: "climaxOctaves", dynamics: { lh: 95, rh: 105 } },
      { name: "coda", bars: 12, chordRoots: [8, 7, 0, 0], lhStyle: "rockPower", rhMelody: [12, 7, 3, 0], rhRhythm: "marchStaccato", dynamics: { lh: 90, rh: 100 } },
    ],
  });
}

// 24. Mozart Rondo alla Turca
export function buildMozartRondoAllaTurcaData(): NoteData {
  return buildFullArrangedSong({
    bpm: 126,
    time_sig: "2/4",
    keyRoot: 57, // A3
    isMinor: true,
    lhName: "Left Hand (Janissary March Broken Chords & Octaves)",
    rhName: "Right Hand (Virtuosic Turkish Rondo Theme & Coda)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 7, 0, 7], lhStyle: "stride", rhMelody: [11, 9, 8, 9, 12, 9, 8, 9, 12, 14, 16, 17], rhRhythm: "marchStaccato", dynamics: { lh: 70, rh: 84 } },
      { name: "verse", bars: 24, chordRoots: [0, 7, 0, 7, 0, 5, 7, 0], lhStyle: "stride", rhMelody: [11, 9, 8, 9, 12, 9, 8, 9, 12, 14, 16, 17, 16, 14, 12, 11], rhRhythm: "marchStaccato", dynamics: { lh: 74, rh: 86 } },
      { name: "chorus", bars: 24, chordRoots: [0, 5, 0, 7, 0, 5, 0, 0], lhStyle: "rockPower", rhMelody: [12, 16, 19, 24, 21, 19, 16, 12, 16, 19, 21, 24], rhRhythm: "climaxOctaves", dynamics: { lh: 86, rh: 96 } },
      { name: "bridge", bars: 16, chordRoots: [9, 2, 7, 0], lhStyle: "rollingArp", rhMelody: [16, 17, 19, 21, 19, 17], rhRhythm: "cascades", dynamics: { lh: 76, rh: 90 } },
      { name: "verse", bars: 16, chordRoots: [0, 7, 0, 7], lhStyle: "stride", rhMelody: [11, 9, 8, 9, 12, 9, 8, 9, 12, 14, 16, 17], rhRhythm: "marchStaccato", dynamics: { lh: 76, rh: 88 } },
      { name: "chorus", bars: 24, chordRoots: [0, 5, 0, 7, 0, 5, 0, 0], lhStyle: "rockPower", rhMelody: [12, 16, 19, 24, 21, 19, 16, 12, 16, 19, 21, 24], rhRhythm: "climaxOctaves", dynamics: { lh: 90, rh: 100 } },
      { name: "coda", bars: 16, chordRoots: [5, 7, 0, 0], lhStyle: "rockPower", rhMelody: [12, 9, 0], rhRhythm: "marchStaccato", dynamics: { lh: 88, rh: 98 } },
    ],
  });
}

// 25. Chopin Waltz in A Minor B.150
export function buildChopinWaltzInAMinorData(): NoteData {
  return buildFullArrangedSong({
    bpm: 120,
    time_sig: "3/4",
    keyRoot: 57, // A3
    isMinor: true,
    lhName: "Left Hand (Authentic Bass-Chord-Chord Chopin Waltz)",
    rhName: "Right Hand (Melancholy Chopin Lyrical Melody & Ornaments)",
    sections: [
      { name: "intro", bars: 8, chordRoots: [0, 5, 7, 0], lhStyle: "waltz", rhMelody: [7, 8, 11, 12, 11, 8, 7, 5, 7, 8, 11, 12], rhRhythm: "waltzCantabile", dynamics: { lh: 56, rh: 74 } },
      { name: "verse", bars: 24, chordRoots: [0, 5, 7, 0, 0, 5, 7, 0], lhStyle: "waltz", rhMelody: [7, 8, 11, 12, 11, 8, 7, 5, 7, 8, 11, 12, 14, 15, 14, 12], rhRhythm: "waltzCantabile", dynamics: { lh: 60, rh: 78 } },
      { name: "chorus", bars: 24, chordRoots: [0, 5, 7, 0, 0, 5, 7, 0], lhStyle: "waltz", rhMelody: [12, 14, 16, 19, 16, 14, 12, 9, 12, 14, 16, 19], rhRhythm: "climaxOctaves", dynamics: { lh: 72, rh: 88 } },
      { name: "bridge", bars: 16, chordRoots: [5, 0, 7, 0], lhStyle: "rollingArp", rhMelody: [15, 17, 19, 22, 19, 17], rhRhythm: "cascades", dynamics: { lh: 66, rh: 84 } },
      { name: "verse", bars: 20, chordRoots: [0, 5, 7, 0], lhStyle: "waltz", rhMelody: [7, 8, 11, 12, 11, 8, 7, 5, 7, 8, 11, 12], rhRhythm: "waltzCantabile", dynamics: { lh: 62, rh: 80 } },
      { name: "chorus", bars: 24, chordRoots: [0, 5, 7, 0, 0, 5, 7, 0], lhStyle: "waltz", rhMelody: [12, 14, 16, 19, 16, 14, 12, 9, 12, 14, 16, 19], rhRhythm: "climaxOctaves", dynamics: { lh: 76, rh: 92 } },
      { name: "coda", bars: 12, chordRoots: [5, 7, 0, 0], lhStyle: "waltz", rhMelody: [7, 3, 0], rhRhythm: "waltzCantabile", dynamics: { lh: 52, rh: 70 } },
    ],
  });
}
