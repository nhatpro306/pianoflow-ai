'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useWebMidi } from '@/lib/midi/useWebMidi';
import { useNotes } from '@/lib/hooks';
import { MidiEngine, ExpectedNote, ScoreEvent } from '@/lib/midi/MidiEngine';
import { Keyboard } from '@/components/ui/Keyboard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export default function PracticePage() {
  const params = useParams();
  const projectId = params.id as string;

  const { midiAccess, activeNotes, error: midiError } = useWebMidi();
  
  const notesQuery = useNotes(projectId, true);

  // Dummy expected notes for now (we would load this from the API)
  const dummyNotes = useMemo<ExpectedNote[]>(() => [
    { pitch: 60, start: 1000, end: 1500 }, // C4
    { pitch: 64, start: 2000, end: 2500 }, // E4
    { pitch: 67, start: 2000, end: 2500 }, // G4
    { pitch: 72, start: 3000, end: 3500 }, // C5
  ], []);

  const engine = useMemo(() => new MidiEngine(notesQuery.data?.notes || dummyNotes), [notesQuery.data?.notes, dummyNotes]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isWaitMode, setIsWaitMode] = useState(true);
  const [lastScore, setLastScore] = useState<ScoreEvent | null>(null);
  
  const expectedNotesSet = useMemo(() => {
    // Determine which notes are "expected" right now (within a 500ms window)
    const set = new Set<number>();
    const actualNotes = notesQuery.data?.notes || dummyNotes;
    for (const note of actualNotes) {
      if (Math.abs(note.start - currentTime) < 500) {
        set.add(note.pitch);
      }
    }
    return set;
  }, [currentTime, dummyNotes, notesQuery.data?.notes]);

  useEffect(() => {
    engine.onScore((event) => {
      setLastScore(event);
    });
  }, [engine]);

  // Game Loop
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const animate = useCallback((time: number) => {
    if (lastTimeRef.current !== null) {
      const deltaTime = time - lastTimeRef.current;
      
      setCurrentTime((prevTime) => {
        const nextTime = prevTime + deltaTime;
        const shouldPause = engine.processInput(activeNotes, nextTime, isWaitMode);
        
        if (shouldPause) {
          return prevTime; // Freeze time in wait mode
        }
        return nextTime;
      });
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [engine, activeNotes, isWaitMode]);

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      lastTimeRef.current = null;
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate]); // Depend on activeNotes to re-eval instantly

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Practice Mode</h1>
          <Badge variant={isWaitMode ? 'default' : 'warning'}>
            {isWaitMode ? 'Wait Mode (Paused)' : 'Continuous Mode'}
          </Badge>
          {midiError ? (
            <Badge variant="danger">MIDI Error: {midiError}</Badge>
          ) : midiAccess ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/20">MIDI Connected</Badge>
          ) : (
            <Badge variant="warning">Waiting for MIDI...</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsWaitMode(!isWaitMode)}>
            Toggle Wait Mode
          </Button>
          <Button onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? 'Pause' : 'Start Playing'}
          </Button>
        </div>
      </header>

      {/* Main Workspace (Falling Notes Canvas will go here) */}
      <main className="flex-1 relative flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 mb-2">Time: {(currentTime / 1000).toFixed(2)}s</p>
          <Card className="w-64 mx-auto p-4 bg-zinc-900 border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Last Score</h3>
            {lastScore ? (
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${
                  lastScore.score === 'Perfect' ? 'text-green-400' :
                  lastScore.score === 'Good' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {lastScore.score}
                </span>
                <span className="text-xs text-zinc-500">
                  {lastScore.timeDiff > 0 ? `${Math.round(lastScore.timeDiff)}ms` : ''}
                </span>
              </div>
            ) : (
              <span className="text-zinc-500">Waiting for input...</span>
            )}
          </Card>
        </div>
      </main>

      {/* Keyboard Footer */}
      <div className="border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <Keyboard activeNotes={activeNotes} expectedNotes={expectedNotesSet} />
        </div>
      </div>
    </div>
  );
}
