export type HandType = 'L' | 'R';

export interface ExpectedNote {
  pitch: number;
  start: number;
  end: number;
  hand?: HandType;
  name?: string;
  velocity?: number;
}

export type HandPracticeMode = 'both' | 'right' | 'left';

export interface ChordGroup {
  id: number;
  start: number;
  notes: ExpectedNote[];
  isPlayed: boolean;
}

import type { SignedTimingEvent } from '../practice/analyticsEngine';

export type ScoreLevel = 'Perfect' | 'Good' | 'Miss';

export interface ScoreEvent {
  note: ExpectedNote | null;
  score: ScoreLevel;
  timeDiff: number;
  playedPitch?: number;
  signedDeltaMs?: number;
}

export type ScoreCallback = (event: ScoreEvent) => void;

export interface PracticeStats {
  score: number;
  accuracy: number;
  perfectHits: number;
  goodHits: number;
  missHits: number;
  combo: number;
  maxCombo: number;
  avgLatencyMs: number;
  totalExpected: number;
  totalEvaluated: number;
}

export interface LoggedScoreEvent {
  timestamp: number;
  event: ScoreEvent;
}

/**
 * Web MIDI scoring engine for PianoFlow.
 * Handles note grouping, playhead tracking, wait mode, and scoring.
 */
export class MidiEngine {
  private expectedNotes: ExpectedNote[];
  private chords: ChordGroup[];
  private currentPlayheadTime: number = 0;
  private previousActivePitches: Set<number> = new Set();
  private scoredNotes: Set<ExpectedNote> = new Set();
  private scoreHistory: LoggedScoreEvent[] = [];
  private timingEvents: SignedTimingEvent[] = [];
  private onScoreCallback?: ScoreCallback;
  private handMode: HandPracticeMode = 'both';

  // Real scoring metrics
  private perfectHits: number = 0;
  private goodHits: number = 0;
  private missHits: number = 0;
  private currentCombo: number = 0;
  private maxCombo: number = 0;
  private totalLatencyMs: number = 0;
  private latencyHitsCount: number = 0;
  private currentScore: number = 0;

  constructor(notes: ExpectedNote[]) {
    this.expectedNotes = notes;
    this.chords = this.groupIntoChords(notes);
  }

  /**
   * Sets the active practice hand mode.
   */
  public setHandMode(mode: HandPracticeMode): void {
    this.handMode = mode;
  }

  /**
   * Gets the active practice hand mode.
   */
  public getHandMode(): HandPracticeMode {
    return this.handMode;
  }

  /**
   * Checks whether a note should be practiced/scored under current hand mode.
   */
  private isNoteActiveForHand(note: ExpectedNote): boolean {
    if (this.handMode === 'both') return true;
    const noteHand = note.hand ?? (note.pitch >= 60 ? 'R' : 'L');
    return (this.handMode === 'right' && noteHand === 'R') ||
           (this.handMode === 'left' && noteHand === 'L');
  }

  /**
   * Seeks the playhead to targetTimeMs, unscoring future notes and recalculating stats.
   */
  public seek(targetTimeMs: number): void {
    this.currentPlayheadTime = targetTimeMs;

    // 1. Remove logged events past targetTimeMs, or whose note starts at/after targetTimeMs
    this.scoreHistory = this.scoreHistory.filter((item) => {
      if (item.timestamp > targetTimeMs) return false;
      if (item.event.note && item.event.note.start >= targetTimeMs) return false;
      return true;
    });

    this.timingEvents = this.timingEvents.filter((item) => {
      if (item.actualHitMs > targetTimeMs) return false;
      if (item.expectedStartMs >= targetTimeMs) return false;
      return true;
    });

    // 2. Rebuild scoredNotes set from remaining history
    this.scoredNotes.clear();
    for (const item of this.scoreHistory) {
      if (item.event.note) {
        this.scoredNotes.add(item.event.note);
      }
    }

    // 3. Recalculate stats from remaining history
    this.perfectHits = 0;
    this.goodHits = 0;
    this.missHits = 0;
    this.currentCombo = 0;
    this.maxCombo = 0;
    this.totalLatencyMs = 0;
    this.latencyHitsCount = 0;
    this.currentScore = 0;

    for (const item of this.scoreHistory) {
      this.applyScore(item.event);
    }

    // 4. Re-enable unplayed status for all chords starting at or after targetTimeMs
    for (const chord of this.chords) {
      if (chord.start >= targetTimeMs) {
        chord.isPlayed = false;
      }
    }

    // 5. Reset input diff tracker
    this.previousActivePitches.clear();
  }

  /**
   * Sets the callback to emit scoring events.
   */
  public onScore(callback: ScoreCallback): void {
    this.onScoreCallback = callback;
  }

