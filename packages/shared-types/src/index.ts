/**
 * Shared contracts between web (TS) and api/worker (Python).
 * Constants live in constants.json so Python can read the same file —
 * prevents frontend/backend limit drift (CODE_ARCHITECTURE.md §6).
 */
import constants from "./constants.json";
import themes from "./themes.json";

export const LIMITS = constants;
export const THEME_PRESETS = themes.PRESETS;
export const DEFAULT_PRESET = themes.DEFAULT_PRESET;

export type Resolution = (typeof constants.RESOLUTIONS)[number];
export type Difficulty = (typeof constants.DIFFICULTIES)[number];
export type PresetName = keyof typeof themes.PRESETS | "custom";
export type Hand = "L" | "R";

export interface NoteColors {
  right_hand: string;
  left_hand: string;
  key_highlight: string;
  glow: string;
  hit_effect: string;
  background: string;
}

export type JobType =
  | "parse_midi"
  | "generate_preview"
  | "render_sheet"
  | "render_video"
  | "simplify_midi";

export type JobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

/** Mirrors schemas/notes.schema.json (schema_version 1). */
export interface Note {
  id: number;
  pitch: number;
  name: string;
  velocity: number;
  start: number;
  end: number;
  duration: number;
  track: number;
  hand: Hand;
}

export interface NoteData {
  schema_version: number;
  bpm: number;
  duration_sec: number;
  time_signature: string;
  tempo_map?: { time: number; bpm: number }[];
  tracks?: { index: number; name?: string; note_count: number; program?: number; is_drum?: boolean }[];
  sustain?: { time: number; value: number }[];
  notes: Note[];
  meta?: Record<string, any>;
}

/** Settings v2 — VIDEO_TUTORIAL_SPEC.md §3. */
export type PianoSoundId = (typeof constants.PIANO_SOUNDS)[number]["id"];
export type ReverbLevel = (typeof constants.REVERB_LEVELS)[number];

export interface RenderSettings {
  resolution: Resolution;
  fps: number;
  speed_multiplier: number;
  piano_sound: PianoSoundId;
  volume: number; // 0..1
  reverb: ReverbLevel;
  difficulty: Difficulty;
  show_note_names: boolean;
  show_keyboard: boolean;
  theme_preset: PresetName;
  colors: NoteColors;
  glow_intensity: number; // 0..1
  note_fall_speed: number; // visual multiplier
  keyboard_size: number; // 0.7..1.3
  version: number;
}
