import { test, expect } from '@playwright/test';
import { AccompanimentEngine } from '../lib/audio/accompanimentEngine';
import type { ExpectedNote } from '../lib/midi/MidiEngine';

// Lightweight Web Audio mock for deterministic Node.js / headless testing
function createMockAudioContext() {
  const destination = {
    connect: () => {},
    disconnect: () => {},
  };

  const createGain = () => {
    const gainNode = {
      gain: {
        value: 1,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        cancelScheduledValues: () => {},
      },
      connect: () => {},
      disconnect: () => {},
    };
    return gainNode;
  };

  const createOscillator = () => {
    return {
      type: 'triangle',
      frequency: {
        setValueAtTime: () => {},
      },
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
    };
  };

  const createBiquadFilter = () => {
    return {
      type: 'lowpass',
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
      disconnect: () => {},
    };
  };

  return {
    state: 'running' as AudioContextState,
    currentTime: 10.0,
    destination: destination as unknown as AudioDestinationNode,
    createGain: createGain as unknown as () => GainNode,
    createOscillator: createOscillator as unknown as () => OscillatorNode,
    createBiquadFilter: createBiquadFilter as unknown as () => BiquadFilterNode,
    resume: async () => {},
    close: async () => {},
  } as unknown as AudioContext;
}

const sampleNotes: ExpectedNote[] = [
  { pitch: 48, start: 1000, end: 1500, hand: 'L', name: 'C3' }, // LH note
  { pitch: 60, start: 1000, end: 1500, hand: 'R', name: 'C4' }, // RH note
  { pitch: 52, start: 2000, end: 2500, hand: 'L', name: 'E3' }, // LH note
  { pitch: 64, start: 2000, end: 2500, hand: 'R', name: 'E4' }, // RH note
  { pitch: 55, start: 3000, end: 3500, hand: 'L', name: 'G3' }, // LH note
  { pitch: 67, start: 3000, end: 3500, hand: 'R', name: 'G4' }, // RH note
];

