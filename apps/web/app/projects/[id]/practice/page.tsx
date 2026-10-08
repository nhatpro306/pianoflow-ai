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
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/ui/SegmentedControl";
import { AcousticPianoFeedback } from "@/lib/audio/acousticFeedback";
import { AccompanimentEngine } from "@/lib/audio/accompanimentEngine";
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
import {
  classifyMicroTiming,
  createMicroTimingTracker,
  type LiveMicroTimingFeedback,
  type MicroTimingSessionStats,
} from "@/lib/practice/microTiming";
import { MicroTimingGauge } from "@/components/practice/MicroTimingGauge";

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
  const { midiAccess, inputs, activeNotes } = useWebMidi({
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

  const midiDeviceName = useMemo(() => {
    if (inputs && inputs.length > 0 && inputs[0].name) {
      return inputs[0].name;
    }
    return "Yamaha P-125";
  }, [inputs]);

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

  // Virtual SoundFont Accompaniment States (Milestone N.2)
  const accompanimentRef = useRef<AccompanimentEngine | null>(null);
  const [accompanimentEnabled, setAccompanimentEnabled] = useState<boolean>(true);
  const [accompanimentVolume, setAccompanimentVolume] = useState<number>(0.7);

  // Camera Viewport & Centroid Auto-Tracking States
  const [cameraX, setCameraX] = useState<number>(0);
  const [autoTrack, setAutoTrack] = useState<boolean>(true);

  // Live Micro-Timing Strike Feedback & Session Stats (Milestone N.1)
  const [activeTimingFeedback, setActiveTimingFeedback] = useState<LiveMicroTimingFeedback | null>(null);
  const [timingStats, setTimingStats] = useState<MicroTimingSessionStats | null>(null);
  const microTimingTrackerRef = useRef(createMicroTimingTracker());

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

  const expectedNotesHandMap = useMemo(() => {
    const map = new Map<number, "L" | "R">();
    for (const note of expectedNotesList) {
      if (expectedNotesSet.has(note.pitch)) {
        map.set(
          note.pitch,
          (note.hand as "L" | "R") || (note.pitch >= 60 ? "R" : "L")
        );
      }
    }
    return map;
  }, [expectedNotesList, expectedNotesSet]);

  const PRACTICE_MODE_OPTIONS: SegmentedControlOption[] = useMemo(
    () => [
      { id: "wait", label: "Wait Mode ⏸", testId: "mode-wait" },
      { id: "continuous", label: "Continuous Run", testId: "mode-continuous" },
    ],
    []
  );

  const HAND_OPTIONS: SegmentedControlOption[] = useMemo(
    () => [
      { id: "both", label: "Both" },
      { id: "right", label: "RH" },
      { id: "left", label: "LH" },
    ],
    []
  );

  useEffect(() => {
    updateExpectedNotes();
  }, [updateExpectedNotes]);

  useEffect(() => {
    engine.onScore((event) => {
      setLastScore(event);
      setStats(engine.getStats());
      updateExpectedNotes();

      // Classify micro-timing feedback and record into tracker
      const isMatched = event.note !== null;
      const expectedPitch = event.note ? event.note.pitch : 60;
      const struckPitch = event.playedPitch ?? expectedPitch;
      const delta =
        typeof event.signedDeltaMs === "number"
          ? event.signedDeltaMs
          : event.score === "Miss"
            ? 100
            : event.timeDiff;
      const hand = event.note?.hand ?? (struckPitch >= 60 ? "R" : "L");
      const noteName = event.note?.name;

      const timingFeedback = classifyMicroTiming(
        delta,
        struckPitch,
        isMatched ? expectedPitch : -1,
        hand,
        noteName
      );

      microTimingTrackerRef.current.record(timingFeedback);
      setActiveTimingFeedback(timingFeedback);
      setTimingStats(microTimingTrackerRef.current.getStats());
    });
  }, [engine, updateExpectedNotes]);

  // Sync handMode changes into engine
  useEffect(() => {
    engine.setHandMode(handMode);
    setStats(engine.getStats());
    updateExpectedNotes();
  }, [engine, handMode, updateExpectedNotes]);

  // Lifecycle for Virtual SoundFont Accompaniment Engine (Milestone N.2)
  useEffect(() => {
    const acc = new AccompanimentEngine();
    accompanimentRef.current = acc;
    void acc.init();
    return () => {
      acc.destroy();
      accompanimentRef.current = null;
    };
  }, []);

  // Sync state into accompaniment engine
  useEffect(() => {
    accompanimentRef.current?.setNotes(expectedNotesList);
  }, [expectedNotesList]);

  useEffect(() => {
    accompanimentRef.current?.setHandMode(handMode);
  }, [handMode]);

  useEffect(() => {
    accompanimentRef.current?.setEnabled(accompanimentEnabled);
  }, [accompanimentEnabled]);

  useEffect(() => {
    accompanimentRef.current?.setVolume(accompanimentVolume);
  }, [accompanimentVolume]);

  useEffect(() => {
    accompanimentRef.current?.setSpeed(speedMultiplier);
  }, [speedMultiplier]);

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
            accompanimentRef.current?.seek(candidateTime);
            handleLoopCycleCompleted();
          }
        } else if (candidateTime >= totalDurationMsRef.current) {
          setIsPlaying(false);
          accompanimentRef.current?.pause();
          return;
        }

        const shouldPause = engine.processInput(
          combinedActiveNotesRef.current,
          candidateTime,
          isWaitModeRef.current
        );

        if (!shouldPause) {
          accompanimentRef.current?.tick(candidateTime, prevTime);
          currentTimeRef.current = candidateTime;
        } else {
          accompanimentRef.current?.pause();
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
      accompanimentRef.current?.pause();
    }
    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
      accompanimentRef.current?.pause();
    };
  }, [isPlaying, animate]);

  const handleFinish = async () => {
    setIsPlaying(false);
    accompanimentRef.current?.pause();
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
      accompanimentRef.current?.seek(startMs);
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
      accompanimentRef.current?.seek(measure.startMs);
      updateExpectedNotes();
      setStats(engine.getStats());
    },
    [engine, updateExpectedNotes]
  );

  const handleRestart = () => {
    setIsPlaying(false);
    engine.reset();
    accompanimentRef.current?.seek(0);
    currentTimeRef.current = 0;
    setLastScore(null);
    microTimingTrackerRef.current.reset();
    setActiveTimingFeedback(null);
    setTimingStats(null);
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

      {/* Top Header Bar: Streamlined Single-Row HUD */}
      <header className="sticky top-0 z-30 bg-[#09090b]/90 backdrop-blur-xl border-b border-white/10 px-4 py-2 flex items-center justify-between gap-3 flex-wrap xl:flex-nowrap shadow-lg">
        {/* Left: Navigation & Song Title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
          <Link href="/projects">
            <Button size="sm" variant="outline" className="text-xs gap-1 h-8 px-2.5">
              <span>←</span>
              <span className="hidden sm:inline">Projects</span>
            </Button>
          </Link>
          <Link href={`/projects/${projectId}/sheet`}>
            <Button size="sm" variant="outline" className="text-xs gap-1 h-8 px-2.5">
              <span>🎼</span>
              <span className="hidden sm:inline">Sheet Music</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-bold text-zinc-100 tracking-tight flex items-center gap-1.5 truncate max-w-[160px] sm:max-w-xs">
              <span>🎹</span>
              <span className="truncate">{projectQuery.data?.name || "Practice Session"}</span>
            </h1>
            <span className="text-[11px] text-zinc-400 font-mono hidden md:inline">
              {bpm} BPM • {timeSignature}
            </span>
          </div>
        </div>

        {/* Center: Hardware Status Pill, Input Toggle & Practice Mode Segmented Toggle */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Input Mode Selector: MIDI vs Acoustic Mic */}
          <div className="flex items-center rounded-xl bg-zinc-900/90 p-1 border border-white/10 select-none">
            <button
              type="button"
              onClick={() => setInputMode("midi")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                inputMode === "midi"
                  ? "bg-cyan-500 text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              MIDI
            </button>
            <button
              type="button"
              onClick={() => setInputMode("mic")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                inputMode === "mic"
                  ? "bg-cyan-500 text-zinc-950 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              Mic
            </button>
          </div>

          {/* Hardware Status Pill */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setInputMode((prev) => (prev === "midi" ? "mic" : "midi"))}
            title={`Input: ${inputMode.toUpperCase()} (Click to toggle MIDI / Microphone)`}
            className="cursor-pointer select-none"
          >
            {inputMode === "mic" ? (
              <Badge variant="hand-lh" size="md" className="hover:border-cyan-400/50 transition">
                ● Acoustic Mic Active{mic.currentResult ? ` (${mic.currentResult.noteName})` : ""}
              </Badge>
            ) : midiAccess ? (
              <Badge variant="success" size="md" className="hover:border-emerald-400/50 transition">
                ● {midiDeviceName} Connected
                <span className="text-[10px] text-emerald-400/80 font-normal ml-1 hidden sm:inline">
                  (MIDI Hardware Connected)
                </span>
                <span className="sr-only">MIDI Hardware Connected</span>
              </Badge>
            ) : (
              <Badge variant="default" size="md" className="hover:border-zinc-500 transition">
                ○ Virtual Mode
              </Badge>
            )}
          </div>

          {/* Practice Mode Segmented Toggle */}
          <SegmentedControl
            options={PRACTICE_MODE_OPTIONS}
            value={isWaitMode ? "wait" : "continuous"}
            onChange={(val) => {
              setIsWaitMode(val === "wait");
              updateExpectedNotes();
            }}
            size="sm"
            ariaLabel="Practice mode selection"
          />
        </div>

        {/* Right: Speed, Hands, Metronome, and Primary Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
          {/* Speed Multiplier */}
          <div className="flex items-center rounded-xl bg-zinc-900/90 p-1 border border-white/10 select-none">
            {[0.5, 0.75, 1.0, 1.25, 1.5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSpeedMultiplier(spd)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                  speedMultiplier === spd
                    ? "bg-cyan-500 text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Hand Filter */}
          <SegmentedControl
            options={HAND_OPTIONS}
            value={handMode}
            onChange={(v) => setHandMode(v as HandPracticeMode)}
            size="sm"
            ariaLabel="Hand isolation"
          />

          {/* Metronome Popover Trigger */}
          <MetronomeControl
            initialBpm={bpm}
            initialTimeSignature={
              ["4/4", "3/4", "3/8", "6/8", "2/4"].includes(timeSignature)
                ? (timeSignature as TimeSignature)
                : "4/4"
            }
            compact
          />

          {/* Primary Action Buttons: Reset, Play/Pause, Finish */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-white/10">
            <Button size="sm" variant="outline" onClick={handleRestart} className="h-8 text-xs">
              Reset
            </Button>
            <Button
              size="sm"
              variant={isPlaying ? "secondary" : "gradient"}
              onClick={() => {
                setIsPlaying((prev) => {
                  const next = !prev;
                  if (next) updateExpectedNotes();
                  return next;
                });
              }}
              className={`h-8 text-xs ${!isPlaying ? "font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]" : ""}`}
            >
              {isPlaying ? "Pause" : "Start"}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleFinish}
              disabled={createSession.isPending}
              className="h-8 text-xs font-semibold"
            >
              Finish
            </Button>
          </div>
        </div>
      </header>

      {/* Secondary Utility Strip: Difficulty Selector, Auto Ramp, Tracks */}
      <section className="flex flex-wrap items-center justify-between px-4 py-1.5 bg-[#121215]/80 border-b border-white/5 text-xs gap-2 z-20">
        <div className="flex items-center gap-2.5 flex-wrap">
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

          {/* Auto Tempo Ramping Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoRamp((prev) => !prev)}
            title="Automatically increase speed (+0.1x) when completing a loop cycle with ≥90% accuracy"
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
              isAutoRamp
                ? "bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                : "bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:text-zinc-200"
            }`}
          >
            <span>⚡</span>
            <span>Auto Ramp</span>
          </button>

          {/* Virtual SoundFont Accompaniment Control (Milestone N.2) */}
          <div
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/90 px-2 py-1 text-xs select-none shadow-sm"
            data-testid="accompaniment-control"
          >
            <button
              type="button"
              onClick={() => setAccompanimentEnabled((prev) => !prev)}
              title={
                handMode === "both"
                  ? "Auto-Accompaniment activates during single-hand practice (select RH or LH)"
                  : accompanimentEnabled
                    ? "Click to mute accompaniment track"
                    : "Click to enable accompaniment track"
              }
              className={`flex items-center gap-1.5 font-semibold transition ${
                !accompanimentEnabled
                  ? "text-zinc-500 hover:text-zinc-300"
                  : handMode === "both"
                    ? "text-zinc-400 hover:text-zinc-200"
                    : "text-emerald-400 font-bold"
              }`}
            >
              <span>🎹</span>
              <span>Auto-Accomp</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  accompanimentEnabled
                    ? handMode === "both"
                      ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-zinc-800 text-zinc-500 line-through border border-zinc-800"
                }`}
              >
                {accompanimentEnabled ? (handMode === "both" ? "Standby" : "ON") : "OFF"}
              </span>
            </button>

            {accompanimentEnabled && (
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/10">
                <span className="text-[10px] text-zinc-400 font-mono">
                  {Math.round(accompanimentVolume * 100)}%
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round(accompanimentVolume * 100)}
                  onChange={(e) => setAccompanimentVolume(Number(e.target.value) / 100)}
                  aria-label="Accompaniment Volume"
                  title={`Accompaniment Volume: ${Math.round(accompanimentVolume * 100)}%`}
                  className="w-16 h-1 accent-emerald-400 bg-zinc-700 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Multi-Track Filter Button */}
        {tracks.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowTrackSelector(true)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
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
          accompanimentRef.current?.seek(targetTime);
          setActiveTimingFeedback(null);
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
        {/* Floating Frosted-Glass Performance HUD */}
        <div className="bg-[#050507]/80 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl absolute top-4 right-4 z-20 pointer-events-none flex items-center gap-3.5 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Score</span>
            <span data-testid="score-counter" className="text-xl font-black text-white tracking-tight tabular-nums">
              {stats.score.toLocaleString()}
            </span>
          </div>

          <div className="border-l border-white/10 pl-3">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Accuracy</span>
            <span
              data-testid="accuracy-badge"
              className={`text-xl font-black tracking-tight tabular-nums ${
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

          <div className="border-l border-white/10 pl-3">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Combo</span>
            <span data-testid="combo-streak" className="text-xl font-black text-amber-400 flex items-center gap-1 tabular-nums">
              {stats.combo}x <span className="text-base">🔥</span>
            </span>
          </div>

          {/* Last Score (needed for test practice_mode.spec.ts) */}
          <div className="border-l border-white/10 pl-3 hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Last Score</span>
            <span
              className={`text-sm font-bold tracking-tight ${
                lastScore
                  ? lastScore.score === "Perfect"
                    ? "text-emerald-400"
                    : lastScore.score === "Good"
                      ? "text-yellow-400"
                      : "text-rose-400"
                  : "text-zinc-500"
              }`}
            >
              {lastScore ? lastScore.score : "Waiting..."}
            </span>
          </div>

          <div className="border-l border-white/10 pl-3 hidden lg:flex flex-col text-[10px] font-mono text-zinc-400 leading-tight">
            <span className="text-emerald-400">P: {stats.perfectHits}</span>
            <span className="text-yellow-400">G: {stats.goodHits}</span>
            <span className="text-rose-400">M: {stats.missHits}</span>
          </div>
        </div>

        <PracticeCanvas
          notes={expectedNotesList}
          currentTimeRef={currentTimeRef}
          isPlaying={isPlaying}
          activeNotes={combinedActiveNotes}
          expectedNotes={expectedNotesSet}
          lastScore={lastScore}
          timingFeedback={activeTimingFeedback}
          timingStats={timingStats}
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

        {/* Live Micro-Timing Strike Gauge (Milestone N.1) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <MicroTimingGauge feedback={activeTimingFeedback} stats={timingStats} />
        </div>
      </main>

      {/* Keyboard Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-2 sm:px-6 py-2 shadow-2xl z-20">
        <div className="max-w-7xl mx-auto">
          <Keyboard
            activeNotes={combinedActiveNotes}
            expectedNotes={expectedNotesSet}
            isWaitMode={isWaitMode}
            expectedNotesHandMap={expectedNotesHandMap}
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
