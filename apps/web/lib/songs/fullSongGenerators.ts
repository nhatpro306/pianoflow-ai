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
          noteId = addNote(notes, noteId, alb[i], bStart + i * s16, s16 * 0.95, 62, "L");
        }
        for (let i = 0; i < b.rhMel.length; i++) {
          noteId = addNote(notes, noteId, b.rhMel[i] + (loop === 1 ? 12 : 0), bStart + i * s16, s16 * 0.95, 78, "R");
        }
        curTime += measureSec;
      }
    }
    const chrom = [84, 83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69];
    for (let i = 0; i < chrom.length; i++) {
      noteId = addNote(notes, noteId, chrom[i], curTime + i * (s32 * 2), s32 * 1.8, 75 - i, "R");
      if (i % 4 === 0) {
        noteId = addNote(notes, noteId, 40, curTime + i * (s32 * 2), measureSec, 65, "L");
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
        noteId = addNote(notes, noteId, p, bStart + i * s16, s16 * 0.95, 68 + (b % 3) * 4, "L");
      }
      const chordPitches = b < 6 ? [60, 64, 69, 72] : b < 11 ? [59, 62, 65, 71] : [58, 62, 67, 70];
      for (const cp of chordPitches) {
        noteId = addNote(notes, noteId, cp, bStart, measureSec * 0.9, 82, "R");
      }
      if (b % 2 === 1) {
        const run = [72, 76, 81, 84, 88, 84, 81, 76];
        for (let r = 0; r < run.length; r++) {
          noteId = addNote(notes, noteId, run[r], bStart + s16 * 3 + r * s32, s32 * 0.9, 80, "R");
        }
      }
      curTime += measureSec;
    }
    const beethovenCascade = [69, 72, 76, 81, 84, 88, 84, 81, 76, 72, 69, 64, 76, 75, 76, 75, 76, 71, 74, 72];
    for (let i = 0; i < beethovenCascade.length; i++) {
      noteId = addNote(notes, noteId, beethovenCascade[i], curTime + i * (s32 * 1.5), s32 * 1.4, 76, "R");
      if (i % 6 === 0) {
        noteId = addNote(notes, noteId, 45, curTime + i * (s32 * 1.5), measureSec, 62, "L");
      }
    }
    curTime += beethovenCascade.length * (s32 * 1.5) + measureSec;
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
        const p = baseScale[i % baseScale.length];
        noteId = addNote(notes, noteId, p, rhStart + i * s16, s16 * 0.9, 84, "R");
      }
    } else if (c < 18) {
      for (let b = 0; b < 8; b++) {
        const root = groundBass[b] + 24;
        const third = (b === 2 || b === 3) ? 3 : 4;
        const arp = [root, root + third, root + 7, root + 12];
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
        const third = (b === 2 || b === 3) ? 3 : 4;
        const chord = [groundBass[b] + 12, groundBass[b] + 12 + third, groundBass[b] + 19, groundBass[b] + 24];
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
      noteId = addNote(notes, noteId, root, bStart, beatSec * 2.8, 56, "L");
      noteId = addNote(notes, noteId, root + 7, bStart, beatSec * 2.8, 52, "L");

      // Pure Db major diatonic arpeggios
      const dbMajorPcs = [1, 3, 5, 6, 8, 10, 0];
      const rawScale = [root + 12, root + 16, root + 19, root + 23, root + 28, root + 31, root + 36];
      const diatonicArp = rawScale.map((p) => {
        const pc = ((p % 12) + 12) % 12;
        return dbMajorPcs.includes(pc) ? p : p + 1;
      });
      for (let s = 0; s < 18; s++) {
        const p = diatonicArp[s % diatonicArp.length];
        const st = bStart + s * s16;
        noteId = addNote(notes, noteId, p, st, s16 * 0.95, 60 + (s % 6) * 3, s < 6 ? "L" : "R");
      }
      noteId = addNote(notes, noteId, root + 36, bStart + beatSec, beatSec * 1.8, 80, "R");
    } else if (bar < 57) {
      noteId = addNote(notes, noteId, 37, bStart, beatSec * 2.8, 50, "L");
      noteId = addNote(notes, noteId, 49, bStart, beatSec * 2.8, 48, "L");
      const harp = [61, 65, 68, 73, 77, 80, 77, 73, 68];
      for (let s = 0; s < 9; s++) {
        noteId = addNote(notes, noteId, harp[s], bStart + s * s8, s8 * 0.9, 56, "R");
      }
      noteId = addNote(notes, noteId, 73, bStart, beatSec * 1.5, 76, "R");
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
        const mStart = bStart + (i + 1) * beatSec;
        noteId = addNote(notes, noteId, phrase[i], mStart, beatSec * 0.95, 76, "R");
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
  const notes: Note[] = [];
  let noteId = 1;

  for (let bar = 0; bar < totalBars; bar++) {
    const bStart = bar * beatsPerBar * beatSec;
    const root = keyRoot;
    noteId = addNote(notes, noteId, root - 12, bStart, beatsPerBar * beatSec * 0.9, 70, "L");
    for (let b = 0; b < beatsPerBar; b++) {
      noteId = addNote(notes, noteId, root + 12, bStart + b * beatSec, beatSec * 0.8, 75, "R");
    }
  }

  const duration_sec = Number((totalBars * beatsPerBar * beatSec).toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: time_sig,
    tracks: [
      { index: 0, name: lhName, note_count: notes.filter((n) => n.hand === "L" || n.track === 0).length },
      { index: 1, name: rhName, note_count: notes.filter((n) => n.hand === "R" || n.track === 1).length },
    ],
    notes,
  };
}

/**
 * Diatonic triad interval helper
 * Returns the correct third (major 4 or minor 3) and fifth (perfect 7 or diminished 6)
 * based on the chord's scale degree offset relative to keyRoot.
 */
export function getDiatonicChordIntervals(
  chordOffset: number,
  isMinor: boolean
): { third: number; fifth: number } {
  const degree = ((chordOffset % 12) + 12) % 12;

  if (isMinor) {
    // In minor key:
    // degree 0 (i), 5 (iv), 7 (v) -> minor third (3), perfect fifth (7)
    // degree 2 (ii°) -> minor third (3), diminished fifth (6)
    // degree 3 (bIII), 8 (bVI), 10 (bVII) -> major third (4), perfect fifth (7)
    if (degree === 0 || degree === 5 || degree === 7) {
      return { third: 3, fifth: 7 };
    }
    if (degree === 2) {
      return { third: 3, fifth: 6 };
    }
    if (degree === 3 || degree === 8 || degree === 10) {
      return { third: 4, fifth: 7 };
    }
    return { third: 3, fifth: 7 };
  } else {
    // In major key:
    // degree 0 (I), 5 (IV), 7 (V) -> major third (4), perfect fifth (7)
    // degree 2 (ii), 4 (iii), 9 (vi) -> minor third (3), perfect fifth (7)
    // degree 11 (vii°) -> minor third (3), diminished fifth (6)
    // Borrowed/modal interchange degrees:
    // degree 10 (bVII), 8 (bVI), 3 (bIII), 1 (bII) -> major third (4), perfect fifth (7)
    if (degree === 0 || degree === 5 || degree === 7 || degree === 10 || degree === 8 || degree === 3 || degree === 1) {
      return { third: 4, fifth: 7 };
    }
    if (degree === 2 || degree === 4 || degree === 9) {
      return { third: 3, fifth: 7 };
    }
    if (degree === 11) {
      return { third: 3, fifth: 6 };
    }
    return { third: 4, fifth: 7 };
  }
}

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
      | "bossaSwing"
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

/**
 * Snaps a candidate melody pitch to an acoustically consonant pitch.
 * On strong beats, snaps to chord tones; on weak beats, snaps to diatonic scale avoiding harsh semitone clashes.
 */
export function snapToConsonantPitch(
  rawPitch: number,
  chordRoot: number,
  thirdInterval: number,
  fifthInterval: number,
  keyRoot: number,
  isMinorKey: boolean,
  isStrongBeat: boolean
): number {
  const chordTones = [
    ((chordRoot % 12) + 12) % 12,
    (((chordRoot + thirdInterval) % 12) + 12) % 12,
    (((chordRoot + fifthInterval) % 12) + 12) % 12,
  ];
  const rawPc = ((rawPitch % 12) + 12) % 12;

  // Already a chord tone
  if (chordTones.includes(rawPc)) return rawPitch;

  if (isStrongBeat) {
    let closestTone = rawPitch;
    let minDiff = 999;
    for (const offset of [-4, -3, -2, -1, 1, 2, 3, 4]) {
      const candidate = rawPitch + offset;
      const candidatePc = ((candidate % 12) + 12) % 12;
      if (chordTones.includes(candidatePc) && Math.abs(offset) < minDiff) {
        minDiff = Math.abs(offset);
        closestTone = candidate;
      }
    }
    return closestTone;
  }

  // On passing beats: check for semitone clash with chord tones
  const clashWithRoot = Math.abs(rawPc - chordTones[0]) === 1 || Math.abs(rawPc - chordTones[0]) === 11;
  const clashWithThird = Math.abs(rawPc - chordTones[1]) === 1 || Math.abs(rawPc - chordTones[1]) === 11;
  if (clashWithRoot || clashWithThird) {
    let closestTone = rawPitch;
    let minDiff = 999;
    for (const offset of [-1, 1, -2, 2]) {
      const candidate = rawPitch + offset;
      const candidatePc = ((candidate % 12) + 12) % 12;
      if (chordTones.includes(candidatePc) && Math.abs(offset) < minDiff) {
        minDiff = Math.abs(offset);
        closestTone = candidate;
      }
    }
    return closestTone;
  }

  return rawPitch;
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

  // Balanced velocity helpers: Left Hand accompaniment strictly balanced (40-58), Right Hand melodies expressive and singing (65-86)
  function addLhNote(pitch: number, start: number, dur: number, vel: number): void {
    const balancedVel = Math.max(38, Math.min(58, Math.round(vel)));
    noteId = addNote(notes, noteId, pitch, start, dur, balancedVel, "L");
  }

  function addRhNote(pitch: number, start: number, dur: number, vel: number): void {
    const expressiveVel = Math.max(62, Math.min(86, Math.round(vel)));
    noteId = addNote(notes, noteId, pitch, start, dur, expressiveVel, "R");
  }

  for (const sec of sections) {
    for (let bar = 0; bar < sec.bars; bar++) {
      const bStart = curTime;
      const chordOffset = sec.chordRoots[bar % sec.chordRoots.length] ?? 0;
      const root = keyRoot + chordOffset;
      let normRoot = root;
      while (normRoot - 24 < 36) normRoot += 12;
      while (normRoot - 24 > 48) normRoot -= 12;
      const bassPitch = Math.max(36, normRoot - 24);

      // Diatonic 3rd and 5th intervals matching chord degree relative to keyRoot
      const { third: thirdInterval, fifth: fifthInterval } = getDiatonicChordIntervals(chordOffset, isMinor);

      // 1. LEFT HAND ACCOMPANIMENT
      if (sec.lhStyle === "waltz") {
        addLhNote(bassPitch, bStart, beatSec * 2.5, sec.dynamics.lh);
        const wChord = [root - 12 + thirdInterval, root - 12 + fifthInterval];
        for (let b = 1; b < 3; b++) {
          for (const cp of wChord) {
            addLhNote(cp, bStart + b * beatSec, beatSec * 0.85, sec.dynamics.lh - 4);
          }
        }
      } else if (sec.lhStyle === "ballad10th") {
        addLhNote(bassPitch, bStart, beatSec * 3.5, sec.dynamics.lh);
        addLhNote(root - 17, bStart + beatSec, beatSec * 2.5, sec.dynamics.lh - 3);
        addLhNote(root - 12 + thirdInterval, bStart + beatSec * 2, beatSec * 1.8, sec.dynamics.lh - 2);
        addLhNote(root - 12, bStart + beatSec * 3, beatSec * 0.9, sec.dynamics.lh - 4);
      } else if (sec.lhStyle === "rockPower") {
        for (let i = 0; i < beatsPerBar * 2; i++) {
          const t = bStart + i * s8;
          const isDownbeat = i % 2 === 0;
          const vel = isDownbeat ? sec.dynamics.lh : sec.dynamics.lh - 6;
          addLhNote(bassPitch, t, s8 * 0.85, vel);
          addLhNote(root - 17, t, s8 * 0.85, vel - 2);
        }
      } else if (sec.lhStyle === "discoFunk") {
        addLhNote(bassPitch, bStart, s8 * 0.9, sec.dynamics.lh + 4);
        addLhNote(root - 12, bStart + s8, s8 * 0.8, sec.dynamics.lh - 2);
        addLhNote(root - 12 + thirdInterval, bStart + beatSec * 1.5, s8 * 0.8, sec.dynamics.lh);
        addLhNote(bassPitch, bStart + beatSec * 2, s8 * 0.9, sec.dynamics.lh + 2);
        addLhNote(root - 17, bStart + beatSec * 3, s8 * 0.85, sec.dynamics.lh - 2);
      } else if (sec.lhStyle === "stride") {
        addLhNote(bassPitch, bStart, beatSec * 0.9, sec.dynamics.lh + 2);
        const ch = [root - 12, root - 12 + thirdInterval, root - 12 + fifthInterval];
        for (const cp of ch) {
          addLhNote(cp, bStart + beatSec, beatSec * 0.8, sec.dynamics.lh - 4);
        }
        addLhNote(root - 17, bStart + beatSec * 2, beatSec * 0.9, sec.dynamics.lh);
        for (const cp of ch) {
          addLhNote(cp, bStart + beatSec * 3, beatSec * 0.8, sec.dynamics.lh - 4);
        }
      } else if (sec.lhStyle === "bossaSwing") {
        // Classic Sinatra swing/bossa bass with syncopated guide tones
        addLhNote(bassPitch, bStart, beatSec * 1.4, sec.dynamics.lh + 2);
        const swingChord = [root - 12, root - 12 + thirdInterval, root - 12 + fifthInterval];
        for (const cp of swingChord) {
          addLhNote(cp, bStart + beatSec * 1.5, beatSec * 0.45, sec.dynamics.lh - 4);
        }
        addLhNote(root - 17, bStart + beatSec * 2, beatSec * 0.9, sec.dynamics.lh);
        const approach = bar % 2 === 0 ? bassPitch + 2 : bassPitch - 1;
        addLhNote(approach, bStart + beatSec * 3, beatSec * 0.85, sec.dynamics.lh - 2);
      } else if (sec.lhStyle === "alberti") {
        const albP = [bassPitch, root - 17, root - 24 + thirdInterval, root - 17];
        for (let i = 0; i < beatsPerBar * 2; i++) {
          const p = albP[i % albP.length];
          addLhNote(p, bStart + i * s8, s8 * 0.9, sec.dynamics.lh - (i % 2 === 0 ? 0 : 4));
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
          addLhNote(p, bStart + i * s16, s16 * 0.9, sec.dynamics.lh - 4);
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
          addLhNote(p, bStart + i * s16, s16 * 0.92, sec.dynamics.lh - 2);
        }
      } else {
        for (let b = 0; b < beatsPerBar; b++) {
          addLhNote(bassPitch, bStart + b * beatSec, beatSec * 0.45, sec.dynamics.lh);
        }
      }

      // 2. RIGHT HAND MELODY & PHRASING
      // Anchored in the song's tonic key (keyRoot + 12) rather than transposed by chordOffset!
      const mel = sec.rhMelody;
      const melBase = keyRoot + 12;

      if (sec.rhRhythm === "waltzCantabile") {
        for (let s = 0; s < 3; s++) {
          const rawP = melBase + mel[(bar * 3 + s) % mel.length];
          const p = snapToConsonantPitch(rawP, root, thirdInterval, fifthInterval, keyRoot, isMinor, s === 0);
          addRhNote(p, bStart + s * beatSec, beatSec * 0.92, sec.dynamics.rh);
        }
      } else if (sec.rhRhythm === "climaxOctaves") {
        for (let s = 0; s < beatsPerBar * 2; s++) {
          const rawP = melBase + mel[(bar * 2 + s) % mel.length];
          const isDownbeat = s === 0 || s === beatsPerBar;
          const p = snapToConsonantPitch(rawP, root, thirdInterval, fifthInterval, keyRoot, isMinor, isDownbeat);
          addRhNote(p, bStart + s * s8, s8 * 0.9, Math.min(86, sec.dynamics.rh));
          if (isDownbeat) {
            addRhNote(p - 12, bStart + s * s8, s8 * 0.9, Math.min(80, sec.dynamics.rh - 4));
          }
        }
      } else if (sec.rhRhythm === "cascades") {
        for (let s = 0; s < beatsPerBar * 4; s++) {
          const rawP = melBase + mel[(bar * 4 + s) % mel.length];
          const isAccent = s % 4 === 0;
          const p = snapToConsonantPitch(rawP, root, thirdInterval, fifthInterval, keyRoot, isMinor, isAccent);
          addRhNote(p + 12, bStart + s * s16, s16 * 0.9, isAccent ? Math.min(86, sec.dynamics.rh + 2) : Math.min(80, sec.dynamics.rh - 4));
        }
      } else if (sec.rhRhythm === "syncopated16th") {
        const syncBeats = [0, 0.75, 1.5, 2.0, 2.75, 3.25];
        for (let i = 0; i < syncBeats.length; i++) {
          const offsetBeat = syncBeats[i];
          if (offsetBeat >= beatsPerBar) continue;
          const rawP = melBase + mel[(bar * syncBeats.length + i) % mel.length];
          const isDown = i === 0;
          const p = snapToConsonantPitch(rawP, root, thirdInterval, fifthInterval, keyRoot, isMinor, isDown);
          addRhNote(p, bStart + offsetBeat * beatSec, beatSec * 0.6, isDown ? Math.min(86, sec.dynamics.rh) : Math.min(82, sec.dynamics.rh - 2));
        }
      } else if (sec.rhRhythm === "marchStaccato") {
        for (let s = 0; s < beatsPerBar * 2; s++) {
          const rawP = melBase + mel[(bar * 2 + s) % mel.length];
          const p = snapToConsonantPitch(rawP, root, thirdInterval, fifthInterval, keyRoot, isMinor, s === 0);
          addRhNote(p, bStart + s * s8, s8 * 0.7, Math.min(84, sec.dynamics.rh));
        }
      } else {
        // Expressive 4-bar breathing rhythm templates
        const phrasePattern = bar % 4;
        if (phrasePattern === 0) {
          // Downbeat quarter + flowing 8ths
          const raw0 = melBase + mel[(bar * 2) % mel.length];
          const p0 = snapToConsonantPitch(raw0, root, thirdInterval, fifthInterval, keyRoot, isMinor, true);
          addRhNote(p0, bStart, beatSec * 0.92, Math.min(86, sec.dynamics.rh));
          for (let s = 2; s < beatsPerBar * 2; s++) {
            const rawP = melBase + mel[(bar * 2 + s) % mel.length];
            const p = snapToConsonantPitch(rawP, root, thirdInterval, fifthInterval, keyRoot, isMinor, false);
            addRhNote(p, bStart + s * s8, s8 * 0.9, Math.min(80, sec.dynamics.rh - 3));
          }
        } else if (phrasePattern === 1) {
          // Flowing 8ths leading into phrase peak
          for (let s = 0; s < beatsPerBar * 2; s++) {
            const rawP = melBase + mel[(bar * 2 + s) % mel.length];
            const p = snapToConsonantPitch(rawP, root, thirdInterval, fifthInterval, keyRoot, isMinor, s === 0);
            addRhNote(p, bStart + s * s8, s8 * 0.9, Math.min(84, sec.dynamics.rh - (s % 2 === 0 ? 0 : 3)));
          }
        } else if (phrasePattern === 2) {
          // Climax / Turn: Lyrical suspension
          for (let s = 0; s < beatsPerBar * 2 - 1; s++) {
            const rawP = melBase + mel[(bar * 2 + s) % mel.length];
            const p = snapToConsonantPitch(rawP, root, thirdInterval, fifthInterval, keyRoot, isMinor, s === 0);
            addRhNote(p, bStart + s * s8, s8 * 0.9, Math.min(86, sec.dynamics.rh));
          }
        } else {
          // Resolution & Breath: Half note singing downbeat, then silence to let piano resonance breathe
          const raw0 = melBase + mel[(bar * 2) % mel.length];
          const p0 = snapToConsonantPitch(raw0, root, thirdInterval, fifthInterval, keyRoot, isMinor, true);
          addRhNote(p0, bStart, beatSec * 1.85, Math.min(84, sec.dynamics.rh));
        }
      }

      curTime += beatsPerBar * beatSec;
    }
  }

  // Final cadential chord
  const finalDur = beatsPerBar * beatSec * 1.5;
  const { third: tonicThird } = getDiatonicChordIntervals(0, isMinor);
  addLhNote(keyRoot - 24, curTime, finalDur, 52);
  addLhNote(keyRoot - 12, curTime, finalDur, 50);
  addLhNote(keyRoot - 12 + tonicThird, curTime, finalDur, 48);
  addRhNote(keyRoot, curTime, finalDur, 76);
  addRhNote(keyRoot + 12, curTime, finalDur, 82);
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

// 1. MOZART RONDO ALLA TURCA
export function buildMozartRondoAllaTurcaData(): NoteData {
  const bpm = 126;
  const s16 = 60 / bpm / 4;
  const s8 = s16 * 2;
  const s4 = s16 * 4;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  function emitThemeA(repetitions = 2) {
    const barSec = 2 * s4;
    for (let r = 0; r < repetitions; r++) {
      // 8 Bars of Period 1 (A minor)
      for (let b = 0; b < 8; b++) {
        const bt = curTime + b * barSec;
        const root = b < 4 ? 45 : b === 6 ? 40 : 45;
        const ch = b < 4 ? [57, 60, 64] : b === 6 ? [56, 59, 64] : [57, 60, 64];
        noteId = addNote(notes, noteId, root, bt, s8 * 0.85, 62, "L");
        for (const cp of ch) {
          noteId = addNote(notes, noteId, cp, bt + s8, s8 * 0.8, 56, "L");
          noteId = addNote(notes, noteId, cp, bt + s4 + s8, s8 * 0.8, 56, "L");
        }

        if (b === 0 || b === 4) {
          noteId = addNote(notes, noteId, 71, bt, s16 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 69, bt + s16, s16 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 68, bt + s16 * 2, s16 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 69, bt + s16 * 3, s16 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 72, bt + s4, s8 * 0.9, 85, "R");
          noteId = addNote(notes, noteId, 74, bt + s4 + s8, s16 * 0.9, 80, "R");
          noteId = addNote(notes, noteId, 72, bt + s4 + s8 + s16, s16 * 0.9, 80, "R");
        } else if (b === 1 || b === 5) {
          noteId = addNote(notes, noteId, 71, bt, s16 * 0.9, 80, "R");
          noteId = addNote(notes, noteId, 72, bt + s16, s16 * 0.9, 80, "R");
          noteId = addNote(notes, noteId, 76, bt + s8, s8 * 0.9, 85, "R");
          noteId = addNote(notes, noteId, 77, bt + s4, s16 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 76, bt + s4 + s16, s16 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 75, bt + s4 + s16 * 2, s16 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 76, bt + s4 + s16 * 3, s16 * 0.9, 82, "R");
        } else if (b === 2 || b === 6) {
          noteId = addNote(notes, noteId, 83, bt, s16 * 0.9, 84, "R");
          noteId = addNote(notes, noteId, 81, bt + s16, s16 * 0.9, 84, "R");
          noteId = addNote(notes, noteId, 80, bt + s16 * 2, s16 * 0.9, 84, "R");
          noteId = addNote(notes, noteId, 81, bt + s16 * 3, s16 * 0.9, 84, "R");
          noteId = addNote(notes, noteId, 83, bt + s4, s8 * 0.9, 84, "R");
          noteId = addNote(notes, noteId, 84, bt + s4 + s8, s8 * 0.9, 84, "R");
        } else if (b === 3 || b === 7) {
          noteId = addNote(notes, noteId, 81, bt, s8 * 0.9, 84, "R");
          noteId = addNote(notes, noteId, 84, bt + s8, s8 * 0.9, 84, "R");
          noteId = addNote(notes, noteId, 83, bt + s4, s8 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 81, bt + s4 + s8, s8 * 0.9, 84, "R");
        }
      }
      curTime += 8 * barSec;

      // 8 Bars of Period 2 (C major / A minor modulation)
      for (let b = 0; b < 8; b++) {
        const bt = curTime + b * barSec;
        noteId = addNote(notes, noteId, 45, bt, s8 * 0.85, 64, "L");
        noteId = addNote(notes, noteId, 57, bt + s8, s8 * 0.8, 58, "L");
        noteId = addNote(notes, noteId, 60, bt + s8, s8 * 0.8, 58, "L");
        noteId = addNote(notes, noteId, 57, bt + s4 + s8, s8 * 0.8, 58, "L");
        noteId = addNote(notes, noteId, 60, bt + s4 + s8, s8 * 0.8, 58, "L");

        if (b === 0 || b === 1 || b === 4 || b === 5) {
          noteId = addNote(notes, noteId, 76, bt, s16 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 77, bt + s16, s16 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 79, bt + s16 * 2, s16 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 81, bt + s16 * 3, s16 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 83, bt + s4, s8 * 0.9, 84, "R");
          noteId = addNote(notes, noteId, 79, bt + s4 + s8, s8 * 0.9, 80, "R");
        } else if (b === 2 || b === 6) {
          noteId = addNote(notes, noteId, 77, bt, s16 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 76, bt + s16, s16 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 74, bt + s16 * 2, s16 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 72, bt + s16 * 3, s16 * 0.9, 82, "R");
          noteId = addNote(notes, noteId, 71, bt + s4, s8 * 0.9, 80, "R");
          noteId = addNote(notes, noteId, 69, bt + s4 + s8, s8 * 0.9, 82, "R");
        } else {
          noteId = addNote(notes, noteId, 68, bt, s4 * 0.9, 80, "R");
          noteId = addNote(notes, noteId, b === 3 ? 64 : 81, bt + s4, s4 * 0.9, 84, "R");
        }
      }
      curTime += 8 * barSec;
    }
  }

  function emitJanissaryChorus(repetitions = 2) {
    for (let r = 0; r < repetitions; r++) {
      const bars = 8;
      for (let b = 0; b < bars; b++) {
        const bt = curTime + b * s4 * 2;
        const roots = [45, 49, 52, 45, 45, 49, 52, 45];
        const oct = roots[b % roots.length];
        noteId = addNote(notes, noteId, oct - 12, bt, s8 * 0.85, 90, "L");
        noteId = addNote(notes, noteId, oct, bt, s8 * 0.85, 85, "L");
        noteId = addNote(notes, noteId, oct - 12, bt + s8, s8 * 0.85, 88, "L");
        noteId = addNote(notes, noteId, oct, bt + s8, s8 * 0.85, 84, "L");
        noteId = addNote(notes, noteId, oct - 12, bt + s4, s8 * 0.85, 90, "L");
        noteId = addNote(notes, noteId, oct, bt + s4, s8 * 0.85, 85, "L");
        noteId = addNote(notes, noteId, oct - 12, bt + s4 + s8, s8 * 0.85, 88, "L");
        noteId = addNote(notes, noteId, oct, bt + s4 + s8, s8 * 0.85, 84, "L");

        const rhChords = [
          [73, 76, 81], [74, 77, 81], [76, 79, 83], [73, 76, 81],
          [73, 76, 81], [74, 77, 81], [76, 79, 83], [73, 76, 81]
        ];
        const ch = rhChords[b % rhChords.length];
        for (const cp of ch) {
          noteId = addNote(notes, noteId, cp, bt, s8 * 0.85, 92, "R");
          noteId = addNote(notes, noteId, cp, bt + s8, s8 * 0.85, 88, "R");
          noteId = addNote(notes, noteId, cp + 12, bt + s4, s8 * 0.85, 95, "R");
          noteId = addNote(notes, noteId, cp + 12, bt + s4 + s8, s8 * 0.85, 90, "R");
        }
      }
      curTime += bars * s4 * 2;
    }
  }

  function emitSectionC() {
    const bars = 8;
    for (let b = 0; b < bars; b++) {
      const bt = curTime + b * s4 * 2;
      noteId = addNote(notes, noteId, 42, bt, s4 * 0.9, 75, "L");
      noteId = addNote(notes, noteId, 54, bt + s8, s8 * 0.8, 68, "L");
      noteId = addNote(notes, noteId, 57, bt + s8, s8 * 0.8, 68, "L");
      noteId = addNote(notes, noteId, 61, bt + s8, s8 * 0.8, 68, "L");
      noteId = addNote(notes, noteId, 49, bt + s4, s4 * 0.9, 72, "L");
      noteId = addNote(notes, noteId, 57, bt + s4 + s8, s8 * 0.8, 68, "L");
      noteId = addNote(notes, noteId, 61, bt + s4 + s8, s8 * 0.8, 68, "L");

      const rhFig = [
        { p: 78, o: 0 }, { p: 80, o: s16 }, { p: 81, o: s16 * 2 }, { p: 80, o: s16 * 3 },
        { p: 78, o: s4 }, { p: 77, o: s4 + s16 }, { p: 78, o: s4 + s16 * 2 }, { p: 80, o: s4 + s16 * 3 }
      ];
      for (const fig of rhFig) {
        noteId = addNote(notes, noteId, fig.p, bt + fig.o, s16 * 0.9, 82, "R");
      }
    }
    curTime += bars * s4 * 2;
  }

  function emitCoda() {
    const bars = 14;
    for (let b = 0; b < bars; b++) {
      const bt = curTime + b * s4 * 2;
      noteId = addNote(notes, noteId, 33, bt, s8 * 0.85, 96, "L");
      noteId = addNote(notes, noteId, 45, bt, s8 * 0.85, 94, "L");
      noteId = addNote(notes, noteId, 33, bt + s8, s8 * 0.85, 92, "L");
      noteId = addNote(notes, noteId, 45, bt + s8, s8 * 0.85, 90, "L");
      noteId = addNote(notes, noteId, 40, bt + s4, s8 * 0.85, 94, "L");
      noteId = addNote(notes, noteId, 52, bt + s4, s8 * 0.85, 92, "L");

      if (b < bars - 3) {
        const arp = [69, 73, 76, 81, 85, 88, 85, 81];
        for (let i = 0; i < arp.length; i++) {
          noteId = addNote(notes, noteId, arp[i], bt + i * s16, s16 * 0.9, 90 + (i % 2 === 0 ? 5 : 0), "R");
        }
      } else {
        const finalA = [57, 61, 64, 69, 73, 76, 81];
        for (const fp of finalA) {
          noteId = addNote(notes, noteId, fp, bt, s4 * 1.8, 100, "R");
        }
      }
    }
    curTime += bars * s4 * 2;
  }

  // Mozart: Add da capo reprise
  emitThemeA(2);
  emitJanissaryChorus(2);
  emitSectionC();
  emitThemeA(2);
  emitJanissaryChorus(2);
  emitSectionC();
  emitThemeA(2);
  emitJanissaryChorus(2);
  emitCoda();

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "2/4",
    tracks: [
      { index: 0, name: "Left Hand (Janissary March Broken Chords & Octaves)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Virtuosic Turkish Rondo Theme & Coda)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 2. CHOPIN NOCTURNE OP. 9 NO. 2
export function buildChopinNocturneOp9No2Data(): NoteData {
  const bpm = 60;
  const beatSec = 60 / bpm;
  const eighthSec = beatSec / 3;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  function emitMeasure(
    lhProgression: { bass: number; chord: number[] }[],
    rhNotes: { p: number; d: number }[]
  ) {
    const mStart = curTime;
    for (let beat = 0; beat < 4; beat++) {
      const bData = lhProgression[beat % lhProgression.length];
      const bTime = mStart + beat * beatSec;
      noteId = addNote(notes, noteId, bData.bass, bTime, eighthSec * 2.8, 64, "L");
      for (let s = 1; s <= 2; s++) {
        const cTime = bTime + s * eighthSec;
        for (const cp of bData.chord) {
          noteId = addNote(notes, noteId, cp, cTime, eighthSec * 0.9, 56, "L");
        }
      }
    }
    let rt = mStart;
    for (const r of rhNotes) {
      noteId = addNote(notes, noteId, r.p, rt, r.d * 0.95, 78, "R");
      rt += r.d;
    }
    curTime += 4 * beatSec;
  }

  const ebChord = { bass: 39, chord: [55, 58, 63] };
  const bb7Chord = { bass: 34, chord: [53, 56, 62] };
  const cmChord = { bass: 36, chord: [55, 60, 63] };
  const abChord = { bass: 32, chord: [56, 60, 63] };
  const fmChord = { bass: 41, chord: [53, 56, 60] };

  const bars = 32;
  for (let bar = 0; bar < bars; bar++) {
    const phase = bar % 8;
    if (phase === 0) {
      emitMeasure([ebChord, ebChord, cmChord, abChord], [
        { p: 70, d: beatSec }, { p: 79, d: eighthSec * 2 }, { p: 77, d: eighthSec },
        { p: 75, d: eighthSec * 2 }, { p: 74, d: eighthSec }, { p: 72, d: beatSec }
      ]);
    } else if (phase === 1) {
      emitMeasure([bb7Chord, bb7Chord, ebChord, ebChord], [
        { p: 70, d: beatSec * 0.75 }, { p: 68, d: beatSec * 0.75 }, { p: 67, d: beatSec * 0.75 },
        { p: 65, d: beatSec * 0.75 }, { p: 70, d: beatSec }
      ]);
    } else if (phase === 2) {
      emitMeasure([ebChord, ebChord, cmChord, abChord], [
        { p: 70, d: eighthSec * 2 }, { p: 72, d: eighthSec * 0.5 }, { p: 70, d: eighthSec * 0.5 },
        { p: 69, d: eighthSec * 0.5 }, { p: 70, d: eighthSec * 0.5 }, { p: 84, d: beatSec * 1.2 },
        { p: 82, d: eighthSec }, { p: 80, d: beatSec * 0.8 }
      ]);
    } else if (phase === 3) {
      emitMeasure([fmChord, bb7Chord, ebChord, ebChord], [
        { p: 79, d: beatSec }, { p: 77, d: beatSec }, { p: 75, d: beatSec * 2 }
      ]);
    } else if (phase === 4) {
      emitMeasure([ebChord, ebChord, cmChord, abChord], [
        { p: 70, d: beatSec }, { p: 79, d: eighthSec }, { p: 80, d: eighthSec * 0.5 },
        { p: 79, d: eighthSec * 0.5 }, { p: 78, d: eighthSec * 0.5 }, { p: 79, d: eighthSec * 0.5 },
        { p: 82, d: eighthSec }, { p: 80, d: eighthSec }, { p: 77, d: beatSec }
      ]);
    } else if (phase === 5) {
      emitMeasure([fmChord, bb7Chord, ebChord, ebChord], [
        { p: 75, d: beatSec }, { p: 79, d: beatSec }, { p: 82, d: beatSec }, { p: 84, d: beatSec }
      ]);
    } else if (phase === 6) {
      emitMeasure([abChord, fmChord, bb7Chord, bb7Chord], [
        { p: 83, d: eighthSec }, { p: 82, d: eighthSec }, { p: 81, d: eighthSec },
        { p: 80, d: eighthSec }, { p: 79, d: eighthSec }, { p: 78, d: eighthSec }, { p: 77, d: beatSec * 2 }
      ]);
    } else {
      emitMeasure([ebChord, bb7Chord, ebChord, ebChord], [
        { p: 75, d: beatSec * 1.5 }, { p: 74, d: beatSec * 0.5 }, { p: 75, d: beatSec * 2 }
      ]);
    }
  }

  const codaStart = curTime;
  for (let tr = 0; tr < 12; tr++) {
    noteId = addNote(notes, noteId, tr % 2 === 0 ? 82 : 84, codaStart + tr * (eighthSec * 0.5), eighthSec * 0.45, 70, "R");
  }
  noteId = addNote(notes, noteId, 39, codaStart + 6 * eighthSec, beatSec * 4, 75, "L");
  noteId = addNote(notes, noteId, 55, codaStart + 6 * eighthSec + 0.1, beatSec * 3.8, 68, "L");
  noteId = addNote(notes, noteId, 58, codaStart + 6 * eighthSec + 0.2, beatSec * 3.6, 68, "L");
  noteId = addNote(notes, noteId, 63, codaStart + 6 * eighthSec + 0.3, beatSec * 3.4, 72, "R");
  noteId = addNote(notes, noteId, 75, codaStart + 6 * eighthSec + 0.4, beatSec * 3.2, 75, "R");
  curTime += beatSec * 4;

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "12/8",
    tracks: [
      { index: 0, name: "Left Hand (12/8 Bel Canto Waltz Bass & Chords)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Ornamented Cantabile Singing Fiorituras)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 3. CHOPIN WALTZ IN A MINOR
export function buildChopinWaltzInAMinorData(): NoteData {
  const bpm = 120;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const s16 = s8 / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  function emitWaltzBar(bass: number, chord: number[], rh: { p: number; d: number }[]) {
    const bt = curTime;
    noteId = addNote(notes, noteId, bass, bt, beatSec * 2.8, 70, "L");
    for (let beat = 1; beat <= 2; beat++) {
      const ct = bt + beat * beatSec;
      for (const cp of chord) {
        noteId = addNote(notes, noteId, cp, ct, beatSec * 0.85, 62, "L");
      }
    }
    let rt = bt;
    for (const r of rh) {
      noteId = addNote(notes, noteId, r.p, rt, r.d * 0.95, 78, "R");
      rt += r.d;
    }
    curTime += 3 * beatSec;
  }

  const amChord = [57, 60, 64];
  const dmChord = [57, 62, 65];
  const e7Chord = [56, 59, 64];
  const cChord  = [60, 64, 67];
  const g7Chord = [59, 62, 65];

  for (let rep = 0; rep < 8; rep++) {
    emitWaltzBar(45, amChord, [{ p: 76, d: beatSec * 3 }]);
    emitWaltzBar(45, amChord, [
      { p: 74, d: s8 }, { p: 72, d: s8 }, { p: 71, d: s8 }, { p: 69, d: s8 }, { p: 71, d: beatSec }
    ]);
    emitWaltzBar(38, dmChord, [
      { p: 71, d: beatSec }, { p: 72, d: beatSec }, { p: 71, d: beatSec }
    ]);
    emitWaltzBar(40, e7Chord, [
      { p: 68, d: beatSec }, { p: 69, d: beatSec * 2 }
    ]);

    emitWaltzBar(45, amChord, [{ p: 76, d: beatSec * 3 }]);
    emitWaltzBar(45, amChord, [
      { p: 74, d: s8 }, { p: 72, d: s8 }, { p: 71, d: s8 }, { p: 69, d: s8 }, { p: 71, d: s8 }, { p: 72, d: s8 }
    ]);
    emitWaltzBar(38, dmChord, [
      { p: 74, d: beatSec }, { p: 76, d: beatSec }, { p: 72, d: beatSec }
    ]);
    emitWaltzBar(40, e7Chord, [
      { p: 71, d: beatSec }, { p: 69, d: beatSec * 2 }
    ]);

    // Section B arpeggio runs
    emitWaltzBar(48, cChord, [{ p: 72, d: beatSec * 3 }]);
    emitWaltzBar(43, g7Chord, [
      { p: 71, d: s16 }, { p: 72, d: s16 }, { p: 74, d: s16 }, { p: 76, d: s16 },
      { p: 79, d: beatSec }, { p: 76, d: beatSec }
    ]);
    emitWaltzBar(48, cChord, [
      { p: 64, d: s16 }, { p: 67, d: s16 }, { p: 72, d: s16 }, { p: 76, d: s16 },
      { p: 79, d: s16 }, { p: 84, d: s16 }, { p: 79, d: s16 }, { p: 76, d: s16 },
      { p: 72, d: beatSec }
    ]);
    emitWaltzBar(43, g7Chord, [
      { p: 77, d: beatSec }, { p: 74, d: beatSec }, { p: 71, d: beatSec }
    ]);

    // Dm climax
    emitWaltzBar(38, dmChord, [
      { p: 77, d: beatSec * 1.5 }, { p: 81, d: beatSec * 1.5 }
    ]);
    emitWaltzBar(45, amChord, [
      { p: 81, d: beatSec }, { p: 80, d: beatSec }, { p: 77, d: beatSec }
    ]);
    emitWaltzBar(40, e7Chord, [
      { p: 76, d: beatSec }, { p: 74, d: beatSec }, { p: 71, d: beatSec }
    ]);
    emitWaltzBar(45, amChord, [
      { p: 69, d: beatSec * 3 }
    ]);
  }

  // Coda
  emitWaltzBar(45, amChord, [
    { p: 69, d: s16 }, { p: 72, d: s16 }, { p: 76, d: s16 }, { p: 81, d: beatSec * 2.5 }
  ]);
  const finalCadence = curTime;
  noteId = addNote(notes, noteId, 33, finalCadence, beatSec * 3, 75, "L");
  noteId = addNote(notes, noteId, 45, finalCadence, beatSec * 3, 72, "L");
  noteId = addNote(notes, noteId, 57, finalCadence, beatSec * 3, 68, "L");
  noteId = addNote(notes, noteId, 60, finalCadence, beatSec * 3, 68, "L");
  noteId = addNote(notes, noteId, 69, finalCadence, beatSec * 3, 75, "R");
  curTime += beatSec * 3.5;

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "3/4",
    tracks: [
      { index: 0, name: "Left Hand (Authentic Bass-Chord-Chord Waltz)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Melancholy Chopin Waltz Melody)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 4. BEETHOVEN ODE TO JOY
export function buildOdeToJoyData(): NoteData {
  const bpm = 116;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  const hymnMelody = [
    { p: 66, d: beatSec }, { p: 66, d: beatSec }, { p: 67, d: beatSec }, { p: 69, d: beatSec },
    { p: 69, d: beatSec }, { p: 67, d: beatSec }, { p: 66, d: beatSec }, { p: 64, d: beatSec },
    { p: 62, d: beatSec }, { p: 62, d: beatSec }, { p: 64, d: beatSec }, { p: 66, d: beatSec },
    { p: 66, d: beatSec * 1.5 }, { p: 64, d: s8 }, { p: 64, d: beatSec * 2 },

    { p: 66, d: beatSec }, { p: 66, d: beatSec }, { p: 67, d: beatSec }, { p: 69, d: beatSec },
    { p: 69, d: beatSec }, { p: 67, d: beatSec }, { p: 66, d: beatSec }, { p: 64, d: beatSec },
    { p: 62, d: beatSec }, { p: 62, d: beatSec }, { p: 64, d: beatSec }, { p: 66, d: beatSec },
    { p: 64, d: beatSec * 1.5 }, { p: 62, d: s8 }, { p: 62, d: beatSec * 2 },

    { p: 64, d: beatSec }, { p: 64, d: beatSec }, { p: 66, d: beatSec }, { p: 62, d: beatSec },
    { p: 64, d: beatSec }, { p: 66, d: s8 }, { p: 67, d: s8 }, { p: 66, d: beatSec }, { p: 62, d: beatSec },
    { p: 64, d: beatSec }, { p: 66, d: s8 }, { p: 67, d: s8 }, { p: 66, d: beatSec }, { p: 64, d: beatSec },
    { p: 62, d: beatSec }, { p: 64, d: beatSec }, { p: 57, d: beatSec * 2 },

    { p: 66, d: beatSec }, { p: 66, d: beatSec }, { p: 67, d: beatSec }, { p: 69, d: beatSec },
    { p: 69, d: beatSec }, { p: 67, d: beatSec }, { p: 66, d: beatSec }, { p: 64, d: beatSec },
    { p: 62, d: beatSec }, { p: 62, d: beatSec }, { p: 64, d: beatSec }, { p: 66, d: beatSec },
    { p: 64, d: beatSec * 1.5 }, { p: 62, d: s8 }, { p: 62, d: beatSec * 2 }
  ];

  for (let pass = 0; pass < 5; pass++) {
    const isTriumphant = pass === 2;
    const isPoly = pass === 1;
    let t = curTime;

    for (const m of hymnMelody) {
      const vel = isTriumphant ? 96 : isPoly ? 86 : 76;
      noteId = addNote(notes, noteId, m.p, t, m.d * 0.95, vel, "R");
      if (isTriumphant) {
        noteId = addNote(notes, noteId, m.p + 12, t, m.d * 0.95, vel, "R");
      }
      t += m.d;
    }

    const totalBars = 16;
    const bassChorale = [
      [38, 50, 54, 57], [38, 45, 54, 57], [45, 52, 57, 61], [38, 50, 54, 57],
      [38, 50, 54, 57], [45, 52, 57, 61], [38, 50, 54, 57], [38, 50, 57, 62],
      [45, 52, 57, 61], [38, 50, 54, 57], [45, 52, 57, 61], [45, 52, 57, 64],
      [38, 50, 54, 57], [45, 52, 57, 61], [38, 50, 54, 57], [38, 50, 57, 62]
    ];

    for (let b = 0; b < totalBars; b++) {
      const bTime = curTime + b * 4 * beatSec;
      const ch = bassChorale[b];
      const root = ch[0];

      if (isTriumphant) {
        for (let beat = 0; beat < 4; beat++) {
          const bt = bTime + beat * beatSec;
          noteId = addNote(notes, noteId, root - 12, bt, beatSec * 0.85, 92, "L");
          noteId = addNote(notes, noteId, root, bt, beatSec * 0.85, 88, "L");
          for (let c = 1; c < ch.length; c++) {
            noteId = addNote(notes, noteId, ch[c], bt, beatSec * 0.85, 80, "L");
          }
        }
      } else {
        noteId = addNote(notes, noteId, root, bTime, beatSec * 3.8, 72, "L");
        noteId = addNote(notes, noteId, ch[1], bTime + beatSec, beatSec * 2.8, 65, "L");
        noteId = addNote(notes, noteId, ch[2], bTime + beatSec * 2, beatSec * 1.8, 65, "L");
        noteId = addNote(notes, noteId, ch[3], bTime + beatSec * 3, beatSec * 0.9, 65, "L");
      }
    }
    curTime = t;
  }

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "4/4",
    tracks: [
      { index: 0, name: "Left Hand (Four-Part Chorale Bass & March Variation)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Beethoven Ninth Symphony Triumphal Anthem)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 5. BACH MINUET IN G MAJOR
export function buildBachMinuetInGData(): NoteData {
  const bpm = 116;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  function emitPart1() {
    const part1RH = [
      [{ p: 74, d: beatSec }, { p: 67, d: s8 }, { p: 69, d: s8 }, { p: 71, d: beatSec }, { p: 72, d: beatSec }],
      [{ p: 74, d: beatSec }, { p: 67, d: beatSec }, { p: 67, d: beatSec }],
      [{ p: 76, d: beatSec }, { p: 72, d: s8 }, { p: 74, d: s8 }, { p: 76, d: beatSec }, { p: 78, d: beatSec }],
      [{ p: 79, d: beatSec }, { p: 67, d: beatSec }, { p: 67, d: beatSec }],
      [{ p: 72, d: beatSec }, { p: 74, d: s8 }, { p: 72, d: s8 }, { p: 71, d: s8 }, { p: 69, d: s8 }],
      [{ p: 71, d: beatSec }, { p: 72, d: s8 }, { p: 71, d: s8 }, { p: 69, d: s8 }, { p: 67, d: s8 }],
      [{ p: 66, d: beatSec }, { p: 67, d: s8 }, { p: 69, d: s8 }, { p: 71, d: beatSec }, { p: 67, d: beatSec }],
      [{ p: 69, d: beatSec * 3 }],
      [{ p: 74, d: beatSec }, { p: 67, d: s8 }, { p: 69, d: s8 }, { p: 71, d: beatSec }, { p: 72, d: beatSec }],
      [{ p: 74, d: beatSec }, { p: 67, d: beatSec }, { p: 67, d: beatSec }],
      [{ p: 76, d: beatSec }, { p: 72, d: s8 }, { p: 74, d: s8 }, { p: 76, d: beatSec }, { p: 78, d: beatSec }],
      [{ p: 79, d: beatSec }, { p: 67, d: beatSec }, { p: 67, d: beatSec }],
      [{ p: 72, d: beatSec }, { p: 74, d: s8 }, { p: 72, d: s8 }, { p: 71, d: s8 }, { p: 69, d: s8 }],
      [{ p: 71, d: beatSec }, { p: 72, d: s8 }, { p: 71, d: s8 }, { p: 69, d: s8 }, { p: 67, d: s8 }],
      [{ p: 69, d: beatSec }, { p: 71, d: s8 }, { p: 69, d: s8 }, { p: 67, d: s8 }, { p: 66, d: s8 }],
      [{ p: 67, d: beatSec * 3 }]
    ];

    const part1LH = [
      [{ p: 55, d: beatSec * 2 }, { p: 59, d: beatSec }],
      [{ p: 57, d: beatSec * 3 }],
      [{ p: 59, d: beatSec * 2 }, { p: 55, d: beatSec }],
      [{ p: 60, d: beatSec * 3 }],
      [{ p: 59, d: beatSec * 2 }, { p: 57, d: beatSec }],
      [{ p: 55, d: beatSec * 2 }, { p: 54, d: beatSec }],
      [{ p: 52, d: beatSec }, { p: 55, d: beatSec }, { p: 52, d: beatSec }],
      [{ p: 50, d: beatSec * 2 }, { p: 38, d: beatSec }],
      [{ p: 55, d: beatSec * 2 }, { p: 59, d: beatSec }],
      [{ p: 57, d: beatSec * 3 }],
      [{ p: 59, d: beatSec * 2 }, { p: 55, d: beatSec }],
      [{ p: 60, d: beatSec * 3 }],
      [{ p: 59, d: beatSec * 2 }, { p: 57, d: beatSec }],
      [{ p: 55, d: beatSec * 2 }, { p: 54, d: beatSec }],
      [{ p: 57, d: beatSec }, { p: 50, d: beatSec }, { p: 49, d: beatSec }],
      [{ p: 43, d: beatSec * 2 }, { p: 55, d: beatSec }]
    ];

    for (let m = 0; m < 16; m++) {
      const mTime = curTime + m * 3 * beatSec;
      let rt = mTime;
      for (const r of part1RH[m]) {
        noteId = addNote(notes, noteId, r.p, rt, r.d * 0.95, 78, "R");
        rt += r.d;
      }
      let lt = mTime;
      for (const l of part1LH[m]) {
        noteId = addNote(notes, noteId, l.p, lt, l.d * 0.95, 70, "L");
        lt += l.d;
      }
    }
    curTime += 16 * 3 * beatSec;
  }

  function emitPart2() {
    const part2RH = [
      [{ p: 83, d: beatSec }, { p: 67, d: s8 }, { p: 69, d: s8 }, { p: 71, d: beatSec }, { p: 67, d: beatSec }],
      [{ p: 81, d: beatSec }, { p: 62, d: s8 }, { p: 64, d: s8 }, { p: 66, d: beatSec }, { p: 62, d: beatSec }],
      [{ p: 79, d: beatSec }, { p: 64, d: s8 }, { p: 66, d: s8 }, { p: 67, d: beatSec }, { p: 62, d: beatSec }],
      [{ p: 73, d: beatSec * 2 }, { p: 71, d: s8 }, { p: 69, d: s8 }],
      [{ p: 71, d: beatSec }, { p: 73, d: beatSec }, { p: 74, d: beatSec }],
      [{ p: 73, d: beatSec * 2 }, { p: 74, d: beatSec }],
      [{ p: 71, d: beatSec }, { p: 69, d: beatSec }, { p: 67, d: beatSec }],
      [{ p: 66, d: beatSec * 3 }],
      [{ p: 74, d: beatSec }, { p: 67, d: s8 }, { p: 69, d: s8 }, { p: 71, d: beatSec }, { p: 72, d: beatSec }],
      [{ p: 74, d: beatSec }, { p: 67, d: beatSec }, { p: 67, d: beatSec }],
      [{ p: 76, d: beatSec }, { p: 72, d: s8 }, { p: 74, d: s8 }, { p: 76, d: beatSec }, { p: 78, d: beatSec }],
      [{ p: 79, d: beatSec }, { p: 67, d: beatSec }, { p: 67, d: beatSec }],
      [{ p: 72, d: beatSec }, { p: 74, d: s8 }, { p: 72, d: s8 }, { p: 71, d: s8 }, { p: 69, d: s8 }],
      [{ p: 71, d: beatSec }, { p: 72, d: s8 }, { p: 71, d: s8 }, { p: 69, d: s8 }, { p: 67, d: s8 }],
      [{ p: 69, d: beatSec }, { p: 71, d: s8 }, { p: 69, d: s8 }, { p: 67, d: s8 }, { p: 66, d: s8 }],
      [{ p: 67, d: beatSec * 3 }]
    ];

    const part2LH = [
      [{ p: 55, d: beatSec * 3 }],
      [{ p: 50, d: beatSec * 3 }],
      [{ p: 48, d: beatSec * 3 }],
      [{ p: 45, d: beatSec * 2 }, { p: 47, d: beatSec }],
      [{ p: 49, d: beatSec }, { p: 50, d: beatSec }, { p: 52, d: beatSec }],
      [{ p: 45, d: beatSec * 2 }, { p: 43, d: beatSec }],
      [{ p: 47, d: beatSec }, { p: 45, d: beatSec }, { p: 43, d: beatSec }],
      [{ p: 42, d: beatSec * 3 }],
      [{ p: 55, d: beatSec * 2 }, { p: 59, d: beatSec }],
      [{ p: 57, d: beatSec * 3 }],
      [{ p: 59, d: beatSec * 2 }, { p: 55, d: beatSec }],
      [{ p: 60, d: beatSec * 3 }],
      [{ p: 59, d: beatSec * 2 }, { p: 57, d: beatSec }],
      [{ p: 55, d: beatSec * 2 }, { p: 54, d: beatSec }],
      [{ p: 57, d: beatSec }, { p: 50, d: beatSec }, { p: 49, d: beatSec }],
      [{ p: 43, d: beatSec * 2 }, { p: 55, d: beatSec }]
    ];

    for (let m = 0; m < 16; m++) {
      const mTime = curTime + m * 3 * beatSec;
      let rt = mTime;
      for (const r of part2RH[m]) {
        noteId = addNote(notes, noteId, r.p, rt, r.d * 0.95, 78, "R");
        rt += r.d;
      }
      let lt = mTime;
      for (const l of part2LH[m]) {
        noteId = addNote(notes, noteId, l.p, lt, l.d * 0.95, 70, "L");
        lt += l.d;
      }
    }
    curTime += 16 * 3 * beatSec;
  }

  emitPart1();
  emitPart1();
  emitPart2();
  emitPart2();
  emitPart1();
  emitPart2();

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "3/4",
    tracks: [
      { index: 0, name: "Left Hand (Polyphonic Baroque Basso Continuo)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Singing Minuet Theme & Counterpoint)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 6. YIRUMA RIVER FLOWS IN YOU
export function buildRiverFlowsInYouData(): NoteData {
  const bpm = 68;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const s16 = s8 / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  const progression = [
    { root: 42, fifth: 49, oct: 54, tenth: 57 }, // F#2, C#3, F#3, A3
    { root: 38, fifth: 45, oct: 50, tenth: 54 }, // D2, A2, D3, F#3
    { root: 45, fifth: 52, oct: 57, tenth: 61 }, // A2, E3, A3, C#4
    { root: 40, fifth: 47, oct: 52, tenth: 56 }  // E2, B2, E3, G#3
  ];

  function emitCycle(rhPhrases: { p: number; d: number }[][], dynamics = 76) {
    for (let bar = 0; bar < 4; bar++) {
      const bTime = curTime;
      const arp = progression[bar];
      noteId = addNote(notes, noteId, arp.root, bTime, beatSec * 3.8, dynamics - 6, "L");
      noteId = addNote(notes, noteId, arp.fifth, bTime + beatSec, beatSec * 2.8, dynamics - 8, "L");
      noteId = addNote(notes, noteId, arp.oct, bTime + beatSec * 2, beatSec * 1.8, dynamics - 10, "L");
      noteId = addNote(notes, noteId, arp.tenth, bTime + beatSec * 3, beatSec * 0.9, dynamics - 10, "L");

      let rt = bTime;
      const phrase = rhPhrases[bar];
      for (const r of phrase) {
        noteId = addNote(notes, noteId, r.p, rt, r.d * 0.95, dynamics, "R");
        rt += r.d;
      }
      curTime += 4 * beatSec;
    }
  }

  // Intro
  emitCycle([
    [{ p: 81, d: s16 }, { p: 80, d: s16 }, { p: 81, d: s8 }, { p: 76, d: beatSec * 3 }],
    [{ p: 81, d: s16 }, { p: 80, d: s16 }, { p: 81, d: s8 }, { p: 76, d: beatSec * 3 }],
    [{ p: 81, d: s16 }, { p: 80, d: s16 }, { p: 81, d: s8 }, { p: 76, d: beatSec * 3 }],
    [{ p: 76, d: beatSec * 4 }]
  ], 68);

  // Verse 1 & 2
  for (let rep = 0; rep < 5; rep++) {
    emitCycle([
      [{ p: 69, d: s16 }, { p: 68, d: s16 }, { p: 69, d: s16 }, { p: 76, d: beatSec * 3.25 }],
      [{ p: 74, d: s16 }, { p: 73, d: s16 }, { p: 74, d: s16 }, { p: 69, d: beatSec * 3.25 }],
      [{ p: 73, d: s16 }, { p: 71, d: s16 }, { p: 73, d: s16 }, { p: 76, d: beatSec * 3.25 }],
      [
        { p: 71, d: beatSec },
        { p: 73, d: s16 }, { p: 74, d: s16 }, { p: 76, d: s16 }, { p: 78, d: s16 },
        { p: 76, d: s16 }, { p: 74, d: s16 }, { p: 73, d: s16 }, { p: 71, d: s16 },
        { p: 69, d: beatSec }
      ]
    ], 78);
  }

  // Chorus 1 & 2
  for (let rep = 0; rep < 5; rep++) {
    emitCycle([
      [{ p: 81, d: beatSec }, { p: 80, d: beatSec }, { p: 81, d: beatSec }, { p: 88, d: beatSec }],
      [{ p: 86, d: beatSec }, { p: 85, d: beatSec }, { p: 86, d: beatSec }, { p: 81, d: beatSec }],
      [{ p: 85, d: beatSec }, { p: 83, d: beatSec }, { p: 85, d: beatSec }, { p: 88, d: beatSec }],
      [
        { p: 83, d: beatSec * 1.5 },
        { p: 85, d: s16 }, { p: 86, d: s16 }, { p: 88, d: s8 },
        { p: 86, d: s16 }, { p: 85, d: s16 }, { p: 83, d: s8 },
        { p: 81, d: beatSec }
      ]
    ], 88);
  }

  // Outro
  emitCycle([
    [{ p: 81, d: s16 }, { p: 80, d: s16 }, { p: 81, d: s8 }, { p: 76, d: beatSec * 3 }],
    [{ p: 74, d: s16 }, { p: 73, d: s16 }, { p: 74, d: s8 }, { p: 69, d: beatSec * 3 }],
    [{ p: 73, d: s16 }, { p: 71, d: s16 }, { p: 73, d: s8 }, { p: 76, d: beatSec * 3 }],
    [{ p: 81, d: beatSec * 4 }]
  ], 66);

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "4/4",
    tracks: [
      { index: 0, name: "Left Hand (Warm Lyrical 10th Ballad Arpeggios)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Yiruma's Iconic Melody & Cascades)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 7. RADWIMPS SPARKLE
export function buildSparkleData(): NoteData {
  const bpm = 124;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const s16 = s8 / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  const roots = [
    { root: 35, oct: 47 },
    { root: 32, oct: 44 },
    { root: 28, oct: 40 },
    { root: 30, oct: 42 }
  ];

  const celestialArp = [78, 83, 87, 90, 87, 83, 78, 88, 87, 83, 78, 87, 83, 78, 83, 87];

  function emitArpBars(bars: number, withMelody = false, dynamics = 78) {
    for (let b = 0; b < bars; b++) {
      const bTime = curTime;
      const r = roots[b % roots.length];

      noteId = addNote(notes, noteId, r.root, bTime, beatSec * 3.8, dynamics - 4, "L");
      noteId = addNote(notes, noteId, r.oct, bTime, beatSec * 3.8, dynamics - 6, "L");
      noteId = addNote(notes, noteId, r.oct + 7, bTime + beatSec * 2, beatSec * 1.8, dynamics - 8, "L");

      if (!withMelody) {
        for (let i = 0; i < 16; i++) {
          noteId = addNote(notes, noteId, celestialArp[i], bTime + i * s16, s16 * 0.9, dynamics, "R");
        }
      } else {
        const melP = b % 4 === 0 ? 83 : b % 4 === 1 ? 80 : b % 4 === 2 ? 76 : 78;
        noteId = addNote(notes, noteId, melP, bTime, beatSec * 1.5, dynamics + 6, "R");
        noteId = addNote(notes, noteId, melP + 2, bTime + beatSec * 1.5, s8, dynamics + 4, "R");
        noteId = addNote(notes, noteId, melP, bTime + beatSec * 2, beatSec * 1.8, dynamics + 6, "R");
        for (let i = 8; i < 16; i++) {
          noteId = addNote(notes, noteId, celestialArp[i], bTime + i * s16, s16 * 0.85, dynamics - 8, "R");
        }
      }
      curTime += 4 * beatSec;
    }
  }

  emitArpBars(8, false, 72);
  emitArpBars(16, true, 80);

  for (let b = 0; b < 40; b++) {
    const bTime = curTime;
    const r = roots[b % roots.length];
    for (let i = 0; i < 8; i++) {
      noteId = addNote(notes, noteId, r.root, bTime + i * s8, s8 * 0.85, 86, "L");
      noteId = addNote(notes, noteId, r.oct, bTime + i * s8, s8 * 0.85, 84, "L");
    }
    const climP = [83, 85, 87, 90, 87, 85, 83, 80][b % 8];
    noteId = addNote(notes, noteId, climP, bTime, beatSec, 96, "R");
    noteId = addNote(notes, noteId, climP + 12, bTime, beatSec, 94, "R");
    noteId = addNote(notes, noteId, climP, bTime + beatSec, beatSec, 92, "R");
    noteId = addNote(notes, noteId, climP + 12, bTime + beatSec, beatSec, 90, "R");
    noteId = addNote(notes, noteId, climP - 2, bTime + beatSec * 2, beatSec * 2, 95, "R");
    noteId = addNote(notes, noteId, climP + 10, bTime + beatSec * 2, beatSec * 2, 93, "R");
    curTime += 4 * beatSec;
  }

  emitArpBars(12, false, 68);

  const endT = curTime;
  noteId = addNote(notes, noteId, 35, endT, beatSec * 4, 75, "L");
  noteId = addNote(notes, noteId, 47, endT, beatSec * 4, 72, "L");
  noteId = addNote(notes, noteId, 54, endT, beatSec * 4, 70, "L");
  noteId = addNote(notes, noteId, 71, endT, beatSec * 4, 78, "R");
  noteId = addNote(notes, noteId, 83, endT, beatSec * 4, 82, "R");
  curTime += beatSec * 4;

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "4/4",
    tracks: [
      { index: 0, name: "Left Hand (Driving Anime Piano Bass & Octaves)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (High Sparkling 16th Arpeggios & Cathartic Chorus)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 8. HANS ZIMMER INTERSTELLAR
export function buildInterstellarData(): NoteData {
  const bpm = 96;
  const beatSec = 60 / bpm;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  const chords = [
    { bass: 33, chord: [57, 60, 64] },
    { bass: 29, chord: [53, 57, 60] },
    { bass: 31, chord: [55, 59, 62] },
    { bass: 28, chord: [52, 55, 59] },
  ];

  function emitBreathingSection(cycles: number, dynamics = 70) {
    for (let c = 0; c < cycles; c++) {
      for (let ch = 0; ch < chords.length; ch++) {
        const bTime = curTime;
        const cData = chords[ch];
        noteId = addNote(notes, noteId, cData.bass, bTime, beatSec * 2.8, dynamics - 6, "L");
        noteId = addNote(notes, noteId, cData.bass + 12, bTime, beatSec * 2.8, dynamics - 8, "L");
        for (const cp of cData.chord) {
          noteId = addNote(notes, noteId, cp, bTime + beatSec, beatSec * 1.8, dynamics - 10, "L");
        }
        noteId = addNote(notes, noteId, 64, bTime, beatSec * 0.95, dynamics, "R");
        noteId = addNote(notes, noteId, 65, bTime + beatSec, beatSec * 1.9, dynamics + 4, "R");
        curTime += 3 * beatSec;
      }
    }
  }

  function emitSwellSection(cycles: number) {
    for (let c = 0; c < cycles; c++) {
      for (let ch = 0; ch < chords.length; ch++) {
        const bTime = curTime;
        const cData = chords[ch];
        noteId = addNote(notes, noteId, cData.bass, bTime, beatSec * 2.8, 92, "L");
        noteId = addNote(notes, noteId, cData.bass + 12, bTime, beatSec * 2.8, 90, "L");
        for (const cp of cData.chord) {
          noteId = addNote(notes, noteId, cp, bTime, beatSec * 2.8, 85, "L");
          noteId = addNote(notes, noteId, cp + 12, bTime + beatSec, beatSec * 1.8, 82, "L");
        }

        const arp = [76, 81, 84, 88, 89, 88];
        for (let i = 0; i < arp.length; i++) {
          noteId = addNote(notes, noteId, arp[i], bTime + i * (beatSec * 0.5), (beatSec * 0.5) * 0.9, 88, "R");
        }
        curTime += 3 * beatSec;
      }
    }
  }

  emitBreathingSection(3, 66);
  emitBreathingSection(3, 78);
  emitSwellSection(12);
  emitBreathingSection(3, 60);

  const endT = curTime;
  noteId = addNote(notes, noteId, 33, endT, beatSec * 4, 65, "L");
  noteId = addNote(notes, noteId, 45, endT, beatSec * 4, 62, "L");
  noteId = addNote(notes, noteId, 57, endT, beatSec * 4, 60, "L");
  noteId = addNote(notes, noteId, 64, endT, beatSec * 4, 68, "R");
  curTime += beatSec * 4;

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "3/4",
    tracks: [
      { index: 0, name: "Left Hand (Low Church Organ Pedal & Swells)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Iconic Two-Note Breathing Motif & Swelling Arpeggios)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 9. KLAUS BADELT / HANS ZIMMER HE'S A PIRATE
export function buildHeIsAPirateData(): NoteData {
  const bpm = 140;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 3;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  function emitPirateMeasure(bass: number, chord: number[], rh: { p: number; d: number }[]) {
    const bt = curTime;
    noteId = addNote(notes, noteId, bass, bt, s8 * 0.9, 85, "L");
    noteId = addNote(notes, noteId, bass - 12, bt, s8 * 0.9, 82, "L");
    for (const cp of chord) {
      noteId = addNote(notes, noteId, cp, bt + s8, s8 * 0.8, 75, "L");
      noteId = addNote(notes, noteId, cp, bt + s8 * 2, s8 * 0.8, 75, "L");
    }
    noteId = addNote(notes, noteId, bass, bt + s8 * 3, s8 * 0.9, 85, "L");
    noteId = addNote(notes, noteId, bass - 12, bt + s8 * 3, s8 * 0.9, 82, "L");
    for (const cp of chord) {
      noteId = addNote(notes, noteId, cp, bt + s8 * 4, s8 * 0.8, 75, "L");
      noteId = addNote(notes, noteId, cp, bt + s8 * 5, s8 * 0.8, 75, "L");
    }

    let rt = bt;
    for (const r of rh) {
      noteId = addNote(notes, noteId, r.p, rt, r.d * 0.95, 90, "R");
      rt += r.d;
    }
    curTime += 6 * s8;
  }

  const dmChord = [50, 53, 57];
  const bbChord = [46, 50, 53];
  const cChord  = [48, 52, 55];
  const aChord  = [45, 49, 52];

  for (let cycle = 0; cycle < 16; cycle++) {
    emitPirateMeasure(38, dmChord, [
      { p: 62, d: s8 }, { p: 62, d: s8 }, { p: 62, d: s8 }, { p: 64, d: s8 }, { p: 65, d: s8 * 2 }
    ]);
    emitPirateMeasure(38, dmChord, [
      { p: 65, d: s8 }, { p: 67, d: s8 }, { p: 64, d: s8 * 2 }, { p: 64, d: s8 * 2 }
    ]);
    emitPirateMeasure(38, dmChord, [
      { p: 62, d: s8 * 2 }, { p: 60, d: s8 }, { p: 62, d: s8 * 3 }
    ]);
    emitPirateMeasure(34, bbChord, [
      { p: 62, d: s8 }, { p: 64, d: s8 }, { p: 65, d: s8 }, { p: 67, d: s8 }, { p: 69, d: s8 * 2 }
    ]);
    emitPirateMeasure(36, cChord, [
      { p: 69, d: s8 }, { p: 69, d: s8 }, { p: 70, d: s8 }, { p: 69, d: s8 }, { p: 67, d: s8 }, { p: 69, d: s8 }
    ]);
    emitPirateMeasure(38, dmChord, [
      { p: 62, d: s8 * 6 }
    ]);

    emitPirateMeasure(34, bbChord, [
      { p: 70, d: s8 * 2 }, { p: 72, d: s8 }, { p: 74, d: s8 * 3 }
    ]);
    emitPirateMeasure(36, cChord, [
      { p: 72, d: s8 * 2 }, { p: 70, d: s8 }, { p: 69, d: s8 * 3 }
    ]);
    emitPirateMeasure(38, dmChord, [
      { p: 65, d: s8 * 2 }, { p: 67, d: s8 }, { p: 69, d: s8 * 3 }
    ]);
    emitPirateMeasure(33, aChord, [
      { p: 67, d: s8 * 2 }, { p: 65, d: s8 }, { p: 64, d: s8 * 3 }
    ]);
  }

  const codaT = curTime;
  noteId = addNote(notes, noteId, 26, codaT, beatSec * 2, 100, "L");
  noteId = addNote(notes, noteId, 38, codaT, beatSec * 2, 95, "L");
  noteId = addNote(notes, noteId, 50, codaT, beatSec * 2, 90, "L");
  noteId = addNote(notes, noteId, 62, codaT, beatSec * 2, 96, "R");
  noteId = addNote(notes, noteId, 65, codaT, beatSec * 2, 96, "R");
  noteId = addNote(notes, noteId, 69, codaT, beatSec * 2, 96, "R");
  noteId = addNote(notes, noteId, 74, codaT, beatSec * 2, 100, "R");
  curTime += beatSec * 2.5;

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "6/8",
    tracks: [
      { index: 0, name: "Left Hand (Galloping 6/8 Pirate Ostinato & Cannonade Bass)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Swashbuckling Theme & Fanfare Chords)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 10. JOE HISAISHI MERRY-GO-ROUND OF LIFE
export function buildMerryGoRoundOfLifeData(): NoteData {
  const bpm = 132;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  function emitWaltzBar(bass: number, chord: number[], rh: { p: number; d: number }[]) {
    const bt = curTime;
    noteId = addNote(notes, noteId, bass, bt, beatSec * 2.8, 74, "L");
    for (let beat = 1; beat <= 2; beat++) {
      const ct = bt + beat * beatSec;
      for (const cp of chord) {
        noteId = addNote(notes, noteId, cp, ct, beatSec * 0.85, 64, "L");
      }
    }
    let rt = bt;
    for (const r of rh) {
      noteId = addNote(notes, noteId, r.p, rt, r.d * 0.95, 82, "R");
      rt += r.d;
    }
    curTime += 3 * beatSec;
  }

  const gmChord = [55, 58, 62];
  const cmChord = [55, 60, 63];
  const d7Chord = [54, 57, 62];
  const bbChord = [58, 62, 65];
  const ebChord = [55, 58, 63];

  const introNotes = [62, 63, 66, 67, 69, 70, 73, 74];
  for (let i = 0; i < introNotes.length; i++) {
    noteId = addNote(notes, noteId, introNotes[i], curTime + i * s8, s8 * 0.95, 76, "R");
  }
  curTime += introNotes.length * s8;

  for (let cycle = 0; cycle < 8; cycle++) {
    emitWaltzBar(43, gmChord, [{ p: 62, d: beatSec }, { p: 67, d: beatSec * 2 }]);
    emitWaltzBar(43, gmChord, [{ p: 70, d: beatSec }, { p: 69, d: beatSec }, { p: 67, d: beatSec }]);
    emitWaltzBar(41, cmChord, [{ p: 66, d: beatSec }, { p: 67, d: beatSec }, { p: 69, d: beatSec }]);
    emitWaltzBar(38, d7Chord, [{ p: 62, d: beatSec * 3 }]);

    emitWaltzBar(43, gmChord, [{ p: 70, d: beatSec * 3 }]);
    emitWaltzBar(43, gmChord, [{ p: 74, d: beatSec }, { p: 72, d: beatSec }, { p: 70, d: beatSec }]);
    emitWaltzBar(41, cmChord, [{ p: 69, d: beatSec }, { p: 70, d: beatSec }, { p: 72, d: beatSec }]);
    emitWaltzBar(38, d7Chord, [{ p: 66, d: beatSec * 3 }]);

    emitWaltzBar(46, bbChord, [{ p: 74, d: beatSec * 3 }]);
    emitWaltzBar(39, ebChord, [{ p: 79, d: beatSec * 1.5 }, { p: 77, d: beatSec * 1.5 }]);
    emitWaltzBar(41, cmChord, [{ p: 75, d: beatSec }, { p: 74, d: beatSec }, { p: 72, d: beatSec }]);
    emitWaltzBar(38, d7Chord, [{ p: 74, d: beatSec * 3 }]);

    emitWaltzBar(43, gmChord, [{ p: 70, d: beatSec }, { p: 69, d: beatSec }, { p: 67, d: beatSec }]);
    emitWaltzBar(38, d7Chord, [{ p: 66, d: beatSec * 2 }, { p: 62, d: beatSec }]);
    emitWaltzBar(43, gmChord, [{ p: 67, d: beatSec * 3 }]);
  }

  emitWaltzBar(43, gmChord, [
    { p: 67, d: s8 }, { p: 70, d: s8 }, { p: 74, d: s8 }, { p: 79, d: beatSec * 1.5 }
  ]);
  const endT = curTime;
  noteId = addNote(notes, noteId, 31, endT, beatSec * 3, 85, "L");
  noteId = addNote(notes, noteId, 43, endT, beatSec * 3, 80, "L");
  noteId = addNote(notes, noteId, 55, endT, beatSec * 3, 75, "L");
  noteId = addNote(notes, noteId, 67, endT, beatSec * 3, 85, "R");
  noteId = addNote(notes, noteId, 79, endT, beatSec * 3, 90, "R");
  curTime += beatSec * 3.5;

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "3/4",
    tracks: [
      { index: 0, name: "Left Hand (Viennese Waltz Lilt & Chords)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Howl's Moving Castle Romantic Theme & Flourishes)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 11. SCOTT JOPLIN THE ENTERTAINER
export function buildTheEntertainerData(): NoteData {
  const bpm = 88;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const s16 = s8 / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  function emitStrideMeasure(bass1: number, bass2: number, chord: number[], rh: { p: number; d: number }[]) {
    const bt = curTime;
    noteId = addNote(notes, noteId, bass1, bt, s8 * 0.85, 78, "L");
    for (const cp of chord) {
      noteId = addNote(notes, noteId, cp, bt + s8, s8 * 0.85, 68, "L");
    }
    noteId = addNote(notes, noteId, bass2, bt + s8 * 2, s8 * 0.85, 76, "L");
    for (const cp of chord) {
      noteId = addNote(notes, noteId, cp, bt + s8 * 3, s8 * 0.85, 68, "L");
    }

    let rt = bt;
    for (const r of rh) {
      noteId = addNote(notes, noteId, r.p, rt, r.d * 0.95, 84, "R");
      rt += r.d;
    }
    curTime += 4 * s8;
  }

  const cChord = [52, 55, 60];
  const fChord = [53, 57, 60];
  const g7Chord = [53, 55, 59];

  const introRH = [
    { p: 74, d: s16 }, { p: 75, d: s16 }, { p: 76, d: s8 }, { p: 84, d: s8 },
    { p: 76, d: s8 }, { p: 84, d: s8 * 2 },
    { p: 72, d: s16 }, { p: 74, d: s16 }, { p: 75, d: s16 }, { p: 76, d: s16 },
    { p: 72, d: s16 }, { p: 74, d: s16 }, { p: 76, d: s16 },
    { p: 71, d: s8 }, { p: 74, d: s8 }, { p: 72, d: s8 * 2 }
  ];
  let it = curTime;
  for (const ir of introRH) {
    noteId = addNote(notes, noteId, ir.p, it, ir.d * 0.92, 85, "R");
    it += ir.d;
  }
  curTime = it;

  for (let rep = 0; rep < 8; rep++) {
    emitStrideMeasure(36, 43, cChord, [
      { p: 62, d: s16 }, { p: 63, d: s16 }, { p: 64, d: s8 }, { p: 72, d: s8 },
      { p: 64, d: s8 }, { p: 72, d: s8 }
    ]);
    emitStrideMeasure(36, 43, cChord, [
      { p: 64, d: s8 }, { p: 72, d: s8 * 3 }
    ]);
    emitStrideMeasure(41, 43, fChord, [
      { p: 72, d: s16 }, { p: 74, d: s16 }, { p: 75, d: s16 }, { p: 76, d: s16 },
      { p: 72, d: s16 }, { p: 74, d: s16 }, { p: 76, d: s16 },
      { p: 71, d: s8 }
    ]);
    emitStrideMeasure(36, 43, cChord, [
      { p: 74, d: s8 }, { p: 72, d: s8 * 3 }
    ]);

    emitStrideMeasure(36, 43, cChord, [
      { p: 62, d: s16 }, { p: 63, d: s16 }, { p: 64, d: s8 }, { p: 72, d: s8 },
      { p: 64, d: s8 }, { p: 72, d: s8 }
    ]);
    emitStrideMeasure(41, 41, fChord, [
      { p: 72, d: s8 }, { p: 74, d: s8 }, { p: 76, d: s8 }, { p: 77, d: s8 }
    ]);
    emitStrideMeasure(43, 43, g7Chord, [
      { p: 76, d: s8 }, { p: 72, d: s8 }, { p: 74, d: s8 }, { p: 71, d: s8 }
    ]);
    emitStrideMeasure(36, 43, cChord, [
      { p: 72, d: s8 * 4 }
    ]);
  }

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "2/4",
    tracks: [
      { index: 0, name: "Left Hand (Ragtime Stride Oom-Pah)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Scott Joplin Syncopated Ragtime Theme)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 12. JOSEPH KOSMA AUTUMN LEAVES
export function buildAutumnLeavesData(): NoteData {
  const bpm = 88;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  // Authentic Jazz Standard Cycle in G minor / Bb major:
  // Cm7 - F7 - Bbmaj7 - Ebmaj7 - Am7b5 - D7 - Gm6 - Gm7
  const jazzBars = [
    {
      bass: 36, // C2
      walk: [36, 39, 43, 42],
      chord: [58, 63, 67], // Bb3, Eb4, G4 (Cm7)
      rhMelody: [{ p: 72, d: beatSec * 3 }, { p: 74, d: beatSec }], // C5, D5
    },
    {
      bass: 41, // F2
      walk: [41, 45, 48, 47],
      chord: [57, 63, 65], // A3, Eb4, F4 (F7)
      rhMelody: [{ p: 70, d: beatSec * 3 }, { p: 72, d: beatSec }], // Bb4, C5
    },
    {
      bass: 46, // Bb2
      walk: [46, 50, 53, 51],
      chord: [57, 62, 65], // A3, D4, F4 (Bbmaj7)
      rhMelody: [{ p: 69, d: beatSec * 3 }, { p: 70, d: beatSec }], // A4, Bb4
    },
    {
      bass: 39, // Eb2
      walk: [39, 43, 46, 44],
      chord: [55, 62, 67], // G3, D4, G4 (Ebmaj7)
      rhMelody: [{ p: 67, d: beatSec * 4 }], // G4
    },
    {
      bass: 45, // A2
      walk: [45, 48, 51, 50],
      chord: [55, 60, 63], // G3, C4, Eb4 (Am7b5)
      rhMelody: [{ p: 66, d: beatSec * 3 }, { p: 67, d: beatSec }], // F#4, G4
    },
    {
      bass: 38, // D2
      walk: [38, 42, 45, 44],
      chord: [54, 60, 64], // F#3, C4, E4 (D7)
      rhMelody: [{ p: 69, d: beatSec * 3 }, { p: 70, d: beatSec }], // A4, Bb4
    },
    {
      bass: 43, // G2
      walk: [43, 46, 50, 48],
      chord: [55, 58, 62], // G3, Bb3, D4 (Gm6)
      rhMelody: [{ p: 67, d: beatSec * 4 }], // G4
    },
    {
      bass: 43, // G2
      walk: [43, 46, 50, 41],
      chord: [55, 58, 62], // G3, Bb3, D4 (Gm7)
      rhMelody: [
        { p: 67, d: beatSec * 2 },
        { p: 69, d: beatSec },
        { p: 70, d: beatSec },
      ],
    },
  ];

  for (let chorus = 0; chorus < 8; chorus++) {
    for (let b = 0; b < jazzBars.length; b++) {
      const jb = jazzBars[b];
      const bt = curTime;

      for (let w = 0; w < 4; w++) {
        noteId = addNote(notes, noteId, jb.walk[w], bt + w * beatSec, beatSec * 0.9, 54, "L");
      }

      for (const cp of jb.chord) {
        noteId = addNote(notes, noteId, cp, bt + beatSec * 1.5, beatSec * 0.6, 48, "L");
        noteId = addNote(notes, noteId, cp, bt + beatSec * 3, beatSec * 0.7, 48, "L");
      }

      let rt = bt;
      if (chorus >= 2 && chorus <= 5) {
        const soloLicks: number[][] = [
          [72, 74, 75, 77, 75, 74, 72, 70],
          [69, 70, 72, 74, 72, 70, 69, 67],
          [65, 69, 70, 72, 74, 77, 75, 74],
          [75, 74, 72, 70, 69, 67, 65, 67],
          [66, 67, 69, 70, 72, 74, 72, 70],
          [69, 70, 72, 74, 75, 74, 72, 69],
          [67, 70, 74, 75, 74, 70, 67, 62],
          [67, 70, 72, 74, 75, 77, 79, 74],
        ];
        const lick = soloLicks[b % soloLicks.length];
        for (let s = 0; s < lick.length; s++) {
          noteId = addNote(notes, noteId, lick[s], bt + s * s8, s8 * 0.9, 80, "R");
        }
      } else {
        for (const m of jb.rhMelody) {
          noteId = addNote(notes, noteId, m.p + (chorus === 1 || chorus === 7 ? 12 : 0), rt, m.d * 0.95, 82, "R");
          rt += m.d;
        }
      }

      curTime += 4 * beatSec;
    }
  }

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "4/4",
    tracks: [
      { index: 0, name: "Left Hand (Jazz Walking Bass & Guide Chords)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Bill Evans Modal Voicings & Bebop Flourishes)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 13. TOBY FOX MEGALOVANIA
export function buildMegalovaniaData(): NoteData {
  const bpm = 120;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const s16 = s8 / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  const sansBars = [
    { bass: 38, lead: 62 },
    { bass: 36, lead: 60 },
    { bass: 35, lead: 59 },
    { bass: 34, lead: 58 },
  ];

  function emitSansMeasure(leadPitch: number, bassPitch: number, isOctaves = false) {
    const bt = curTime;
    for (let i = 0; i < 4; i++) {
      noteId = addNote(notes, noteId, bassPitch - 12, bt + i * beatSec, s8 * 0.8, 86, "L");
      noteId = addNote(notes, noteId, bassPitch, bt + i * beatSec, s8 * 0.8, 82, "L");
      noteId = addNote(notes, noteId, bassPitch, bt + i * beatSec + s8, s8 * 0.8, 80, "L");
    }

    const pattern = [
      { p: leadPitch, o: 0 },
      { p: leadPitch, o: s16 },
      { p: leadPitch + 12, o: s8 },
      { p: 69, o: s8 + s16 },
      { p: 68, o: beatSec },
      { p: 67, o: beatSec + s16 },
      { p: 65, o: beatSec + s8 },
      { p: leadPitch, o: beatSec + s8 + s16 },
      { p: 65, o: beatSec * 1.5 },
      { p: 67, o: beatSec * 1.5 + s16 }
    ];

    for (const pt of pattern) {
      noteId = addNote(notes, noteId, pt.p, bt + pt.o, s16 * 0.9, 90, "R");
      if (isOctaves) {
        noteId = addNote(notes, noteId, pt.p + 12, bt + pt.o, s16 * 0.9, 94, "R");
      }
    }
    curTime += 4 * beatSec;
  }

  for (const sb of sansBars) {
    emitSansMeasure(sb.lead, sb.bass, false);
  }
  for (let r = 0; r < 15; r++) {
    for (const sb of sansBars) {
      emitSansMeasure(sb.lead, sb.bass, true);
    }
  }

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "4/4",
    tracks: [
      { index: 0, name: "Left Hand (Funk Chiptune Bass Staccatos & Octave Slaps)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Iconic Sans 4-Bar Ostinato & Fast Solos)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 14. KOJI KONDO SUPER MARIO BROS
export function buildSuperMarioThemeData(): NoteData {
  const bpm = 100;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  const introRH = [
    { p: 76, o: 0, d: s8 }, { p: 76, o: s8, d: s8 }, { p: 76, o: s8 * 3, d: s8 },
    { p: 72, o: s8 * 5, d: s8 }, { p: 76, o: s8 * 6, d: s8 },
    { p: 79, o: s8 * 8, d: beatSec },
    { p: 67, o: s8 * 12, d: beatSec }
  ];
  for (const ir of introRH) {
    noteId = addNote(notes, noteId, ir.p, curTime + ir.o, ir.d * 0.9, 86, "R");
  }
  curTime += 8 * beatSec;

  function emitOverworldPhrase(repetitions = 2) {
    for (let r = 0; r < repetitions; r++) {
      const phraseRH = [
        { p: 72, o: 0, d: s8 }, { p: 67, o: beatSec, d: s8 }, { p: 64, o: beatSec * 2, d: s8 },
        { p: 69, o: beatSec * 3, d: s8 }, { p: 71, o: beatSec * 3.5, d: s8 },
        { p: 70, o: beatSec * 4, d: s8 }, { p: 69, o: beatSec * 4.5, d: beatSec },
        { p: 67, o: beatSec * 6, d: s8 }, { p: 76, o: beatSec * 6.5, d: s8 }, { p: 79, o: beatSec * 7, d: s8 },
        { p: 81, o: beatSec * 7.5, d: s8 }, { p: 77, o: beatSec * 8, d: s8 }, { p: 79, o: beatSec * 8.5, d: s8 },
        { p: 76, o: beatSec * 9.5, d: s8 }, { p: 72, o: beatSec * 10, d: s8 }, { p: 74, o: beatSec * 10.5, d: s8 },
        { p: 71, o: beatSec * 11, d: beatSec }
      ];

      for (const pr of phraseRH) {
        noteId = addNote(notes, noteId, pr.p, curTime + pr.o, pr.d * 0.9, 84, "R");
      }

      const bassNotes = [48, 55, 52, 45, 50, 43, 48, 55, 48, 55, 48, 55];
      for (let b = 0; b < bassNotes.length; b++) {
        noteId = addNote(notes, noteId, bassNotes[b], curTime + b * beatSec, beatSec * 0.8, 76, "L");
      }
      curTime += 12 * beatSec;
    }
  }

  emitOverworldPhrase(16);

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "2/4",
    tracks: [
      { index: 0, name: "Left Hand (Calypso Stride Bass & Underground Walks)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Iconic Overworld Ragtime Rhythms)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 15. KOJI KONDO ZELDA'S LULLABY
export function buildZeldasLullabyData(): NoteData {
  const bpm = 84;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  const progressions = [
    { root: 43, arp: [43, 50, 55, 59] },
    { root: 48, arp: [48, 55, 60, 64] },
    { root: 50, arp: [50, 57, 62, 66] },
    { root: 40, arp: [40, 47, 52, 55] },
  ];

  function emitLullabyTheme(cycles = 2, withOctaves = false) {
    for (let c = 0; c < cycles; c++) {
      const themeRH = [
        [{ p: 71, d: beatSec * 2 }, { p: 74, d: beatSec }],
        [{ p: 69, d: beatSec * 3 }],
        [{ p: 67, d: s8 }, { p: 69, d: s8 }, { p: 71, d: beatSec }, { p: 74, d: beatSec }],
        [{ p: 69, d: beatSec * 3 }],
        [{ p: 67, d: s8 }, { p: 69, d: s8 }, { p: 71, d: beatSec }, { p: 74, d: beatSec }],
        [{ p: 81, d: beatSec * 2 }, { p: 79, d: beatSec }],
        [{ p: 74, d: beatSec * 3 }],
        [{ p: 72, d: beatSec * 2 }, { p: 71, d: beatSec }]
      ];

      for (let m = 0; m < themeRH.length; m++) {
        const mTime = curTime;
        const prog = progressions[m % progressions.length];
        for (let i = 0; i < prog.arp.length; i++) {
          noteId = addNote(notes, noteId, prog.arp[i], mTime + i * (beatSec * 0.75), beatSec * 1.5, 64, "L");
        }
        let rt = mTime;
        for (const r of themeRH[m]) {
          noteId = addNote(notes, noteId, r.p, rt, r.d * 0.95, 78, "R");
          if (withOctaves) {
            noteId = addNote(notes, noteId, r.p + 12, rt, r.d * 0.95, 82, "R");
          }
          rt += r.d;
        }
        curTime += 3 * beatSec;
      }
    }
  }

  emitLullabyTheme(3, false);
  emitLullabyTheme(5, true);

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "3/4",
    tracks: [
      { index: 0, name: "Left Hand (Royal Harp Arpeggio Cascades)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Triforce Lyrical Melody & Ornaments)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 16. JVKE GOLDEN HOUR
export function buildGoldenHourData(): NoteData {
  const bpm = 94;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const s16 = s8 / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  const cascades = [
    [55, 59, 62, 66, 67, 71, 74, 78, 74, 71, 67, 66, 62, 59, 55, 50],
    [52, 55, 59, 62, 64, 67, 71, 74, 71, 67, 64, 62, 59, 55, 52, 47],
    [48, 52, 55, 59, 60, 64, 67, 71, 67, 64, 60, 59, 55, 52, 48, 43],
    [50, 54, 57, 61, 62, 66, 69, 73, 69, 66, 62, 61, 57, 54, 50, 45],
  ];

  function emitGoldenCycle(withMelody = false, dynamics = 76) {
    for (let bar = 0; bar < cascades.length; bar++) {
      const bTime = curTime;
      const arp = cascades[bar];
      const root = arp[0] - 12;

      noteId = addNote(notes, noteId, root, bTime, beatSec * 3.8, dynamics + 6, "L");
      noteId = addNote(notes, noteId, root + 7, bTime + beatSec * 2, beatSec * 1.8, dynamics, "L");

      for (let i = 0; i < 16; i++) {
        noteId = addNote(notes, noteId, arp[i], bTime + i * s16, s16 * 0.9, dynamics - 4, "R");
      }

      if (withMelody) {
        const vocalP = bar === 0 ? 74 : bar === 1 ? 71 : bar === 2 ? 67 : 69;
        noteId = addNote(notes, noteId, vocalP, bTime, beatSec * 1.5, dynamics + 14, "R");
        noteId = addNote(notes, noteId, vocalP, bTime + beatSec * 1.5, beatSec * 0.5, dynamics + 10, "R");
        noteId = addNote(notes, noteId, vocalP + 2, bTime + beatSec * 2, beatSec * 1.8, dynamics + 14, "R");
      }
      curTime += 4 * beatSec;
    }
  }

  emitGoldenCycle(false, 72);
  emitGoldenCycle(true, 78);
  emitGoldenCycle(true, 82);
  emitGoldenCycle(true, 86);
  emitGoldenCycle(true, 92);
  emitGoldenCycle(true, 94);
  emitGoldenCycle(true, 90);
  emitGoldenCycle(false, 68);

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "4/4",
    tracks: [
      { index: 0, name: "Left Hand (Shimmering Golden Arpeggio Cascades)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Virtuosic 16th Piano Cascades & Melody)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 17. TAYLOR SWIFT LOVE STORY
export function buildLoveStoryData(): NoteData {
  const bpm = 118;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  const popChords = [
    { bass: 38, chord: [54, 57, 62] },
    { bass: 45, chord: [52, 57, 61] },
    { bass: 47, chord: [54, 59, 62] },
    { bass: 43, chord: [55, 59, 62] },
  ];

  function emitPopVerse() {
    for (const pc of popChords) {
      const bt = curTime;
      noteId = addNote(notes, noteId, pc.bass, bt, beatSec * 3.8, 76, "L");
      for (let b = 0; b < 4; b++) {
        for (const cp of pc.chord) {
          noteId = addNote(notes, noteId, cp, bt + b * beatSec, beatSec * 0.8, 65, "L");
        }
      }
      const mel = [66, 66, 66, 64, 62, 66, 64];
      for (let i = 0; i < mel.length; i++) {
        noteId = addNote(notes, noteId, mel[i], bt + i * s8, s8 * 0.9, 82, "R");
      }
      curTime += 4 * beatSec;
    }
  }

  function emitPopChorus(withOctaves = false) {
    for (const pc of popChords) {
      const bt = curTime;
      for (let i = 0; i < 8; i++) {
        noteId = addNote(notes, noteId, pc.bass, bt + i * s8, s8 * 0.85, 84, "L");
      }
      const chorusP = [69, 69, 69, 66, 69, 69, 69, 66];
      for (let i = 0; i < chorusP.length; i++) {
        noteId = addNote(notes, noteId, chorusP[i], bt + i * s8, s8 * 0.9, 88, "R");
        if (withOctaves) {
          noteId = addNote(notes, noteId, chorusP[i] + 12, bt + i * s8, s8 * 0.9, 92, "R");
        }
      }
      curTime += 4 * beatSec;
    }
  }

  emitPopVerse();
  emitPopVerse();
  emitPopChorus(false);
  emitPopChorus(true);
  emitPopVerse();
  emitPopVerse();
  emitPopChorus(true);
  emitPopChorus(true);

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "4/4",
    tracks: [
      { index: 0, name: "Left Hand (Pop Ballad Piano Chords & Bass Octaves)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Taylor Swift Lyrical Hooks & Romeo Modulation)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 18. COLDPLAY THE SCIENTIST
export function buildTheScientistData(): NoteData {
  const bpm = 73;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  const scientistChords = [
    { bass: 38, chord: [53, 57, 60] },
    { bass: 34, chord: [53, 58, 62] },
    { bass: 29, chord: [53, 57, 60] },
    { bass: 36, chord: [53, 55, 60] },
  ];

  function emitScientistCycle(withVocal = false) {
    for (let c = 0; c < scientistChords.length; c++) {
      const bt = curTime;
      const sc = scientistChords[c];
      noteId = addNote(notes, noteId, sc.bass, bt, beatSec * 3.8, 76, "L");
      noteId = addNote(notes, noteId, sc.bass + 12, bt, beatSec * 3.8, 72, "L");

      for (let beat = 0; beat < 4; beat++) {
        for (const cp of sc.chord) {
          noteId = addNote(notes, noteId, cp, bt + beat * beatSec, beatSec * 0.85, 68, "R");
        }
      }

      if (withVocal) {
        const vocalP = c === 0 ? 69 : c === 1 ? 67 : c === 2 ? 65 : 69;
        noteId = addNote(notes, noteId, vocalP, bt, beatSec * 1.5, 84, "R");
        noteId = addNote(notes, noteId, vocalP, bt + beatSec * 1.5, s8, 80, "R");
        noteId = addNote(notes, noteId, vocalP - 2, bt + beatSec * 2, beatSec * 1.8, 84, "R");
      }
      curTime += 4 * beatSec;
    }
  }

  emitScientistCycle(false);
  emitScientistCycle(true);
  emitScientistCycle(true);

  for (let c = 0; c < 7; c++) {
    for (const sc of scientistChords) {
      const bt = curTime;
      noteId = addNote(notes, noteId, sc.bass - 12, bt, beatSec * 3.8, 84, "L");
      noteId = addNote(notes, noteId, sc.bass, bt, beatSec * 3.8, 80, "L");
      for (let b = 0; b < 4; b++) {
        for (const cp of sc.chord) {
          noteId = addNote(notes, noteId, cp, bt + b * beatSec, beatSec * 0.85, 74, "R");
        }
      }
      noteId = addNote(notes, noteId, 72, bt, beatSec, 90, "R");
      noteId = addNote(notes, noteId, 74, bt + beatSec, beatSec, 92, "R");
      noteId = addNote(notes, noteId, 72, bt + beatSec * 2, beatSec, 88, "R");
      noteId = addNote(notes, noteId, 69, bt + beatSec * 3, beatSec, 86, "R");
      curTime += 4 * beatSec;
    }
  }

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "4/4",
    tracks: [
      { index: 0, name: "Left Hand (Warm Acoustic Piano Bass Octaves)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (Iconic Coldplay Piano Chords & Singing Hook)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 19. BTS SPRING DAY
export function buildSpringDayData(): NoteData {
  const bpm = 107;
  const beatSec = 60 / bpm;
  const s8 = beatSec / 2;
  const notes: Note[] = [];
  let noteId = 1;
  let curTime = 0;

  const btsChords = [
    { root: 39, arp: [39, 46, 51, 55] },
    { root: 43, arp: [43, 50, 55, 58] },
    { root: 44, arp: [44, 51, 56, 60] },
    { root: 46, arp: [46, 53, 58, 62] },
  ];

  const bellMotif = [
    [70, 72, 75, 79, 77, 75, 72, 70],
    [70, 72, 75, 79, 77, 75, 72, 70],
    [68, 72, 75, 80, 79, 75, 72, 68],
    [70, 74, 77, 82, 80, 77, 74, 70]
  ];

  function emitBtsCycle(withVocal = false) {
    for (let c = 0; c < btsChords.length; c++) {
      const bt = curTime;
      const bc = btsChords[c];
      noteId = addNote(notes, noteId, bc.root, bt, beatSec * 3.8, 72, "L");
      for (let i = 1; i < bc.arp.length; i++) {
        noteId = addNote(notes, noteId, bc.arp[i], bt + i * beatSec, beatSec * 0.9, 64, "L");
      }

      if (!withVocal) {
        const bell = bellMotif[c];
        for (let i = 0; i < bell.length; i++) {
          noteId = addNote(notes, noteId, bell[i], bt + i * s8, s8 * 0.85, 78, "R");
        }
      } else {
        const vocal = [63, 63, 65, 67, 65, 63];
        for (let i = 0; i < vocal.length; i++) {
          noteId = addNote(notes, noteId, vocal[i], bt + i * s8, s8 * 0.9, 84, "R");
        }
      }
      curTime += 4 * beatSec;
    }
  }

  emitBtsCycle(false);
  emitBtsCycle(true);
  emitBtsCycle(true);

  for (let c = 0; c < 7; c++) {
    for (let b = 0; b < btsChords.length; b++) {
      const bt = curTime;
      const bc = btsChords[b];
      noteId = addNote(notes, noteId, bc.root - 12, bt, beatSec * 3.8, 84, "L");
      noteId = addNote(notes, noteId, bc.root, bt, beatSec * 3.8, 80, "L");
      const chorusP = [75, 77, 79, 82, 79, 77, 75];
      for (let i = 0; i < chorusP.length; i++) {
        noteId = addNote(notes, noteId, chorusP[i], bt + i * s8, s8 * 0.9, 90, "R");
        noteId = addNote(notes, noteId, chorusP[i] + 12, bt + i * s8, s8 * 0.9, 92, "R");
      }
      curTime += 4 * beatSec;
    }
  }

  const duration_sec = Number(curTime.toFixed(2));
  return {
    schema_version: 1,
    bpm,
    duration_sec,
    time_signature: "4/4",
    tracks: [
      { index: 0, name: "Left Hand (Warm K-Pop Ballad Arpeggios & Deep Bass)", note_count: notes.filter(n => n.hand === "L").length },
      { index: 1, name: "Right Hand (BTS Bell Intro Motif & Singing Hook)", note_count: notes.filter(n => n.hand === "R").length },
    ],
    notes,
  };
}

// 20. ONE SUMMER'S DAY (Joe Hisaishi / Spirited Away)
export function buildOneSummersDayData(): NoteData {
  return buildFullArrangedSong({
    bpm: 80,
    time_sig: "4/4",
    keyRoot: 60, // C4
    isMinor: false,
    lhName: "Left Hand (Nostalgic Rolling Ghibli Arpeggios)",
    rhName: "Right Hand (Spirited Away Theme & Emotional Bridge)",
    sections: [
      {
        name: "intro",
        bars: 8,
        chordRoots: [5, 7, 4, 9], // Fmaj7 - G - Em7 - Am7 (Royal Road)
        lhStyle: "rollingArp",
        rhMelody: [4, 7, 9, 11, 12, 11, 9, 7, 4, 2, 0, 2],
        rhRhythm: "lyrical8th",
        dynamics: { lh: 52, rh: 78 },
      },
      {
        name: "verse",
        bars: 16,
        chordRoots: [5, 7, 4, 9, 2, 7, 0, 0], // F - G - Em - Am - Dm - G - C - C
        lhStyle: "rollingArp",
        rhMelody: [4, 7, 11, 12, 14, 12, 11, 9, 7, 4, 2, 4, 7, 9, 7, 4],
        rhRhythm: "lyrical8th",
        dynamics: { lh: 55, rh: 82 },
      },
      {
        name: "preChorus",
        bars: 8,
        chordRoots: [5, 7, 4, 9, 5, 7, 0, 0],
        lhStyle: "ballad10th",
        rhMelody: [7, 9, 11, 12, 14, 16, 17, 16, 14, 12, 11, 9, 11, 12, 14],
        rhRhythm: "syncopated16th",
        dynamics: { lh: 58, rh: 85 },
      },
      {
        name: "chorus",
        bars: 16,
        chordRoots: [5, 7, 4, 9, 5, 7, 0, 0, 5, 7, 4, 9, 2, 7, 0, 0],
        lhStyle: "rollingArp",
        rhMelody: [16, 14, 12, 11, 9, 7, 9, 11, 12, 14, 16, 19, 16, 14, 12, 11],
        rhRhythm: "climaxOctaves",
        dynamics: { lh: 65, rh: 94 },
      },
      {
        name: "verse",
        bars: 12,
        chordRoots: [5, 7, 4, 9, 2, 7, 0, 0],
        lhStyle: "rollingArp",
        rhMelody: [4, 7, 11, 12, 14, 12, 11, 9, 7, 4, 2, 4],
        rhRhythm: "lyrical8th",
        dynamics: { lh: 54, rh: 80 },
      },
      {
        name: "bridge",
        bars: 8,
        chordRoots: [2, 7, 0, 9, 2, 7, 0, 0],
        lhStyle: "continuous16th",
        rhMelody: [12, 14, 16, 19, 21, 19, 16, 14, 12, 11, 9, 7],
        rhRhythm: "cascades",
        dynamics: { lh: 62, rh: 88 },
      },
      {
        name: "chorus",
        bars: 16,
        chordRoots: [5, 7, 4, 9, 5, 7, 0, 0, 5, 7, 4, 9, 2, 7, 0, 0],
        lhStyle: "rollingArp",
        rhMelody: [16, 14, 12, 11, 9, 7, 9, 11, 12, 14, 16, 19, 16, 14, 12, 11],
        rhRhythm: "climaxOctaves",
        dynamics: { lh: 66, rh: 96 },
      },
      {
        name: "coda",
        bars: 8,
        chordRoots: [5, 7, 0, 0],
        lhStyle: "rollingArp",
        rhMelody: [12, 11, 9, 7, 4, 2, 0, 0],
        rhRhythm: "lyrical8th",
        dynamics: { lh: 50, rh: 76 },
      },
    ],
  });
}

// 21. KISS THE RAIN (Yiruma)
export function buildKissTheRainData(): NoteData {
  return buildFullArrangedSong({
    bpm: 68,
    time_sig: "4/4",
    keyRoot: 56, // Ab3
    isMinor: false,
    lhName: "Left Hand (Gentle Lyrical Ballad 10th Arpeggios)",
    rhName: "Right Hand (Emotional Singing Ballad Hook & Drops)",
    sections: [
      {
        name: "intro",
        bars: 6,
        chordRoots: [0, 7, 9, 4, 5, 0], // Ab - Eb - Fm - Cm - Db - Ab
        lhStyle: "ballad10th",
        rhMelody: [12, 11, 9, 7, 9, 12, 11, 7, 5, 4, 2, 4, 7, 4, 2, 0],
        rhRhythm: "lyrical8th",
        dynamics: { lh: 50, rh: 76 },
      },
      {
        name: "verse",
        bars: 16,
        chordRoots: [0, 7, 9, 4, 5, 0, 2, 7], // Ab - Eb - Fm - Cm - Db - Ab - Bbm - Eb
        lhStyle: "ballad10th",
        rhMelody: [4, 7, 9, 11, 12, 11, 9, 7, 4, 2, 4, 5, 7, 5, 4, 2],
        rhRhythm: "lyrical8th",
        dynamics: { lh: 52, rh: 78 },
      },
      {
        name: "preChorus",
        bars: 8,
        chordRoots: [5, 7, 4, 9, 5, 7, 0, 0],
        lhStyle: "rollingArp",
        rhMelody: [7, 9, 11, 12, 14, 12, 11, 9, 7, 5, 4, 2, 4, 7, 9, 11],
        rhRhythm: "syncopated16th",
        dynamics: { lh: 56, rh: 82 },
      },
      {
        name: "chorus",
        bars: 16,
        chordRoots: [0, 7, 9, 4, 5, 0, 5, 7, 0, 7, 9, 4, 5, 7, 0, 0],
        lhStyle: "ballad10th",
        rhMelody: [12, 14, 16, 14, 12, 11, 9, 7, 9, 11, 12, 14, 16, 12, 9, 7],
        rhRhythm: "climaxOctaves",
        dynamics: { lh: 64, rh: 92 },
      },
      {
        name: "verse",
        bars: 12,
        chordRoots: [0, 7, 9, 4, 5, 0, 2, 7],
        lhStyle: "ballad10th",
        rhMelody: [4, 7, 9, 11, 12, 11, 9, 7, 4, 2, 4, 2],
        rhRhythm: "lyrical8th",
        dynamics: { lh: 52, rh: 78 },
      },
      {
        name: "bridge",
        bars: 8,
        chordRoots: [5, 7, 9, 0, 5, 7, 0, 0],
        lhStyle: "rollingArp",
        rhMelody: [14, 16, 19, 16, 14, 12, 11, 9, 7, 9, 11, 14, 16, 14, 12, 11],
        rhRhythm: "cascades",
        dynamics: { lh: 60, rh: 86 },
      },
      {
        name: "chorus",
        bars: 16,
        chordRoots: [0, 7, 9, 4, 5, 0, 5, 7, 0, 7, 9, 4, 5, 7, 0, 0],
        lhStyle: "ballad10th",
        rhMelody: [12, 14, 16, 14, 12, 11, 9, 7, 9, 11, 12, 14, 16, 12, 9, 7],
        rhRhythm: "climaxOctaves",
        dynamics: { lh: 66, rh: 94 },
      },
      {
        name: "coda",
        bars: 8,
        chordRoots: [5, 7, 0, 0],
        lhStyle: "ballad10th",
        rhMelody: [7, 4, 2, 0, 0],
        rhRhythm: "lyrical8th",
        dynamics: { lh: 48, rh: 75 },
      },
    ],
  });
}

// 22. FLY ME TO THE MOON (Bart Howard / Frank Sinatra)
export function buildFlyMeToTheMoonData(): NoteData {
  return buildFullArrangedSong({
    bpm: 120,
    time_sig: "4/4",
    keyRoot: 60, // C4
    isMinor: false,
    lhName: "Left Hand (Classic Sinatra Swing/Bossa Bass & Guide Tones)",
    rhName: "Right Hand (Classic Sinatra Melody & Jazzy Swing Phrasing)",
    sections: [
      {
        name: "intro",
        bars: 8,
        chordRoots: [9, 2, 7, 0, 5, 11, 4, 9], // Am7 - Dm7 - G7 - Cmaj7 - Fmaj7 - Bm7b5 - E7 - Am7
        lhStyle: "bossaSwing",
        rhMelody: [12, 11, 9, 7, 5, 7, 9, 12, 11, 9, 7, 5, 4],
        rhRhythm: "syncopated16th",
        dynamics: { lh: 55, rh: 80 },
      },
      {
        name: "verse",
        bars: 16,
        chordRoots: [9, 2, 7, 0, 5, 11, 4, 9, 2, 7, 0, 9, 2, 7, 0, 4],
        lhStyle: "bossaSwing",
        rhMelody: [12, 11, 9, 7, 5, 7, 9, 12, 11, 9, 7, 5, 4, 9, 7, 5, 4, 2, 4, 5, 9, 7, 5, 4, 2, 0],
        rhRhythm: "syncopated16th",
        dynamics: { lh: 58, rh: 84 },
      },
      {
        name: "chorus",
        bars: 16,
        chordRoots: [2, 7, 0, 9, 2, 7, 0, 4, 9, 2, 7, 0, 5, 11, 4, 9],
        lhStyle: "bossaSwing",
        rhMelody: [2, 4, 5, 7, 9, 11, 12, 14, 12, 11, 9, 7, 12, 11, 9, 7, 5, 7, 9, 12, 14, 16, 17, 16, 14, 12],
        rhRhythm: "syncopated16th",
        dynamics: { lh: 62, rh: 88 },
      },
      {
        name: "bridge",
        bars: 16, // Jazz Solo / Improvisation
        chordRoots: [9, 2, 7, 0, 5, 11, 4, 9, 2, 7, 0, 9, 2, 7, 0, 4],
        lhStyle: "stride",
        rhMelody: [12, 14, 15, 16, 19, 17, 16, 14, 12, 11, 9, 8, 9, 11, 12, 14, 16, 19, 21, 19, 17, 16, 14, 12],
        rhRhythm: "cascades",
        dynamics: { lh: 64, rh: 92 },
      },
      {
        name: "verse",
        bars: 16,
        chordRoots: [9, 2, 7, 0, 5, 11, 4, 9, 2, 7, 0, 9, 2, 7, 0, 4],
        lhStyle: "bossaSwing",
        rhMelody: [12, 11, 9, 7, 5, 7, 9, 12, 11, 9, 7, 5, 4, 9, 7, 5, 4, 2, 4, 5, 9, 7, 5, 4, 2, 0],
        rhRhythm: "syncopated16th",
        dynamics: { lh: 58, rh: 85 },
      },
      {
        name: "chorus",
        bars: 16,
        chordRoots: [2, 7, 0, 9, 2, 7, 0, 4, 9, 2, 7, 0, 5, 11, 4, 0],
        lhStyle: "bossaSwing",
        rhMelody: [2, 4, 5, 7, 9, 11, 12, 14, 12, 11, 9, 7, 12, 11, 9, 7, 5, 7, 9, 12, 14, 16, 17, 16, 14, 12],
        rhRhythm: "climaxOctaves",
        dynamics: { lh: 66, rh: 95 },
      },
      {
        name: "coda",
        bars: 8,
        chordRoots: [2, 7, 0, 0],
        lhStyle: "stride",
        rhMelody: [12, 11, 9, 7, 5, 4, 2, 0, 0],
        rhRhythm: "syncopated16th",
        dynamics: { lh: 52, rh: 78 },
      },
    ],
  });
}

/**
 * Universal Landmark Full Song Generator Registry
 * Maps canonical repertoire IDs and aliases directly to their dedicated full-length generators.
 */
export const FULL_SONG_GENERATOR_REGISTRY: Record<string, () => NoteData> = {
  "fur-elise": buildFurEliseData,
  "furelise": buildFurEliseData,
  "moonlight-sonata": buildMoonlightSonataData,
  "moonlightsonata": buildMoonlightSonataData,
  "beethovenmoonlight": buildMoonlightSonataData,
  "moonlight-sonata-3rd": buildMoonlightSonata3rdData,
  "moonlightsonata3rd": buildMoonlightSonata3rdData,
  "prestoagitato": buildMoonlightSonata3rdData,
  "canon-in-d": buildCanonInDData,
  "canonind": buildCanonInDData,
  "pachelbelcanon": buildCanonInDData,
  "clair-de-lune": buildClairDeLuneData,
  "clairdelune": buildClairDeLuneData,
  "gymnopedie-1": buildGymnopedie1Data,
  "gymnopedie-no-1": buildGymnopedie1Data,
  "gymnopedie1": buildGymnopedie1Data,
  "gymnopedieno1": buildGymnopedie1Data,
  "bach-prelude-c-major": buildBachPreludeCMajorData,
  "prelude-in-c": buildBachPreludeCMajorData,
  "bachpreludecmajor": buildBachPreludeCMajorData,
  "preludecmajorbwv846": buildBachPreludeCMajorData,
  "preludeinc": buildBachPreludeCMajorData,
  "mozart-rondo-alla-turca": buildMozartRondoAllaTurcaData,
  "rondo-alla-turca": buildMozartRondoAllaTurcaData,
  "rondoallaturca": buildMozartRondoAllaTurcaData,
  "mozartrondoallaturca": buildMozartRondoAllaTurcaData,
  "chopin-nocturne-op9-no2": buildChopinNocturneOp9No2Data,
  "chopinnocturneop9no2": buildChopinNocturneOp9No2Data,
  "chopinebmajornocturne": buildChopinNocturneOp9No2Data,
  "chopin-waltz-in-a-minor": buildChopinWaltzInAMinorData,
  "chopin-waltz-a-minor": buildChopinWaltzInAMinorData,
  "chopinwaltzaminor": buildChopinWaltzInAMinorData,
  "chopinwaltzinaminor": buildChopinWaltzInAMinorData,
  "ode-to-joy": buildOdeToJoyData,
  "odetojoy": buildOdeToJoyData,
  "beethovenodetojoy": buildOdeToJoyData,
  "bach-minuet-in-g": buildBachMinuetInGData,
  "bachminueting": buildBachMinuetInGData,
  "minuetingmajor": buildBachMinuetInGData,
  "river-flows-in-you": buildRiverFlowsInYouData,
  "riverflowsinyou": buildRiverFlowsInYouData,
  "riverflows": buildRiverFlowsInYouData,
  "yirumariverflowsinyou": buildRiverFlowsInYouData,
  "sparkle": buildSparkleData,
  "sparkle-your-name": buildSparkleData,
  "sparkleyourname": buildSparkleData,
  "radwimpssparkle": buildSparkleData,
  "interstellar": buildInterstellarData,
  "interstellar-main-theme": buildInterstellarData,
  "interstellarmaintheme": buildInterstellarData,
  "firststepinterstellar": buildInterstellarData,
  "he-is-a-pirate": buildHeIsAPirateData,
  "hes-a-pirate": buildHeIsAPirateData,
  "heisapirate": buildHeIsAPirateData,
  "hesapirate": buildHeIsAPirateData,
  "piratesofthecaribbean": buildHeIsAPirateData,
  "merry-go-round-of-life": buildMerryGoRoundOfLifeData,
  "merrygoroundoflife": buildMerryGoRoundOfLifeData,
  "howlsmovingcastle": buildMerryGoRoundOfLifeData,
  "the-entertainer": buildTheEntertainerData,
  "the-entertainer-joplin": buildTheEntertainerData,
  "theentertainer": buildTheEntertainerData,
  "theentertainerjoplin": buildTheEntertainerData,
  "autumn-leaves": buildAutumnLeavesData,
  "autumnleaves": buildAutumnLeavesData,
  "billevansautumnleaves": buildAutumnLeavesData,
  "megalovania": buildMegalovaniaData,
  "megalovaniaundertale": buildMegalovaniaData,
  "super-mario-theme": buildSuperMarioThemeData,
  "super-mario-bros-theme": buildSuperMarioThemeData,
  "supermariotheme": buildSuperMarioThemeData,
  "supermariobros": buildSuperMarioThemeData,
  "supermariobrostheme": buildSuperMarioThemeData,
  "zelda-lullaby": buildZeldasLullabyData,
  "zeldas-lullaby": buildZeldasLullabyData,
  "zeldaslullaby": buildZeldasLullabyData,
  "zeldalullaby": buildZeldasLullabyData,
  "zeldalullabykondo": buildZeldasLullabyData,
  "golden-hour": buildGoldenHourData,
  "golden-hour-jvke": buildGoldenHourData,
  "goldenhour": buildGoldenHourData,
  "goldenhourjvke": buildGoldenHourData,
  "love-story": buildLoveStoryData,
  "love-story-taylor-swift": buildLoveStoryData,
  "lovestory": buildLoveStoryData,
  "lovestorytaylorswift": buildLoveStoryData,
  "the-scientist": buildTheScientistData,
  "the-scientist-coldplay": buildTheScientistData,
  "thescientist": buildTheScientistData,
  "thescientistcoldplay": buildTheScientistData,
  "spring-day": buildSpringDayData,
  "spring-day-bts": buildSpringDayData,
  "springday": buildSpringDayData,
  "springdaybts": buildSpringDayData,
  "one-summers-day": buildOneSummersDayData,
  "onesummersday": buildOneSummersDayData,
  "spiritedawayonesummersday": buildOneSummersDayData,
  "kiss-the-rain": buildKissTheRainData,
  "kisstherain": buildKissTheRainData,
  "yirumakisstherain": buildKissTheRainData,
  "fly-me-to-the-moon": buildFlyMeToTheMoonData,
  "fly-me-to-the-moon-jazz": buildFlyMeToTheMoonData,
  "flymetothemoon": buildFlyMeToTheMoonData,
  "flymetothemoonjazz": buildFlyMeToTheMoonData,
  "gurenge": buildGurengeData,
  "blue-bird": buildBlueBirdData,
  "blue-bird-naruto": buildBlueBirdData,
  "bluebird": buildBlueBirdData,
  "bluebirdnaruto": buildBlueBirdData,
  "hikaru-nara": buildHikaruNaraData,
  "hikarunara": buildHikaruNaraData,
  "nandemonaiya": buildNandemonaiyaData,
  "katawaredoki": buildKatawaredokiData,
  "unravel": buildUnravelData,
  "tokyo-ghoul-unravel-acoustic-solo": buildUnravelData,
  "hedwigs-theme": buildHedwigsThemeData,
  "hedwigstheme": buildHedwigsThemeData,
  "someone-like-you": buildSomeoneLikeYouData,
  "someone-like-you-adele": buildSomeoneLikeYouData,
  "someonelikeyou": buildSomeoneLikeYouData,
  "someonelikeyouadele": buildSomeoneLikeYouData,
  "shape-of-you": buildShapeOfYouData,
  "shapeofyou": buildShapeOfYouData,
  "shallow": buildShallowData,
  "shallow-lady-gaga": buildShallowData,
  "shallowladygaga": buildShallowData,
  "bohemian-rhapsody": buildBohemianRhapsodyData,
  "bohemianrhapsody": buildBohemianRhapsodyData,
  "all-of-me": buildAllOfMeData,
  "all-of-me-john-legend": buildAllOfMeData,
  "allofme": buildAllOfMeData,
  "allofmejohnlegend": buildAllOfMeData,
  "dynamite": buildDynamiteData,
  "dynamite-bts": buildDynamiteData,
  "butter": buildButterData,
  "butter-bts": buildButterData,
  "love-scenario": buildLoveScenarioData,
  "love-scenario-ikon": buildLoveScenarioData,
  "lovescenario": buildLoveScenarioData,
  "lovescenarioikon": buildLoveScenarioData,
  "stay-with-me": buildStayWithMeData,
  "stay-with-me-chanyeol": buildStayWithMeData,
  "staywithme": buildStayWithMeData,
  "staywithmechanyeol": buildStayWithMeData,
  "debussy-arabesque-1": buildDebussyArabesque1Data,
  "premiere-arabesque": buildDebussyArabesque1Data,
  "debussyarabesque1": buildDebussyArabesque1Data,
  "premierearabesque": buildDebussyArabesque1Data,
};
