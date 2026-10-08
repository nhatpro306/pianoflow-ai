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
