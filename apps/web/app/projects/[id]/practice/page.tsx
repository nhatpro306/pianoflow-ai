"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWebMidi } from "@/lib/midi/useWebMidi";
import { useNotes, useProject, useCreatePracticeSession } from "@/lib/hooks";
import {
  MidiEngine,
  ExpectedNote,
  ScoreEvent,
  PracticeStats,
  HandPracticeMode,
} from "@/lib/midi/MidiEngine";
import { Keyboard } from "@/components/ui/Keyboard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { AcousticPianoFeedback } from "@/lib/audio/acousticFeedback";
import { PracticeCanvas } from "@/components/practice/PracticeCanvas";
import { TimelineScrubber } from "@/components/practice/TimelineScrubber";
import { useMicrophonePitch } from "@/lib/audio/useMicrophonePitch";
import {
  buildSessionAnalyticsReport,
  SessionAnalyticsReport,
  DrillRecommendation,
  MeasureMetric,
} from "@/lib/practice/analyticsEngine";
import { CoachingModal } from "@/components/practice/CoachingModal";
import { TrackSelector } from "@/components/TrackSelector";
import {
  extractTrackMetadata,
  filterNotesByTracks,
  getDefaultTrackSettings,
  type TrackFilterSettings,
  type TrackMetadata,
} from "@/lib/midi/trackFilter";
import { DifficultySelector } from "@/components/practice/DifficultySelector";
import {
  simplifyNoteData,
  type SimplificationDifficulty,
} from "@/lib/midi/simplifyEngine";
import { MetronomeControl } from "@/components/practice/MetronomeControl";
import type { TimeSignature } from "@/lib/audio/metronomeEngine";