test.describe('AccompanimentEngine (accompanimentEngine.ts)', () => {
  test('initializes with default settings and clamps parameters', () => {
    const engine = new AccompanimentEngine();
    expect(engine.getVolume()).toBe(0.7);
    expect(engine.isEnabled()).toBe(true);
    expect(engine.getHandMode()).toBe('both');
    expect(engine.getSpeed()).toBe(1.0);

    engine.setVolume(1.5);
    expect(engine.getVolume()).toBe(1.0);

    engine.setVolume(-0.2);
    expect(engine.getVolume()).toBe(0.0);

    engine.setSpeed(0.05);
    expect(engine.getSpeed()).toBe(0.1);

    engine.setSpeed(5.0);
    expect(engine.getSpeed()).toBe(3.0);
  });

  test('correctly stores and chronologically sorts notes', () => {
    const engine = new AccompanimentEngine();
    const unsorted: ExpectedNote[] = [
      { pitch: 67, start: 3000, end: 3500, hand: 'R' },
      { pitch: 48, start: 1000, end: 1500, hand: 'L' },
      { pitch: 64, start: 2000, end: 2500, hand: 'R' },
    ];
    engine.setNotes(unsorted);
    const sorted = engine.getNotes();
    expect(sorted.length).toBe(3);
    expect(sorted[0].start).toBe(1000);
    expect(sorted[1].start).toBe(2000);
    expect(sorted[2].start).toBe(3000);
  });

  test('toggles enabled and hand isolation states', () => {
    const engine = new AccompanimentEngine();
    engine.setEnabled(false);
    expect(engine.isEnabled()).toBe(false);

    engine.setHandMode('right');
    expect(engine.getHandMode()).toBe('right');

    engine.setHandMode('left');
    expect(engine.getHandMode()).toBe('left');

    engine.setHandMode('both');
    expect(engine.getHandMode()).toBe('both');
  });

  test('tick triggers unpracticed hand notes in current window', () => {
    const mockCtx = createMockAudioContext();
    const engine = new AccompanimentEngine(mockCtx);
    engine.setNotes(sampleNotes);

    const playedNotes: ExpectedNote[] = [];
    // Spy on playNote
    engine.playNote = (n: ExpectedNote) => {
      playedNotes.push(n);
    };

    // Case 1: handMode === "right" -> accompaniment should play Left Hand (pitch 48)
    engine.setHandMode('right');
    engine.tick(1050, 950);
    expect(playedNotes.length).toBe(1);
    expect(playedNotes[0].pitch).toBe(48);
    expect(playedNotes[0].hand).toBe('L');

    // Case 2: handMode === "left" -> accompaniment should play Right Hand (pitch 64 at 2000ms)
    playedNotes.length = 0;
    engine.setHandMode('left');
    engine.tick(2050, 1950);
    expect(playedNotes.length).toBe(1);
    expect(playedNotes[0].pitch).toBe(64);
    expect(playedNotes[0].hand).toBe('R');

    // Case 3: handMode === "both" -> accompaniment should be silent
    playedNotes.length = 0;
    engine.setHandMode('both');
    engine.tick(3050, 2950);
    expect(playedNotes.length).toBe(0);

    // Case 4: enabled === false -> accompaniment should be silent
    playedNotes.length = 0;
    engine.setHandMode('right');
    engine.setEnabled(false);
    engine.tick(3050, 2950);
    expect(playedNotes.length).toBe(0);

    // Case 5: volume === 0 -> accompaniment should be silent
    playedNotes.length = 0;
    engine.setEnabled(true);
    engine.setVolume(0);
    engine.tick(3050, 2950);
    expect(playedNotes.length).toBe(0);
  });

  test('tick ignores backwards jumps or oversized deltas', () => {
    const mockCtx = createMockAudioContext();
    const engine = new AccompanimentEngine(mockCtx);
    engine.setNotes(sampleNotes);
    engine.setHandMode('right');

    const playedNotes: ExpectedNote[] = [];
    engine.playNote = (n: ExpectedNote) => {
      playedNotes.push(n);
    };

    // Time backwards jump
    engine.tick(900, 1000);
    expect(playedNotes.length).toBe(0);

    // Same timestamp
    engine.tick(1000, 1000);
    expect(playedNotes.length).toBe(0);

    // Huge jump (> 500ms without seek)
    engine.tick(2000, 1000);
    expect(playedNotes.length).toBe(0);
  });

  test('seek pauses active notes and updates lastPlayheadMs', () => {
    const mockCtx = createMockAudioContext();
    const engine = new AccompanimentEngine(mockCtx);
    engine.seek(2500);
    expect(engine.getLastPlayheadMs()).toBe(2500);
  });

  test('wait mode synchronization pauses and resumes in lockstep without skipping or repeating notes', () => {
    const mockCtx = createMockAudioContext();
    const engine = new AccompanimentEngine(mockCtx);
    engine.setNotes(sampleNotes);
    engine.setHandMode('right');

    const playedNotes: ExpectedNote[] = [];
    engine.playNote = (n: ExpectedNote) => {
      playedNotes.push(n);
    };

    // Frame 1: Playhead advances 900 -> 1050ms. Note at 1000ms triggers
    engine.tick(1050, 900);
    expect(playedNotes.length).toBe(1);
    expect(playedNotes[0].start).toBe(1000);

    // Frame 2: Wait mode engaged because user note at 1050ms is pending
    // Engine pauses; timeline does not advance (remains at 1050ms)
    engine.pause();

    // Repeated paused frames do not emit notes
    engine.tick(1050, 1050);
    expect(playedNotes.length).toBe(1);

    // Frame 3: User hits key! Timeline resumes and advances 1050ms -> 1200ms
    engine.tick(1200, 1050);
    // No new accompaniment notes in [1050, 1200)
    expect(playedNotes.length).toBe(1);

    // Frame 4: Timeline advances 1900ms -> 2050ms. Accompaniment note at 2000ms triggers
    engine.tick(2050, 1900);
    expect(playedNotes.length).toBe(2);
    expect(playedNotes[1].start).toBe(2000);
  });

  test('destroy cleanly shuts down and resets state', () => {
    const mockCtx = createMockAudioContext();
    const engine = new AccompanimentEngine(mockCtx);
    engine.setNotes(sampleNotes);
    engine.destroy();
    expect(engine.getNotes().length).toBe(0);
  });
});
