export interface ExpectedNote {
  pitch: number;
  start: number;
  end: number;
}

export interface ChordGroup {
  id: number;
  start: number;
  notes: ExpectedNote[];
  isPlayed: boolean;
}

export type ScoreLevel = 'Perfect' | 'Good' | 'Miss';

export interface ScoreEvent {
  note: ExpectedNote | null;
  score: ScoreLevel;
  timeDiff: number;
  playedPitch?: number;
}

export type ScoreCallback = (event: ScoreEvent) => void;

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
  private onScoreCallback?: ScoreCallback;

  constructor(notes: ExpectedNote[]) {
    this.expectedNotes = notes;
    this.chords = this.groupIntoChords(notes);
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
      // Find the next chord that hasn't been played yet
      const nextChord = this.chords.find((c) => !c.isPlayed);
      
      // If we've reached or passed the start time of an unplayed chord
      if (nextChord && currentTime >= nextChord.start) {
        // Check if all pitches of the chord are currently active
        const chordPitches = new Set(nextChord.notes.map((n) => n.pitch));
        
        let allHit = true;
        for (const p of chordPitches) {
          if (!activePitches.has(p)) {
            allHit = false;
            break;
          }
        }

        if (allHit) {
          // The chord is played correctly, we can advance
          nextChord.isPlayed = true;
          shouldPause = false;
        } else {
          // Waiting for the user to hit the right chord
          shouldPause = true;
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
    
    // Look for the closest unscored expected note with this pitch within a 500ms window
    const WINDOW = 500;

    for (const note of this.expectedNotes) {
      if (note.pitch === pitch && !this.scoredNotes.has(note)) {
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

      this.emitScore({
        note: closestNote,
        score,
        timeDiff: minTimeDiff,
        playedPitch: pitch,
      });
    } else {
      // Wrong pitch (no matching unscored note nearby)
      this.emitScore({
        note: null,
        score: 'Miss',
        timeDiff: 0,
        playedPitch: pitch,
      });
    }
  }

  /**
   * Checks for notes that were completely missed as the playhead passes them.
   */
  private checkMissedNotes(currentTime: number): void {
    for (const note of this.expectedNotes) {
      if (!this.scoredNotes.has(note)) {
        // If the playhead has passed the note's start time by more than 100ms, it's a miss
        if (currentTime > note.start + 100) {
          this.scoredNotes.add(note);
          this.emitScore({
            note,
            score: 'Miss',
            timeDiff: currentTime - note.start,
          });
        }
      }
    }
  }

  private emitScore(event: ScoreEvent): void {
    if (this.onScoreCallback) {
      this.onScoreCallback(event);
    }
  }
}
