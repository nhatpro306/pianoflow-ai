export type OctaveWindowKey = 'A0-B2' | 'C2-B3' | 'C3-B4' | 'C4-B5' | 'C5-C8';

export interface OctaveWindow {
  id: string;
  label: string;
  shortLabel: string;
  minPitch: number; // Inclusive MIDI pitch (e.g., 48 for C3)
  maxPitch: number; // Inclusive MIDI pitch (e.g., 71 for B4)
  startWhiteIndex: number;
  whiteKeyCount: number;
}

export interface ViewportCameraState {
  /** Mode: 'manual' (drag/octave buttons) or 'auto' (centroid tracking) */
  mode: 'manual' | 'auto';
  /** Current camera horizontal offset in virtual pixels */
  cameraX: number;
  /** Target camera horizontal offset for smoothing */
  targetCameraX: number;
  /** Viewport width in physical/CSS pixels */
  viewportWidth: number;
  /** Total virtual width of full 88-key layout */
  virtualWidth: number;
  /** Number of visible white keys */
  visibleWhiteKeys: number;
  /** Active octave window index */
  currentOctaveIndex: number;
  /** Whether full 88-key view is forced */
  isFullView: boolean;
}

export const PREDEFINED_OCTAVE_WINDOWS: readonly OctaveWindow[] = [
  {
    id: 'oct-bass',
    label: 'A0 - B2 (Sub/Bass)',
    shortLabel: 'Oct 0-2',
    minPitch: 21,
    maxPitch: 47,
    startWhiteIndex: 0,
    whiteKeyCount: 16,
  },
  {
    id: 'oct-low',
    label: 'C2 - B3 (Low)',
    shortLabel: 'Oct 2-3',
    minPitch: 36,
    maxPitch: 59,
    startWhiteIndex: 9,
    whiteKeyCount: 14,
  },
  {
    id: 'oct-mid',
    label: 'C3 - B4 (Middle)',
    shortLabel: 'Oct 3-4',
    minPitch: 48,
    maxPitch: 71,
    startWhiteIndex: 16,
    whiteKeyCount: 14,
  },
  {
    id: 'oct-treble',
    label: 'C4 - B5 (Treble)',
    shortLabel: 'Oct 4-5',
    minPitch: 60,
    maxPitch: 83,
    startWhiteIndex: 23,
    whiteKeyCount: 14,
  },
  {
    id: 'oct-high',
    label: 'C5 - C8 (High)',
    shortLabel: 'Oct 5-7',
    minPitch: 72,
    maxPitch: 108,
    startWhiteIndex: 30,
    whiteKeyCount: 22,
  },
] as const;