  /**
   * Groups expected notes into chords.
   * Notes starting within 50ms of each other belong to the same chord.
   */
  private groupIntoChords(notes: ExpectedNote[]): ChordGroup[] {
    // Sort notes by start time to ensure sequential grouping
    const sortedNotes = [...notes].sort((a, b) => a.start - b.start);
    const chords: ChordGroup[] = [];

    for (const note of sortedNotes) {
      if (chords.length === 0) {
        chords.push({
          id: 0,
          start: note.start,
          notes: [note],
          isPlayed: false,
        });
        continue;
      }

      const lastChord = chords[chords.length - 1];
      // If the note starts within 50ms of the chord's start time, add it to the chord
      if (Math.abs(note.start - lastChord.start) <= 50) {
        lastChord.notes.push(note);
      } else {
        chords.push({
          id: chords.length,
          start: note.start,
          notes: [note],
          isPlayed: false,
        });
      }
    }

    return chords;
  }

  /**
   * Gets the current playhead time tracked by the engine.
   */
  public getCurrentTime(): number {
    return this.currentPlayheadTime;
  }

  /**
   * Processes the current active pitches against the expected notes and playhead time.
   * 
   * @param activePitches The set of currently active MIDI pitches.
   * @param currentTime The current playhead time in milliseconds.
   * @param isWaitMode Whether the engine is in wait mode.
   * @returns A boolean indicating whether the playhead should PAUSE.
   */
  public processInput(
    activePitches: Set<number>,
    currentTime: number,
    isWaitMode: boolean
  ): boolean {
    this.currentPlayheadTime = currentTime;

    // 1. Detect newly pressed pitches and score them
    const newlyPressed = new Set<number>();
    for (const pitch of activePitches) {
      if (!this.previousActivePitches.has(pitch)) {
        newlyPressed.add(pitch);
      }
    }

    for (const pitch of newlyPressed) {
      this.scorePitch(pitch, currentTime);
    }

    // 2. Detect missed notes (playhead passed them by > 100ms without being hit)
    this.checkMissedNotes(currentTime);

    this.previousActivePitches = new Set(activePitches);

    // 3. Determine if we should pause (Wait Mode logic)
    let shouldPause = false;

    if (isWaitMode) {
      // Find unplayed chords that have arrived
      let chordToCheck = this.chords.find((c) => !c.isPlayed);
      while (chordToCheck && currentTime >= chordToCheck.start) {
        // Filter notes by the current practicing hand
        const activeHandNotes = chordToCheck.notes.filter((n) => this.isNoteActiveForHand(n));

        // If no notes in this chord are assigned to the practiced hand, auto-advance
        if (activeHandNotes.length === 0) {
          chordToCheck.isPlayed = true;
          chordToCheck = this.chords.find((c) => !c.isPlayed);
          continue;
        }

        // Check if all active hand pitches of the chord are currently active
        const chordPitches = new Set(activeHandNotes.map((n) => n.pitch));
        let allHit = true;
        for (const p of chordPitches) {
          if (!activePitches.has(p)) {
            allHit = false;
            break;
          }
        }

        if (allHit) {
          chordToCheck.isPlayed = true;
          chordToCheck = this.chords.find((c) => !c.isPlayed);
        } else {
          shouldPause = true;
          break;
        }
      }
    }

    return shouldPause;
  }

  /**
   * Scores an individual newly pressed pitch.
   */
  private scorePitch(pitch: number, currentTime: number): void {
    let closestNote: ExpectedNote | null = null;
    let minTimeDiff = Infinity;
    
    // Look for the closest unscored expected note with this pitch within a 500ms window (active hand only)
    const WINDOW = 500;

    for (const note of this.expectedNotes) {
      if (note.pitch === pitch && !this.scoredNotes.has(note) && this.isNoteActiveForHand(note)) {
        const diff = Math.abs(note.start - currentTime);
        if (diff < minTimeDiff && diff <= WINDOW) {
          minTimeDiff = diff;
          closestNote = note;
        }
      }
    }

    if (closestNote) {
      this.scoredNotes.add(closestNote);
      let score: ScoreLevel = 'Miss';
      
      if (minTimeDiff <= 50) {
        score = 'Perfect';
      } else if (minTimeDiff <= 100) {
        score = 'Good';
      } // > 100ms is a Miss

      const signedDelta = currentTime - closestNote.start;
      const noteHand: HandType = closestNote.hand ?? (closestNote.pitch >= 60 ? 'R' : 'L');

      this.timingEvents.push({
        notePitch: closestNote.pitch,
        expectedStartMs: closestNote.start,
        actualHitMs: currentTime,
        signedDeltaMs: signedDelta,
        hand: noteHand,
        score,
        pitch: closestNote.pitch,
        deltaMs: signedDelta,
        hitTime: currentTime,
        expectedTime: closestNote.start,
        judgment: score,
      });

      this.emitScore({
        note: closestNote,
        score,
        timeDiff: minTimeDiff,
        playedPitch: pitch,
        signedDeltaMs: signedDelta,
      }, currentTime);
    } else {
      // Do not penalize if pitch matches an unpracticed hand note nearby
      const isInactiveHandPitch = this.expectedNotes.some(
        (n) => n.pitch === pitch && !this.isNoteActiveForHand(n) && Math.abs(n.start - currentTime) <= WINDOW
      );

      if (!isInactiveHandPitch) {
        this.timingEvents.push({
          notePitch: pitch,
          expectedStartMs: currentTime,
          actualHitMs: currentTime,
          signedDeltaMs: 0,
          hand: pitch >= 60 ? 'R' : 'L',
          score: 'Miss',
          pitch,
          deltaMs: 0,
          hitTime: currentTime,
          expectedTime: currentTime,
          judgment: 'Miss',
        });

        this.emitScore({
          note: null,
          score: 'Miss',
          timeDiff: 0,
          playedPitch: pitch,
          signedDeltaMs: 0,
        }, currentTime);
      }
    }
  }

