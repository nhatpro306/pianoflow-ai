import type { NoteData } from "@pianoflow/shared-types";

export interface SheetNote {
  id: number;
  pitch: number;
  name: string;
  start: number; // in seconds
  end: number;   // in seconds
  duration: number;
  hand: "L" | "R";
  stepName: string;
  octave: number;
  accidental: "sharp" | "flat" | null;
  staffOffset: number; // half-spaces from bottom line
  ledgerLines: number[]; // relative half-space steps needing ledger lines
  isHollow: boolean;
  stemDirection: "up" | "down";
}

export interface SheetMeasure {
  index: number;
  startTime: number;
  endTime: number;
  trebleNotes: SheetNote[];
  bassNotes: SheetNote[];
}

export interface SheetSystem {
  index: number;
  measures: SheetMeasure[];
}

export interface SheetScoreModel {
  bpm: number;
  timeSignature: string;
  beatsPerMeasure: number;
  measureDuration: number;
  totalMeasures: number;
  systems: SheetSystem[];
}

const PITCH_MAP = [
  { stepName: "C", stepOffset: 0, accidental: null },
  { stepName: "C", stepOffset: 0, accidental: "sharp" },
  { stepName: "D", stepOffset: 1, accidental: null },
  { stepName: "D", stepOffset: 1, accidental: "sharp" },
  { stepName: "E", stepOffset: 2, accidental: null },
  { stepName: "F", stepOffset: 3, accidental: null },
  { stepName: "F", stepOffset: 3, accidental: "sharp" },
  { stepName: "G", stepOffset: 4, accidental: null },
  { stepName: "G", stepOffset: 4, accidental: "sharp" },
  { stepName: "A", stepOffset: 5, accidental: null },
  { stepName: "A", stepOffset: 5, accidental: "sharp" },
  { stepName: "B", stepOffset: 6, accidental: null },
] as const;

export function buildSheetScoreModel(
  noteData: NoteData,
  measuresPerSystem = 2
): SheetScoreModel {
  const bpm = noteData.bpm || 120;
  const timeSig = noteData.time_signature || "4/4";
  const [numStr] = timeSig.split("/");
  const beatsPerMeasure = parseInt(numStr, 10) || 4;
  const beatDuration = 60 / bpm;
  const measureDuration = beatDuration * beatsPerMeasure;

  const totalDuration =
    noteData.duration_sec ||
    (noteData.notes.length > 0 ? Math.max(...noteData.notes.map((n) => n.end)) : 60);
  const totalMeasures = Math.max(1, Math.ceil(totalDuration / measureDuration));

  // Partition notes into measures
  const measures: SheetMeasure[] = Array.from({ length: totalMeasures }, (_, i) => ({
    index: i,
    startTime: i * measureDuration,
    endTime: (i + 1) * measureDuration,
    trebleNotes: [],
    bassNotes: [],
  }));

  for (const n of noteData.notes) {
    const isRH = n.hand ? n.hand === "R" : n.pitch >= 60;
    const hand: "L" | "R" = isRH ? "R" : "L";
    const measureIdx = Math.floor(n.start / measureDuration);
    if (measureIdx < 0 || measureIdx >= totalMeasures) continue;

    const octave = Math.floor(n.pitch / 12) - 1;
    const pitchClass = n.pitch % 12;
    const info = PITCH_MAP[pitchClass];
    const diatonicStep = octave * 7 + info.stepOffset;

    let staffOffset = 0;
    const ledgerLines: number[] = [];

    if (hand === "R") {
      // E4 is line 1 (bottom line) -> diatonic step = 4 * 7 + 2 = 30
      staffOffset = diatonicStep - 30;
      // Staff lines span offset 0 to 8. Ledger lines below (offset <= -2) or above (offset >= 10)
      if (staffOffset < 0) {
        for (let o = -2; o >= staffOffset; o -= 2) ledgerLines.push(o);
      } else if (staffOffset > 8) {
        for (let o = 10; o <= staffOffset; o += 2) ledgerLines.push(o);
      }
    } else {
      // G2 is line 1 (bottom line) -> diatonic step = 2 * 7 + 4 = 18
      staffOffset = diatonicStep - 18;
      if (staffOffset < 0) {
        for (let o = -2; o >= staffOffset; o -= 2) ledgerLines.push(o);
      } else if (staffOffset > 8) {
        for (let o = 10; o <= staffOffset; o += 2) ledgerLines.push(o);
      }
    }

    const noteDurationBeats = (n.end - n.start) / beatDuration;
    const isHollow = noteDurationBeats >= 2.0;
    const stemDirection: "up" | "down" = staffOffset >= 4 ? "down" : "up";

    const sheetNote: SheetNote = {
      id: n.id,
      pitch: n.pitch,
      name: n.name,
      start: n.start,
      end: n.end,
      duration: n.duration,
      hand,
      stepName: info.stepName,
      octave,
      accidental: info.accidental,
      staffOffset,
      ledgerLines,
      isHollow,
      stemDirection,
    };

    if (hand === "R") {
      measures[measureIdx].trebleNotes.push(sheetNote);
    } else {
      measures[measureIdx].bassNotes.push(sheetNote);
    }
  }

  // Group measures into systems
  const systems: SheetSystem[] = [];
  for (let i = 0; i < measures.length; i += measuresPerSystem) {
    systems.push({
      index: Math.floor(i / measuresPerSystem),
      measures: measures.slice(i, i + measuresPerSystem),
    });
  }

  return {
    bpm,
    timeSignature: timeSig,
    beatsPerMeasure,
    measureDuration,
    totalMeasures,
    systems,
  };
}