export default function PracticePage() {
  const params = useParams();
  const projectId = params.id as string;

  // Fetch project details for song title & metadata
  const projectQuery = useProject(projectId);

  // Sound feedback engine
  const audioRef = useRef<AcousticPianoFeedback | null>(null);

  useEffect(() => {
    audioRef.current = new AcousticPianoFeedback();
    void audioRef.current.init();
    return () => {
      audioRef.current?.destroy();
      audioRef.current = null;
    };
  }, []);

  const playSoundOn = useCallback((pitch: number, velocity: number = 80) => {
    audioRef.current?.noteOn(pitch, velocity);
  }, []);

  const playSoundOff = useCallback((pitch: number) => {
    audioRef.current?.noteOff(pitch);
  }, []);

  // Input mode: MIDI hardware or acoustic microphone
  const [inputMode, setInputMode] = useState<"midi" | "mic">("midi");

  // Acoustic microphone pitch tracking
  const mic = useMicrophonePitch({
    enabled: inputMode === "mic",
    onNoteOn: (note, vel) => playSoundOn(note, vel),
    onNoteOff: (note) => playSoundOff(note),
  });

  // Web MIDI access with acoustic sound feedback
  const { midiAccess, activeNotes, error: midiError } = useWebMidi({
    onNoteOn: (note, velocity) => {
      if (inputMode === "midi") {
        playSoundOn(note, velocity);
      }
    },
    onNoteOff: (note) => {
      if (inputMode === "midi") {
        playSoundOff(note);
      }
    },
  });

  // Screen virtual key presses (for mouse/touch players)
  const [virtualActiveNotes, setVirtualActiveNotes] = useState<Set<number>>(new Set());

  const combinedActiveNotes = useMemo(() => {
    const source = inputMode === "mic" ? mic.activeNotes : activeNotes;
    if (virtualActiveNotes.size === 0) return source;
    const merged = new Set(source);
    for (const p of virtualActiveNotes) {
      merged.add(p);
    }
    return merged;
  }, [inputMode, mic.activeNotes, activeNotes, virtualActiveNotes]);

  const handleVirtualNoteOn = useCallback(
    (pitch: number) => {
      playSoundOn(pitch, 90);
      setVirtualActiveNotes((prev) => new Set(prev).add(pitch));
    },
    [playSoundOn]
  );

  const handleVirtualNoteOff = useCallback(
    (pitch: number) => {
      playSoundOff(pitch);
      setVirtualActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(pitch);
        return next;
      });
    },
    [playSoundOff]
  );

  const notesQuery = useNotes(projectId, true);
  const createSession = useCreatePracticeSession();

  const [showXPDialog, setShowXPDialog] = useState(false);
  const [showCoachingModal, setShowCoachingModal] = useState(false);
  const [coachingReport, setCoachingReport] = useState<SessionAnalyticsReport | null>(null);
  const [xpData, setXpData] = useState<{
    xp_gained: number;
    level_up: boolean;
    current_level?: number;
    total_xp?: number;
    current_streak?: number;
  } | null>(null);

  const [trackSettings, setTrackSettings] = useState<TrackFilterSettings | null>(null);
  const [showTrackSelector, setShowTrackSelector] = useState(false);

  const tracks = useMemo<TrackMetadata[]>(() => {
    if (!notesQuery.data) return [];
    return extractTrackMetadata(notesQuery.data);
  }, [notesQuery.data]);

  const activeSettings = useMemo<TrackFilterSettings>(() => {
    if (trackSettings) return trackSettings;
    return getDefaultTrackSettings(tracks);
  }, [trackSettings, tracks]);

  const filteredNotesData = useMemo(() => {
    if (!notesQuery.data) return undefined;
    return filterNotesByTracks(notesQuery.data, activeSettings);
  }, [notesQuery.data, activeSettings]);

  const isFilterActive = useMemo(() => {
    if (!trackSettings) return false;
    if (trackSettings.soloTrackIndex !== null) return true;
    if (trackSettings.mutedTrackIndices.length > 0) return true;
    if (trackSettings.selectedTrackIndices.length < tracks.length) return true;
    return false;
  }, [trackSettings, tracks.length]);

  // Fallback demo notes if project notes are not yet parsed
  const dummyNotes = useMemo<ExpectedNote[]>(
    () => [
      { pitch: 60, start: 1000, end: 1500, hand: "R", name: "C4", velocity: 80 },
      { pitch: 48, start: 1000, end: 2000, hand: "L", name: "C3", velocity: 70 },
      { pitch: 64, start: 2000, end: 2500, hand: "R", name: "E4", velocity: 80 },
      { pitch: 67, start: 2000, end: 2500, hand: "R", name: "G4", velocity: 80 },
      { pitch: 52, start: 2000, end: 3000, hand: "L", name: "E3", velocity: 70 },
      { pitch: 72, start: 3000, end: 3500, hand: "R", name: "C5", velocity: 85 },
      { pitch: 55, start: 3000, end: 4000, hand: "L", name: "G3", velocity: 70 },
      { pitch: 71, start: 4000, end: 4500, hand: "R", name: "B4", velocity: 80 },
      { pitch: 48, start: 4000, end: 5000, hand: "L", name: "C3", velocity: 70 },
      { pitch: 69, start: 5000, end: 5500, hand: "R", name: "A4", velocity: 80 },
      { pitch: 67, start: 6000, end: 6500, hand: "R", name: "G4", velocity: 80 },
      { pitch: 55, start: 6000, end: 7000, hand: "L", name: "G3", velocity: 70 },
      { pitch: 65, start: 7000, end: 7500, hand: "R", name: "F4", velocity: 80 },
      { pitch: 64, start: 8000, end: 8500, hand: "R", name: "E4", velocity: 80 },
      { pitch: 52, start: 8000, end: 9000, hand: "L", name: "E3", velocity: 70 },
      { pitch: 62, start: 9000, end: 9500, hand: "R", name: "D4", velocity: 80 },
      { pitch: 60, start: 10000, end: 11000, hand: "R", name: "C4", velocity: 85 },
      { pitch: 48, start: 10000, end: 11000, hand: "L", name: "C3", velocity: 75 },
    ],
    [],
  );

  // Difficulty state & dynamic client simplification (Phase J)
  const [difficulty, setDifficulty] = useState<SimplificationDifficulty>("original");

  const activeNotesData = useMemo(() => {
    const baseNotes = filteredNotesData ?? notesQuery.data;
    if (!baseNotes) return undefined;
    return simplifyNoteData(baseNotes, difficulty);
  }, [filteredNotesData, notesQuery.data, difficulty]);

  const simplificationStats = useMemo(() => {
    return activeNotesData?.stats;
  }, [activeNotesData]);

  // Map NoteData to ExpectedNote
  const expectedNotesList = useMemo<ExpectedNote[]>(() => {
    const dataSource = activeNotesData ?? filteredNotesData ?? notesQuery.data;
    if (dataSource?.notes && dataSource.notes.length > 0) {
      return dataSource.notes.map((n) => ({
        pitch: n.pitch,
        start: Math.round(n.start * 1000),
        end: Math.round(n.end * 1000),
        hand: n.hand,
        name: n.name,
        velocity: n.velocity,
      }));
    }
    return dummyNotes;
  }, [activeNotesData, filteredNotesData, notesQuery.data, dummyNotes]);

  // Compute total duration in milliseconds
  const totalDurationMs = useMemo(() => {
    const durSec = activeNotesData?.duration_sec ?? notesQuery.data?.duration_sec;
    if (durSec) {
      return Math.round(durSec * 1000);
    }
    if (expectedNotesList.length > 0) {
      return Math.max(...expectedNotesList.map((n) => n.end)) + 1500;
    }
    return 12000;
  }, [activeNotesData?.duration_sec, notesQuery.data?.duration_sec, expectedNotesList]);

  const bpm = notesQuery.data?.bpm || projectQuery.data?.analysis_summary?.bpm || 120;
  const timeSignature =
    notesQuery.data?.time_signature ||
    projectQuery.data?.analysis_summary?.time_signature ||
    "4/4";

  // Practice Engine Instance
  const engine = useMemo(() => new MidiEngine(expectedNotesList), [expectedNotesList]);

  const [isPlaying, setIsPlaying] = useState(false);
  const currentTimeRef = useRef<number>(0);
  const [isWaitMode, setIsWaitMode] = useState(true);
  const [lastScore, setLastScore] = useState<ScoreEvent | null>(null);

  // Practice Mode Overhaul States: Speed, A-B Looping, Hands, Auto-Ramp
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [loopStartMs, setLoopStartMs] = useState<number | null>(null);
  const [loopEndMs, setLoopEndMs] = useState<number | null>(null);
  const [isLoopActive, setIsLoopActive] = useState<boolean>(false);
  const [handMode, setHandMode] = useState<HandPracticeMode>("both");
  const [isAutoRamp, setIsAutoRamp] = useState<boolean>(false);
  const [rampToast, setRampToast] = useState<string | null>(null);

  // Camera Viewport & Centroid Auto-Tracking States
  const [cameraX, setCameraX] = useState<number>(0);
  const [autoTrack, setAutoTrack] = useState<boolean>(true);

  // Real live metrics from MidiEngine
  const [stats, setStats] = useState<PracticeStats>({
    score: 0,
    accuracy: 100,
    perfectHits: 0,
    goodHits: 0,
    missHits: 0,
    combo: 0,
    maxCombo: 0,
    avgLatencyMs: 0,
    totalExpected: expectedNotesList.length,
    totalEvaluated: 0,
  });

  const [expectedNotesSet, setExpectedNotesSet] = useState<Set<number>>(new Set());

  const updateExpectedNotes = useCallback(() => {
    const curTime = currentTimeRef.current;
    const set = new Set<number>();
    for (const note of expectedNotesList) {
      if (Math.abs(note.start - curTime) <= 500) {
        set.add(note.pitch);
      }
    }
    if (set.size === 0) {
      const upcoming = expectedNotesList.filter((n) => n.start >= curTime);
      if (upcoming.length > 0) {
        const nextStart = upcoming[0].start;
        for (const note of upcoming) {
          if (Math.abs(note.start - nextStart) <= 50) {
            set.add(note.pitch);
          }
        }
      }
    }
    setExpectedNotesSet(set);
  }, [expectedNotesList]);

  useEffect(() => {
    updateExpectedNotes();
  }, [updateExpectedNotes]);

  useEffect(() => {
    engine.onScore((event) => {
      setLastScore(event);
      setStats(engine.getStats());
      updateExpectedNotes();
    });
  }, [engine, updateExpectedNotes]);

  // Sync handMode changes into engine
  useEffect(() => {
    engine.setHandMode(handMode);
    setStats(engine.getStats());
    updateExpectedNotes();
  }, [engine, handMode, updateExpectedNotes]);

  // Trigger note scoring immediately on input even if paused / in wait mode
  useEffect(() => {
    if (combinedActiveNotes.size > 0) {
      engine.processInput(combinedActiveNotes, currentTimeRef.current, isWaitMode);
    }
  }, [combinedActiveNotes, engine, isWaitMode]);

  // A-B Looping Handlers
  const handleSetA = useCallback(() => {
    const cur = Math.round(currentTimeRef.current);
    setLoopStartMs(cur);
    if (loopEndMs !== null && cur >= loopEndMs) {
      setLoopEndMs(null);
      setIsLoopActive(false);
    }
  }, [loopEndMs]);

  const handleSetB = useCallback(() => {
    const cur = Math.round(currentTimeRef.current);
    const start = loopStartMs ?? 0;
    const finalB = Math.max(start + 500, cur);
    setLoopEndMs(finalB);
    setIsLoopActive(true);
  }, [loopStartMs]);

  const handleToggleLoop = useCallback(() => {
    if (loopStartMs !== null && loopEndMs !== null) {
      setIsLoopActive((prev) => !prev);
    }
  }, [loopStartMs, loopEndMs]);

  const handleClearLoop = useCallback(() => {
    setLoopStartMs(null);
    setLoopEndMs(null);
    setIsLoopActive(false);
  }, []);

  // Auto Tempo Ramping Trigger on Loop Cycle Completion
  const handleLoopCycleCompleted = useCallback(() => {
    if (!isAutoRamp) return;
    const currentStats = engine.getStats();
    if (currentStats.totalEvaluated > 0 && currentStats.accuracy >= 90) {
      setSpeedMultiplier((prev) => {
        const next = Math.min(1.5, Math.round((prev + 0.1) * 10) / 10);
        if (next > prev) {
          setRampToast(
            `🚀 Speed Boost! ${prev.toFixed(1)}x → ${next.toFixed(1)}x (${currentStats.accuracy}% Accuracy)`
          );
          setTimeout(() => setRampToast(null), 3000);
        }
        return next;
      });
    }
  }, [engine, isAutoRamp]);

  // Mutable refs for Game Loop to avoid stale closures
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const combinedActiveNotesRef = useRef(combinedActiveNotes);
  combinedActiveNotesRef.current = combinedActiveNotes;
  const isWaitModeRef = useRef(isWaitMode);
  isWaitModeRef.current = isWaitMode;

  const speedMultiplierRef = useRef(speedMultiplier);
  speedMultiplierRef.current = speedMultiplier;
  const loopStartMsRef = useRef(loopStartMs);
  loopStartMsRef.current = loopStartMs;
  const loopEndMsRef = useRef(loopEndMs);
  loopEndMsRef.current = loopEndMs;
  const isLoopActiveRef = useRef(isLoopActive);
  isLoopActiveRef.current = isLoopActive;
  const handModeRef = useRef(handMode);
  handModeRef.current = handMode;
  const expectedNotesListRef = useRef(expectedNotesList);
  expectedNotesListRef.current = expectedNotesList;
  const totalDurationMsRef = useRef(totalDurationMs);
  totalDurationMsRef.current = totalDurationMs;

  const animate = useCallback(
    (time: number) => {
      if (lastTimeRef.current !== null) {
        const deltaTime = time - lastTimeRef.current;
        const clampedDelta = Math.min(deltaTime, 100);
        const speedAdjustedDelta = clampedDelta * speedMultiplierRef.current;
        const prevTime = currentTimeRef.current;
        let candidateTime = prevTime + speedAdjustedDelta;

        // Check A-B loop wrap boundary
        if (
          isLoopActiveRef.current &&
          loopStartMsRef.current !== null &&
          loopEndMsRef.current !== null
        ) {
          if (candidateTime >= loopEndMsRef.current) {
            candidateTime = loopStartMsRef.current;
            currentTimeRef.current = candidateTime;
            engine.seek(candidateTime);
            handleLoopCycleCompleted();
          }
        } else if (candidateTime >= totalDurationMsRef.current) {
          setIsPlaying(false);
          return;
        }

        const shouldPause = engine.processInput(
          combinedActiveNotesRef.current,
          candidateTime,
          isWaitModeRef.current
        );

        if (!shouldPause) {
          // Single hand practice auto-accompaniment playback
          if (handModeRef.current !== "both") {
            for (const note of expectedNotesListRef.current) {
              const isRH = note.hand ? note.hand === "R" : note.pitch >= 60;
              const isInactiveHand =
                (handModeRef.current === "right" && !isRH) ||
                (handModeRef.current === "left" && isRH);

              if (isInactiveHand) {
                if (note.start >= prevTime && note.start < candidateTime) {
                  audioRef.current?.noteOn(note.pitch, note.velocity ?? 75);
                  const noteDuration = Math.max(100, note.end - note.start);
                  setTimeout(() => {
                    audioRef.current?.noteOff(note.pitch);
                  }, noteDuration / Math.max(0.2, speedMultiplierRef.current));
                }
              }
            }
          }

          currentTimeRef.current = candidateTime;
        }
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    },
    [engine, handleLoopCycleCompleted]
  );

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = null;
      requestRef.current = requestAnimationFrame(animate);
    } else {
      lastTimeRef.current = null;
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate]);

  const handleFinish = async () => {
    setIsPlaying(false);
    const finalStats = engine.getStats();
    const events = engine.getTimingEvents();

    const report = buildSessionAnalyticsReport({
      events,
      expectedNotes: expectedNotesList,
      bpm,
      timeSignature,
      totalDurationMs,
    });
    setCoachingReport(report);

    try {
      const res = await createSession.mutateAsync({
        project_id: projectId,
        score: finalStats.score,
        accuracy_percent: finalStats.accuracy,
        duration_seconds: Math.floor(currentTimeRef.current / 1000),
        difficulty,
      });
      setXpData(res);
    } catch (e) {
      console.error("Failed to record practice session", e);
    }

    setShowCoachingModal(true);
  };

  const handleApplyDrill = useCallback(
    (drill: DrillRecommendation) => {
      setShowCoachingModal(false);
      const startMs = drill.loopStartMs ?? drill.startMs ?? 0;
      const endMs = drill.loopEndMs ?? drill.endMs ?? startMs + 2000;
      const speed = drill.recommendedSpeed ?? drill.suggestedSpeed ?? 0.75;

      setLoopStartMs(startMs);
      setLoopEndMs(endMs);
      setIsLoopActive(true);
      setSpeedMultiplier(speed);

      if (drill.prescribedHand && drill.prescribedHand !== "both") {
        setHandMode(drill.prescribedHand);
      }

      currentTimeRef.current = startMs;
      engine.seek(startMs);
      updateExpectedNotes();
      setStats(engine.getStats());

      setRampToast(
        `🎯 Drill Activated: Bars ${drill.startMeasure}–${drill.endMeasure} (${speed}x speed)`
      );
      setTimeout(() => setRampToast(null), 3500);
    },
    [engine, updateExpectedNotes]
  );

  const handleSelectMeasure = useCallback(
    (measure: MeasureMetric) => {
      currentTimeRef.current = measure.startMs;
      engine.seek(measure.startMs);
      updateExpectedNotes();
      setStats(engine.getStats());
    },
    [engine, updateExpectedNotes]
  );

  const handleRestart = () => {
    setIsPlaying(false);
    engine.reset();
    currentTimeRef.current = 0;
    setLastScore(null);
    setStats(engine.getStats());
    updateExpectedNotes();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-zinc-950 text-white overflow-hidden relative">
      {/* Auto Ramp Speed Boost Toast Notification */}
      {rampToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-yellow-300 flex items-center gap-2">
            {rampToast}
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/70 backdrop-blur-md gap-3 z-30">
        {/* Navigation & Song Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition px-2.5 py-1 rounded-md bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700/80"
          >
            <span>←</span> Projects
          </Link>
          <Link
            href={`/projects/${projectId}/sheet`}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition px-2.5 py-1 rounded-md bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700/80"
          >
            <span>🎼</span> Sheet Music
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-xs">
                <span>🎹</span> {projectQuery.data?.name || "Practice Session"}
              </h1>
              <Badge variant={isWaitMode ? "default" : "warning"} className="text-[10px] py-0">
                {isWaitMode ? "Wait Mode" : "Continuous"}
              </Badge>
            </div>
            <div className="text-[11px] text-zinc-400 flex items-center gap-2">
              <span>{bpm} BPM</span>
              <span>•</span>
              <span>{timeSignature}</span>
              <span>•</span>
              {inputMode === "mic" ? (
                mic.error ? (
                  <span className="text-rose-400 font-medium">Mic Error: {mic.error}</span>
                ) : mic.isListening ? (
                  <span className="text-cyan-400 font-medium">
                    Acoustic Mic Active {mic.currentResult ? `(${mic.currentResult.noteName})` : ""}
                  </span>
                ) : (
                  <span className="text-zinc-500">Mic Idle</span>
                )
              ) : midiError ? (
                <span className="text-rose-400 font-medium">MIDI Error</span>
              ) : midiAccess ? (
                <span className="text-emerald-400 font-medium">MIDI Hardware Connected</span>
              ) : (
                <span className="text-zinc-500">Virtual Touch/Keys Active</span>
              )}
            </div>
          </div>
        </div>

        {/* Live Score & Metrics Badges */}
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/60">
            <span className="text-zinc-400">Score:</span>
            <span className="font-bold text-cyan-400">{stats.score.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/60">
            <span className="text-zinc-400">Accuracy:</span>
            <span
              className={`font-bold ${
                stats.accuracy >= 90
                  ? "text-emerald-400"
                  : stats.accuracy >= 70
                    ? "text-yellow-400"
                    : "text-rose-400"
              }`}
            >
              {stats.accuracy}%
            </span>
          </div>

          {lastScore ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/60">
              <span className="text-zinc-400">Last Score:</span>
              <span
                className={`font-bold ${
                  lastScore.score === "Perfect"
                    ? "text-emerald-400"
                    : lastScore.score === "Good"
                      ? "text-yellow-400"
                      : "text-rose-400"
                }`}
              >
                {lastScore.score}
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/40 border border-zinc-800 text-zinc-500 text-xs">
              Last Score: Waiting...
            </div>
          )}

          {stats.combo > 1 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 font-bold animate-pulse">
              <span>🔥</span> {stats.combo} Combo
            </div>
          )}

          <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-400">
            <span className="text-emerald-400">P:{stats.perfectHits}</span>
            <span className="text-yellow-400">G:{stats.goodHits}</span>
            <span className="text-rose-400">M:{stats.missHits}</span>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-2">
          {/* Input Mode Selector: MIDI Hardware vs Acoustic Microphone */}
          <div className="flex items-center rounded-lg bg-zinc-800/80 p-0.5 border border-zinc-700/60">
            <button
              type="button"
              onClick={() => setInputMode("midi")}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                inputMode === "midi"
                  ? "bg-cyan-500 text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              🎹 MIDI
            </button>
            <button
              type="button"
              onClick={() => setInputMode("mic")}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                inputMode === "mic"
                  ? "bg-cyan-500 text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              🎙️ Mic
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsWaitMode((prev) => !prev);
              updateExpectedNotes();
            }}
          >
            {isWaitMode ? "Continuous" : "Wait Mode"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleRestart}>
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setIsPlaying((prev) => {
                const next = !prev;
                if (next) updateExpectedNotes();
                return next;
              });
            }}
            className={
              isPlaying
                ? "bg-amber-600 hover:bg-amber-500 font-bold"
                : "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            }
          >
            {isPlaying ? "Pause" : "Start"}
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleFinish}
            disabled={createSession.isPending}
          >
            Finish
          </Button>
        </div>
      </header>

      {/* Secondary Controls Bar: Difficulty Selector, Speed Multiplier, Hand Mode, Auto Ramp */}
      <section className="flex flex-wrap items-center justify-between px-4 py-1.5 bg-zinc-900/40 border-b border-zinc-800/60 text-xs gap-2 z-20">
        {/* Difficulty Selector (Phase J) */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-medium">Difficulty:</span>
          <DifficultySelector
            value={difficulty}
            onChange={(newDiff) => {
              setDifficulty(newDiff);
              updateExpectedNotes();
            }}
            stats={simplificationStats}
            compact
          />
        </div>

        {/* Speed Selector Presets */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-medium">Speed:</span>
          <div className="flex items-center rounded-md bg-zinc-800/80 p-0.5 border border-zinc-700/60">
            {[0.5, 0.75, 1.0, 1.25, 1.5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSpeedMultiplier(spd)}
                className={`px-2 py-0.5 text-xs font-semibold rounded transition ${
                  speedMultiplier === spd
                    ? "bg-cyan-500 text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Auto Tempo Ramping Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoRamp((prev) => !prev)}
            title="Automatically increase speed (+0.1x) when completing a loop cycle with ≥90% accuracy"
            className={`px-2 py-0.5 text-xs font-semibold rounded border transition flex items-center gap-1 ${
              isAutoRamp
                ? "bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                : "bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:text-zinc-200"
            }`}
          >
            <span>⚡</span>
            <span>Auto Ramp</span>
          </button>
        </div>

        {/* Hands Isolation Selector */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-medium">Hands Practice:</span>
          <div className="flex items-center rounded-md bg-zinc-800/80 p-0.5 border border-zinc-700/60">
            {(
              [
                { id: "both", label: "Both Hands" },
                { id: "right", label: "Right Hand (RH)" },
                { id: "left", label: "Left Hand (LH)" },
              ] as const
            ).map((hand) => (
              <button
                key={hand.id}
                type="button"
                onClick={() => setHandMode(hand.id)}
                className={`px-2.5 py-0.5 text-xs font-semibold rounded transition ${
                  handMode === hand.id
                    ? hand.id === "right"
                      ? "bg-purple-600 text-white font-bold shadow-sm"
                      : hand.id === "left"
                        ? "bg-cyan-600 text-white font-bold shadow-sm"
                        : "bg-zinc-200 text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {hand.label}
              </button>
            ))}
          </div>
        </div>

        {/* Multi-Track Filter Button */}
        {tracks.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowTrackSelector(true)}
              className={`px-2.5 py-1 text-xs font-semibold rounded border transition flex items-center gap-1.5 ${
                isFilterActive
                  ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                  : "bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:text-white hover:bg-zinc-700"
              }`}
            >
              <span>🎛️</span>
              <span>Tracks</span>
              {isFilterActive && (
                <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.2 text-[10px] text-cyan-300">
                  {filteredNotesData?.notes.length ?? 0}/{notesQuery.data?.notes.length ?? 0}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Metronome & Rhythm Control (Phase K) */}
        <div className="flex items-center gap-1.5">
          <MetronomeControl
            initialBpm={bpm}
            initialTimeSignature={
              ["4/4", "3/4", "3/8", "6/8", "2/4"].includes(timeSignature)
                ? (timeSignature as TimeSignature)
                : "4/4"
            }
          />
        </div>
      </section>

      {/* Interactive Timeline Scrubber */}
      <TimelineScrubber
        currentTimeRef={currentTimeRef}
        totalDurationMs={totalDurationMs}
        bpm={bpm}
        timeSignature={timeSignature}
        loopStartMs={loopStartMs}
        loopEndMs={loopEndMs}
        isLoopActive={isLoopActive}
        onSeek={(targetTime) => {
          currentTimeRef.current = targetTime;
          engine.seek(targetTime);
          updateExpectedNotes();
          setStats(engine.getStats());
        }}
        onSetA={handleSetA}
        onSetB={handleSetB}
        onToggleLoop={handleToggleLoop}
        onClearLoop={handleClearLoop}
        notes={expectedNotesList}
      />

      {/* Main Falling Notes Canvas Area */}
      <main className="flex-1 relative w-full h-full min-h-0 bg-zinc-950 flex flex-col justify-end">
        <PracticeCanvas
          notes={expectedNotesList}
          currentTimeRef={currentTimeRef}
          isPlaying={isPlaying}
          activeNotes={combinedActiveNotes}
          expectedNotes={expectedNotesSet}
          lastScore={lastScore}
          handMode={handMode}
          loopStartMs={loopStartMs}
          loopEndMs={loopEndMs}
          isLoopActive={isLoopActive}
          cameraX={cameraX}
          onCameraChange={(newCamX) => {
            setCameraX(newCamX);
          }}
          autoTrack={autoTrack}
          className="flex-1 w-full"
        />
      </main>

      {/* Keyboard Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-2 sm:px-6 py-2 shadow-2xl z-20">
        <div className="max-w-7xl mx-auto">
          <Keyboard
            activeNotes={combinedActiveNotes}
            expectedNotes={expectedNotesSet}
            onNoteOn={handleVirtualNoteOn}
            onNoteOff={handleVirtualNoteOff}
            cameraOffset={cameraX}
            onCameraOffsetChange={(newOffset) => {
              setCameraX(newOffset);
            }}
            autoTrack={autoTrack}
            onToggleAutoTrack={() => setAutoTrack((prev) => !prev)}
          />
        </div>
      </footer>

      {/* Practice Complete Dialog */}
      <Dialog
        open={showXPDialog}
        onClose={() => setShowXPDialog(false)}
        title="Practice Session Complete!"
      >
        <div className="py-4 text-center space-y-4">
          <div className="text-4xl font-extrabold text-cyan-400">
            +{xpData?.xp_gained ?? 0} XP
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm max-w-xs mx-auto">
            <div className="bg-zinc-800/80 p-2.5 rounded-lg border border-zinc-700">
              <div className="text-zinc-400 text-xs">Score</div>
              <div className="text-lg font-bold text-white">{stats.score.toLocaleString()}</div>
            </div>
            <div className="bg-zinc-800/80 p-2.5 rounded-lg border border-zinc-700">
              <div className="text-zinc-400 text-xs">Accuracy</div>
              <div className="text-lg font-bold text-emerald-400">{stats.accuracy}%</div>
            </div>
            <div className="bg-zinc-800/80 p-2.5 rounded-lg border border-zinc-700">
              <div className="text-zinc-400 text-xs">Max Combo</div>
              <div className="text-lg font-bold text-amber-400">{stats.maxCombo}</div>
            </div>
            <div className="bg-zinc-800/80 p-2.5 rounded-lg border border-zinc-700">
              <div className="text-zinc-400 text-xs">Current Streak</div>
              <div className="text-lg font-bold text-cyan-400">{xpData?.current_streak ?? 1} days</div>
            </div>
          </div>
          {xpData?.level_up && (
            <div className="p-3 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-yellow-500/40 rounded-xl">
              <p className="text-lg text-yellow-300 font-bold">
                🎉 Level Up! You are now Level {xpData.current_level}!
              </p>
            </div>
          )}
        </div>
        <DialogActions>
          <Button variant="primary" onClick={() => setShowXPDialog(false)}>
            Keep Practicing!
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Coaching & Session Analytics Modal */}
      <CoachingModal
        open={showCoachingModal}
        onClose={() => setShowCoachingModal(false)}
        report={coachingReport}
        xpGained={xpData?.xp_gained ?? 0}
        currentStreak={xpData?.current_streak ?? 1}
        levelUp={xpData?.level_up ?? false}
        currentLevel={xpData?.current_level}
        onApplyDrill={handleApplyDrill}
        onSelectMeasure={handleSelectMeasure}
      />

      {/* Multi-Track Filter Dialog */}
      {tracks.length > 0 && (
        <TrackSelector
          open={showTrackSelector}
          onClose={() => setShowTrackSelector(false)}
          tracks={tracks}
          settings={activeSettings}
          onApplySettings={(newSettings) => setTrackSettings(newSettings)}
          totalNotesCount={notesQuery.data?.notes.length}
        />
      )}
    </div>
  );
}
