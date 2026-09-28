# Practice & Web MIDI Plan

This document outlines the architecture for the "Practice" features of PianoFlow, which differentiate it from standard transcription tools by providing interactive learning via Web MIDI.

## 1. Web MIDI API Integration

### Core Concept
The browser connects to the user's digital piano via a USB MIDI cable. When the user plays a key, the browser receives a MIDI message. PianoFlow compares the incoming MIDI message to the expected notes in the current project.

### Architecture (`apps/web/lib/midi`)
- `useWebMidi.ts`: A React hook to request MIDI access, list devices, and subscribe to input.
- `MidiEngine.ts`: A state machine that tracks "what note is expected next".
  - **Inputs:** Current project notes, time position, incoming MIDI events.
  - **Outputs:** Emits events (e.g. `note_hit`, `note_miss`, `chord_completed`).

## 2. Practice View UI (`apps/web/app/projects/[id]/practice`)

The Practice view is a focused, full-screen UI without editing controls.

### 2.1 "Wait Mode"
- The Synthesia-style falling notes pause automatically when they reach the "hit line".
- The playback only advances when the user plays the exact correct notes on their MIDI keyboard.
- **Logic:**
  1. Engine groups notes falling at the same timestamp into a `Chord`.
  2. UI pauses playback at `chord.timestamp`.
  3. User presses keys. If the keys match the `Chord` pitch array, UI resumes playback to the next `Chord`.

### 2.2 Scoring & Feedback
- When not in Wait Mode, playback continues continuously.
- **Real-time Evaluation:**
  - **Perfect:** ±50ms
  - **Good:** ±100ms
  - **Miss:** >100ms or wrong pitch.
- **Visuals:** Notes light up green (Perfect/Good) or red (Miss) when they hit the bottom line.
- **Metrics:** At the end of the song, show a "Completion Screen" with an overall percentage score.

## 3. Extending the PianoFlow Architecture

### Web-side Changes
- New UI primitive: `Keyboard.tsx` (an interactive on-screen piano showing pressed keys).
- Add "Practice" as a tab/button next to "Editor" in the project view.

### Antigravity Integration (Optional/Future)
To test Web MIDI loops automatically, we can create an Antigravity MCP Plugin or Skill that simulates a virtual MIDI device. This would allow an agent to "play" the song and verify the scoring logic without requiring a physical piano to be plugged into the CI/CD server.