  /**
   * Checks for notes that were completely missed as the playhead passes them.
   */
  private checkMissedNotes(currentTime: number): void {
    for (const note of this.expectedNotes) {
      if (!this.isNoteActiveForHand(note)) {
        continue;
      }

      if (!this.scoredNotes.has(note)) {
        // If the playhead has passed the note's start time by more than 100ms, it's a miss
        if (currentTime > note.start + 100) {
          this.scoredNotes.add(note);
          const signedDelta = currentTime - note.start;
          const noteHand: HandType = note.hand ?? (note.pitch >= 60 ? 'R' : 'L');

          this.timingEvents.push({
            notePitch: note.pitch,
            expectedStartMs: note.start,
            actualHitMs: currentTime,
            signedDeltaMs: signedDelta,
            hand: noteHand,
            score: 'Miss',
            pitch: note.pitch,
            deltaMs: signedDelta,
            hitTime: currentTime,
            expectedTime: note.start,
            judgment: 'Miss',
          });

          this.emitScore({
            note,
            score: 'Miss',
            timeDiff: currentTime - note.start,
            signedDeltaMs: signedDelta,
          }, currentTime);
        }
      }
    }
  }

  private emitScore(event: ScoreEvent, timestamp: number): void {
    this.scoreHistory.push({ timestamp, event });
    this.applyScore(event);

    if (this.onScoreCallback) {
      this.onScoreCallback(event);
    }
  }

  private applyScore(event: ScoreEvent): void {
    if (event.score === 'Perfect') {
      this.perfectHits++;
      this.currentCombo++;
      this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
      this.totalLatencyMs += event.timeDiff;
      this.latencyHitsCount++;
      this.currentScore += 100 + Math.min(this.currentCombo * 2, 50);
    } else if (event.score === 'Good') {
      this.goodHits++;
      this.currentCombo++;
      this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
      this.totalLatencyMs += event.timeDiff;
      this.latencyHitsCount++;
      this.currentScore += 50 + Math.min(this.currentCombo, 25);
    } else if (event.score === 'Miss') {
      this.missHits++;
      this.currentCombo = 0;
    }
  }

  public getStats(): PracticeStats {
    const totalEvaluated = this.perfectHits + this.goodHits + this.missHits;
    const accuracy =
      totalEvaluated > 0
        ? Math.round(((this.perfectHits * 1.0 + this.goodHits * 0.6) / totalEvaluated) * 1000) / 10
        : 100;
    const avgLatencyMs =
      this.latencyHitsCount > 0 ? Math.round(this.totalLatencyMs / this.latencyHitsCount) : 0;
    const totalExpected = this.expectedNotes.filter((n) => this.isNoteActiveForHand(n)).length;

    return {
      score: this.currentScore,
      accuracy,
      perfectHits: this.perfectHits,
      goodHits: this.goodHits,
      missHits: this.missHits,
      combo: this.currentCombo,
      maxCombo: this.maxCombo,
      avgLatencyMs,
      totalExpected,
      totalEvaluated,
    };
  }

  public reset(): void {
    this.currentPlayheadTime = 0;
    this.previousActivePitches.clear();
    this.scoredNotes.clear();
    this.scoreHistory = [];
    this.timingEvents = [];
    this.perfectHits = 0;
    this.goodHits = 0;
    this.missHits = 0;
    this.currentCombo = 0;
    this.maxCombo = 0;
    this.totalLatencyMs = 0;
    this.latencyHitsCount = 0;
    this.currentScore = 0;
    this.chords.forEach((c) => {
      c.isPlayed = false;
    });
  }

  /**
   * Returns a copy of the recorded signed timing events.
   */
  public getTimingEvents(): SignedTimingEvent[] {
    return [...this.timingEvents];
  }

  /**
   * Clears recorded timing events.
   */
  public clearTimingEvents(): void {
    this.timingEvents = [];
  }

  /**
   * Returns a copy of the score event history.
   */
  public getScoreHistory(): LoggedScoreEvent[] {
    return [...this.scoreHistory];
  }
}
