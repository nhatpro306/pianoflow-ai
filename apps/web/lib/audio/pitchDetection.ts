/**
 * Real-time fundamental frequency (F0) pitch detection using Normalized Autocorrelation (ACF)
 * with parabolic sub-sample peak refinement and silence noise-gating.
 */

export interface PitchDetectionResult {
  frequency: number;   // Fundamental frequency in Hz
  pitch: number;       // MIDI note number (0 - 127)
  noteName: string;    // e.g. "C4", "A4", "F#3"
  cents: number;       // Deviation from pure MIDI pitch (-50 to +50)
  confidence: number;  // Autocorrelation peak correlation (0.0 to 1.0)
  rms: number;         // Signal root-mean-square amplitude
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function getMidiNoteName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  const name = NOTE_NAMES[pitch % 12];
  return `${name}${octave}`;
}

export function detectPitchFromSamples(
  buffer: Float32Array,
  sampleRate: number,
  rmsThreshold = 0.015,
  confidenceThreshold = 0.65
): PitchDetectionResult | null {
  const n = buffer.length;

  // 1. Calculate Root-Mean-Square (RMS) amplitude
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    sumSq += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumSq / n);
  if (rms < rmsThreshold) {
    return null; // Signal below ambient noise floor
  }

  // 2. Piano pitch bounds: C2 (65.4 Hz) to C7 (2093 Hz)
  const minLag = Math.floor(sampleRate / 2200); // ~22 at 48kHz
  const maxLag = Math.floor(sampleRate / 60);   // ~800 at 48kHz
  if (maxLag >= n) return null;

  // Helper to compute normalized correlation at a specific lag
  const computeCorrelation = (lag: number): number => {
    let sumProd = 0;
    let sumSqA = 0;
    let sumSqB = 0;
    for (let i = 0; i < n - lag; i++) {
      const a = buffer[i];
      const b = buffer[i + lag];
      sumProd += a * b;
      sumSqA += a * a;
      sumSqB += b * b;
    }
    const norm = Math.sqrt(sumSqA * sumSqB);
    return norm > 1e-6 ? sumProd / norm : 0;
  };

  // 3. Normalized Autocorrelation computation
  let bestLag = -1;
  let bestCorrelation = -1;

  for (let lag = minLag; lag <= maxLag; lag++) {
    const r = computeCorrelation(lag);
    if (r > bestCorrelation) {
      bestCorrelation = r;
      bestLag = lag;
    }
  }

  if (bestCorrelation < confidenceThreshold || bestLag <= minLag || bestLag >= maxLag) {
    return null;
  }

  // 4. Parabolic Peak Interpolation for sub-sample accuracy
  const prevR = computeCorrelation(bestLag - 1);
  const nextR = computeCorrelation(bestLag + 1);

  const denom = 2 * (prevR - 2 * bestCorrelation + nextR);
  const delta = Math.abs(denom) > 1e-5 ? (prevR - nextR) / denom : 0;
  const refinedLag = bestLag + Math.max(-0.5, Math.min(0.5, delta));
  const f0 = sampleRate / refinedLag;

  // 5. Convert Frequency (Hz) to MIDI Pitch Number
  const midiExact = 69 + 12 * Math.log2(f0 / 440);
  const pitch = Math.round(midiExact);
  const cents = Math.round((midiExact - pitch) * 100);

  if (pitch < 21 || pitch > 108) return null; // Outside standard 88-key range

  return {
    frequency: Math.round(f0 * 10) / 10,
    pitch,
    noteName: getMidiNoteName(pitch),
    cents,
    confidence: Math.round(bestCorrelation * 100) / 100,
    rms: Math.round(rms * 1000) / 1000,
  };
}
