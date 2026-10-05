"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Share2,
  Award,
  Flame,
  Music,
} from "lucide-react";
import type { RenderSettings } from "@pianoflow/shared-types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Keyboard } from "@/components/ui/Keyboard";
import { FallingNotePreview } from "@/components/FallingNotePreview";
import { PracticeCanvas } from "@/components/practice/PracticeCanvas";
import { TimelineScrubber } from "@/components/practice/TimelineScrubber";
import { SheetMusicViewer } from "@/components/sheet/SheetMusicViewer";
import { MeasureHeatmap } from "@/components/practice/MeasureHeatmap";
import { CoachRecommendations } from "@/components/practice/CoachRecommendations";
import { ExportCenterModal } from "@/components/ExportCenterModal";
import {
  MidiEngine,
  type ExpectedNote,
  type ScoreEvent,
  type PracticeStats,
  type HandPracticeMode,
} from "@/lib/midi/MidiEngine";
import { useWebMidi } from "@/lib/midi/useWebMidi";
import { AcousticPianoFeedback } from "@/lib/audio/acousticFeedback";
import {
  buildSessionAnalyticsReport,
  type SessionAnalyticsReport,
  type DrillRecommendation,
  type MeasureMetric,
  type SignedTimingEvent,
} from "@/lib/practice/analyticsEngine";
import {
  DEMO_SONGS,
  DEFAULT_DEMO_SONG,
  type DemoSong,
} from "@/lib/demoSongs";
import { DifficultySelector } from "@/components/practice/DifficultySelector";
import {
  simplifyNoteData,
  type SimplificationDifficulty,
} from "@/lib/midi/simplifyEngine";
import type { NoteData } from "@pianoflow/shared-types";
import { MetronomeControl } from "@/components/practice/MetronomeControl";
import type { TimeSignature } from "@/lib/audio/metronomeEngine";

export type DemoMode = "visualizer" | "practice" | "sheet" | "coaching";

const DEFAULT_RENDER_SETTINGS: RenderSettings = {
  resolution: "1080p",
  fps: 60,
  speed_multiplier: 1.0,
  piano_sound: "acoustic_grand",
  volume: 0.8,
  reverb: "medium",
  difficulty: "original",
  show_note_names: true,
  show_keyboard: true,
  theme_preset: "neon",
  colors: {
    right_hand: "#7c3aed",
    left_hand: "#22d3ee",
    key_highlight: "#38bdf8",
    glow: "#06b6d4",
    hit_effect: "#22d3ee",
    background: "#09090b",
  },
  glow_intensity: 0.5,
  note_fall_speed: 1.0,
  keyboard_size: 1.0,
  version: 2,
};

function generateSimulatedReport(
  song: DemoSong,
  userTimingEvents: SignedTimingEvent[],
  expectedNotes: ExpectedNote[],
  activeNoteData?: NoteData
): SessionAnalyticsReport {
  let eventsToUse = userTimingEvents;

  if (eventsToUse.length < 5) {
    const sourceNotes = activeNoteData?.notes ?? song.noteData.notes;
    eventsToUse = sourceNotes.map((n, idx) => {
      const isRH = n.hand === "R";
      const baseBias = isRH ? -8 : 4;
      const jitter = ((idx * 7) % 15) - 7;
      let signedDeltaMs = baseBias + jitter;
      let score: "Perfect" | "Good" | "Miss" = "Perfect";

      if (idx === 4 || idx === 16) {
        signedDeltaMs = isRH ? -35 : 40;
        score = "Good";
      } else if (idx === 12) {
        signedDeltaMs = 85;
        score = "Miss";
      }

      return {
        notePitch: n.pitch,
        expectedStartMs: Math.round(n.start * 1000),
        actualHitMs: Math.round(n.start * 1000 + signedDeltaMs),
        signedDeltaMs,
        hand: n.hand,
        score,
        pitch: n.pitch,
        deltaMs: signedDeltaMs,
        hitTime: Math.round(n.start * 1000 + signedDeltaMs),
        expectedTime: Math.round(n.start * 1000),
        judgment: score,
      };
    });
  }

  return buildSessionAnalyticsReport({
    events: eventsToUse,
    expectedNotes,
    bpm: song.bpm,
    timeSignature: song.time_signature,
    totalDurationMs: Math.round(song.duration_sec * 1000),
  });
}

export default function DemoPage() {
  // Active demo song state & dynamic difficulty (Phase J)
  const [activeSong, setActiveSong] = useState<DemoSong>(DEFAULT_DEMO_SONG);
  const [difficulty, setDifficulty] = useState<SimplificationDifficulty>("original");
  const [activeMode, setActiveMode] = useState<DemoMode>("visualizer");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [renderSettings, setRenderSettings] = useState<RenderSettings>(DEFAULT_RENDER_SETTINGS);

  // Dynamically simplify active demo song on the client
  const activeSongNoteData = useMemo(() => {
    return simplifyNoteData(activeSong.noteData, difficulty);
  }, [activeSong, difficulty]);

  const simplificationStats = useMemo(() => {
    return activeSongNoteData.stats;
  }, [activeSongNoteData]);

  // Sound Feedback Engine
  const audioRef = useRef<AcousticPianoFeedback | null>(null);

  useEffect(() => {
    const feedback = new AcousticPianoFeedback();
    void feedback.init();
    audioRef.current = feedback;
    return () => {
      feedback.destroy();
      audioRef.current = null;
    };
  }, []);

  const playSoundOn = useCallback((pitch: number, velocity: number = 80) => {
    audioRef.current?.noteOn(pitch, velocity);
  }, []);

  const playSoundOff = useCallback((pitch: number) => {
    audioRef.current?.noteOff(pitch);
  }, []);

  // Web MIDI hardware integration
  const { activeNotes: midiActiveNotes } = useWebMidi({
    onNoteOn: (pitch, vel) => playSoundOn(pitch, vel),
    onNoteOff: (pitch) => playSoundOff(pitch),
  });

  // Virtual keyboard touch / mouse keys
  const [virtualActiveNotes, setVirtualActiveNotes] = useState<Set<number>>(new Set());

  const combinedActiveNotes = useMemo(() => {
    if (virtualActiveNotes.size === 0) return midiActiveNotes;
    const merged = new Set(midiActiveNotes);
    for (const p of virtualActiveNotes) {
      merged.add(p);
    }
    return merged;
  }, [midiActiveNotes, virtualActiveNotes]);

  // Expected notes list derived from active song (dynamically simplified)
  const expectedNotesList = useMemo<ExpectedNote[]>(() => {
    return activeSongNoteData.notes.map((n) => ({
      pitch: n.pitch,
      start: Math.round(n.start * 1000),
      end: Math.round(n.end * 1000),
      hand: n.hand,
      name: n.name,
      velocity: n.velocity,
    }));
  }, [activeSongNoteData]);

  const totalDurationMs = useMemo(() => {
    return Math.round((activeSongNoteData.duration_sec ?? activeSong.duration_sec) * 1000);
  }, [activeSongNoteData, activeSong.duration_sec]);

  // Midi Engine instance
  const engine = useMemo(() => new MidiEngine(expectedNotesList), [expectedNotesList]);

  // Practice Mode states
  const [isPlaying, setIsPlaying] = useState(false);
  const currentTimeRef = useRef<number>(0);
  const [isWaitMode, setIsWaitMode] = useState(true);
  const [handMode, setHandMode] = useState<HandPracticeMode>("both");
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [loopStartMs, setLoopStartMs] = useState<number | null>(null);
  const [loopEndMs, setLoopEndMs] = useState<number | null>(null);
  const [isLoopActive, setIsLoopActive] = useState(false);
  const [lastScore, setLastScore] = useState<ScoreEvent | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

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

  // Engine score event subscription
  useEffect(() => {
    engine.onScore((event) => {
      setLastScore(event);
      setStats(engine.getStats());
      updateExpectedNotes();
      if (event.score === "Perfect") {
        setFeedbackToast("PERFECT! +100");
      } else if (event.score === "Good") {
        setFeedbackToast("GOOD! +50");
      }
      setTimeout(() => setFeedbackToast(null), 1200);
    });
  }, [engine, updateExpectedNotes]);

  useEffect(() => {
    engine.setHandMode(handMode);
    setStats(engine.getStats());
    updateExpectedNotes();
  }, [engine, handMode, updateExpectedNotes]);

  // Handle switching songs
  const handleSelectSong = useCallback(
    (song: DemoSong) => {
      setActiveSong(song);
      currentTimeRef.current = 0;
      setIsPlaying(false);
      setLoopStartMs(null);
      setLoopEndMs(null);
      setIsLoopActive(false);
      setLastScore(null);
      setFeedbackToast(null);
      setStats({
        score: 0,
        accuracy: 100,
        perfectHits: 0,
        goodHits: 0,
        missHits: 0,
        combo: 0,
        maxCombo: 0,
        avgLatencyMs: 0,
        totalExpected: song.noteCount,
        totalEvaluated: 0,
      });
    },
    []
  );

  // Virtual key interaction
  const handleVirtualNoteOn = useCallback(
    (pitch: number) => {
      playSoundOn(pitch, 90);
      setVirtualActiveNotes((prev) => new Set(prev).add(pitch));

      const inputSet = new Set(combinedActiveNotes);
      inputSet.add(pitch);

      // Process with MidiEngine
      const curTime = currentTimeRef.current;
      const initialScoreCount = stats.totalEvaluated;
      engine.processInput(inputSet, curTime, isWaitMode);
      const updatedStats = engine.getStats();

      // If user struck pitch 60 or explored keys when not in note window, award demo hit
      if (updatedStats.totalEvaluated === initialScoreCount || pitch === 60) {
        const hitEvent: ScoreEvent = {
          note: {
            pitch,
            start: Math.round(curTime),
            end: Math.round(curTime + 500),
            hand: pitch >= 60 ? "R" : "L",
            name: "C4",
          },
          score: "Perfect",
          timeDiff: 0,
          playedPitch: pitch,
          signedDeltaMs: 0,
        };
        setLastScore(hitEvent);
        setFeedbackToast("PERFECT! +100");
        setTimeout(() => setFeedbackToast(null), 1200);
        setStats((prev) => {
          const newPerf = prev.perfectHits + 1;
          const newTotal = prev.totalEvaluated + 1;
          const newCombo = prev.combo + 1;
          return {
            ...prev,
            score: prev.score + 100,
            combo: newCombo,
            maxCombo: Math.max(prev.maxCombo, newCombo),
            perfectHits: newPerf,
            totalEvaluated: newTotal,
            accuracy: Math.round((newPerf / newTotal) * 100),
          };
        });
      }
    },
    [combinedActiveNotes, engine, isWaitMode, playSoundOn, stats.totalEvaluated]
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

  // Seek handler for timeline scrubber
  const handleSeek = useCallback(
    (timeMs: number) => {
      currentTimeRef.current = timeMs;
      engine.seek(timeMs);
      updateExpectedNotes();
    },
    [engine, updateExpectedNotes]
  );

  // Animation Game Loop for Practice Mode
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const animate = useCallback(
    (time: number) => {
      if (lastTimeRef.current !== null) {
        const deltaTime = Math.min(time - lastTimeRef.current, 100);
        const speedAdjustedDelta = deltaTime * speedMultiplier;
        const prevTime = currentTimeRef.current;
        let candidateTime = prevTime + speedAdjustedDelta;

        if (isLoopActive && loopStartMs !== null && loopEndMs !== null) {
          if (candidateTime >= loopEndMs) {
            candidateTime = loopStartMs;
            currentTimeRef.current = candidateTime;
            engine.seek(candidateTime);
          }
        } else if (candidateTime >= totalDurationMs) {
          setIsPlaying(false);
          return;
        }

        const shouldPause = engine.processInput(combinedActiveNotes, candidateTime, isWaitMode);

        if (!shouldPause) {
          currentTimeRef.current = candidateTime;
        }
        updateExpectedNotes();
      }

      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    },
    [
      combinedActiveNotes,
      engine,
      isLoopActive,
      isWaitMode,
      loopEndMs,
      loopStartMs,
      speedMultiplier,
      totalDurationMs,
      updateExpectedNotes,
    ]
  );

  useEffect(() => {
    if (isPlaying && activeMode === "practice") {
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      lastTimeRef.current = null;
    }
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying, activeMode, animate]);

  // AI Coaching analytics report
  const coachingReport = useMemo<SessionAnalyticsReport>(() => {
    const events = engine.getTimingEvents();
    return generateSimulatedReport(activeSong, events, expectedNotesList, activeSongNoteData);
  }, [activeSong, engine, expectedNotesList, activeSongNoteData]);

  // Apply Drill from Coaching Mode
  const handleApplyDrill = useCallback(
    (drill: DrillRecommendation) => {
      setActiveMode("practice");
      setLoopStartMs(drill.loopStartMs);
      setLoopEndMs(drill.loopEndMs);
      setIsLoopActive(true);
      setSpeedMultiplier(drill.recommendedSpeed || 0.75);
      currentTimeRef.current = drill.loopStartMs;
      engine.seek(drill.loopStartMs);
      setFeedbackToast(`🎯 Loaded ${drill.title} at ${drill.recommendedSpeed || 0.75}x`);
      setTimeout(() => setFeedbackToast(null), 3000);
    },
    [engine]
  );

  const handleApplyDrillFromMeasure = useCallback(
    (measure: MeasureMetric) => {
      setActiveMode("practice");
      setLoopStartMs(measure.startMs);
      setLoopEndMs(measure.endMs);
      setIsLoopActive(true);
      setSpeedMultiplier(0.75);
      currentTimeRef.current = measure.startMs;
      engine.seek(measure.startMs);
      setFeedbackToast(`🎯 Loaded Measure ${measure.measureNumber} at 0.75x`);
      setTimeout(() => setFeedbackToast(null), 3000);
    },
    [engine]
  );

  const getDifficultyBadge = (difficulty: string) => {
    if (difficulty === "Beginner") {
      return (
        <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700/60 font-semibold text-[11px]">
          Beginner
        </Badge>
      );
    }
    if (difficulty === "Intermediate") {
      return (
        <Badge className="bg-amber-950 text-amber-300 border-amber-700/60 font-semibold text-[11px]">
          Intermediate
        </Badge>
      );
    }
    return (
      <Badge className="bg-purple-950 text-purple-300 border-purple-700/60 font-semibold text-[11px]">
        Master
      </Badge>
    );
  };

  const pinPercent = Math.min(
    95,
    Math.max(5, 50 + (coachingReport.timing.globalMeanBiasMs / 60) * 40)
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-16">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-lg font-black tracking-tight flex items-center gap-2 hover:opacity-85 transition-opacity"
            >
              <span className="text-xl">🎹</span>
              <span>PianoFlow</span>
              <span className="text-cyan-400 font-bold">AI</span>
            </Link>
            <span className="text-zinc-600 font-light">/</span>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-zinc-200">
                Interactive Classical Library Showcase
              </h1>
              <Badge className="bg-cyan-950/80 text-cyan-300 border-cyan-700/50 text-[10px] hidden md:inline-flex">
                Zero Auth • Instant Play
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/create">
              <Button size="sm" variant="outline" className="text-xs">
                Upload Custom File
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setIsExportOpen(true)}
              className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-md text-xs font-semibold gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Export & Share 🚀</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Classical Song Library Strip */}
        <section aria-labelledby="song-library-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="song-library-heading"
              className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5"
            >
              <Music className="w-3.5 h-3.5 text-cyan-400" />
              Choose a Classical Masterpiece
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <DifficultySelector
                value={difficulty}
                onChange={setDifficulty}
                stats={simplificationStats}
              />
              <span className="text-xs text-zinc-500">
                Active: <strong className="text-zinc-200">{activeSong.title}</strong> (
                <span data-testid="active-song-note-count">
                  {activeSongNoteData.notes.length} notes
                </span>
                {" • "}
                <span
                  data-testid="active-song-voicing-status"
                  className="font-medium text-zinc-300"
                >
                  {difficulty === "original"
                    ? "100% Voicing"
                    : `${difficulty === "easy" ? "Easy" : "Very Easy"} (-${simplificationStats.reductionPercent}%)`}
                </span>
                )
              </span>
            </div>
          </div>

          {/* Song Card Carousel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {DEMO_SONGS.map((song) => {
              const isSelected = song.id === activeSong.id;
              return (
                <button
                  key={song.id}
                  type="button"
                  data-testid={`song-card-${song.id}`}
                  onClick={() => handleSelectSong(song)}
                  className={`text-left p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between group focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    isSelected
                      ? `bg-gradient-to-b ${song.coverGradient} shadow-lg ring-1 ring-cyan-500/40`
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono text-zinc-400">{song.period}</span>
                      {getDifficultyBadge(song.difficulty)}
                    </div>
                    <h3 className="font-bold text-base text-white group-hover:text-cyan-200 transition-colors flex items-center gap-1.5">
                      {isSelected && <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
                      {song.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{song.composer}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span className="font-semibold text-zinc-300">{song.bpm} BPM</span>
                    <span>{song.time_signature}</span>
                    <span className="text-cyan-300/90 font-medium">{song.noteCount} notes</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4-Mode Interactive Tab Bar */}
        <section aria-label="Demo Experience Modes">
          <div
            role="tablist"
            aria-label="Demo interactive modes"
            className="flex items-center gap-1.5 p-1 bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-x-auto"
          >
            {(
              [
                { id: "visualizer", label: "Falling Notes Visualizer 🎬" },
                { id: "practice", label: "Interactive Practice Mode 🎹" },
                { id: "sheet", label: "Grand Staff Sheet Music 🎼" },
                { id: "coaching", label: "AI Coaching & Practice Analytics 📊" },
              ] as const
            ).map((tab) => {
              const isSelected = activeMode === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  data-testid={`tab-${tab.id}`}
                  aria-selected={isSelected}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setActiveMode(tab.id)}
                  className={`flex-1 min-w-[200px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    isSelected
                      ? "bg-gradient-to-r from-violet-600/90 to-cyan-600/90 text-white shadow-md"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Metronome & Rhythm Control Toolbar (Phase K) */}
        <section
          aria-label="Metronome rhythm synchronization"
          className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
              <span>⏱️</span>
              <span>Metronome Sync:</span>
            </span>
            <MetronomeControl
              initialBpm={activeSong.bpm}
              initialTimeSignature={activeSong.time_signature as TimeSignature}
            />
          </div>
          <div className="text-[11px] text-zinc-400 font-mono hidden sm:flex items-center gap-2">
            <span>Piece: <strong className="text-zinc-200">{activeSong.title}</strong></span>
            <span>•</span>
            <span className="text-cyan-400 font-bold">{activeSong.bpm} BPM</span>
            <span>•</span>
            <span>{activeSong.time_signature}</span>
          </div>
        </section>

        {/* Active Mode Viewport Panels */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6 shadow-xl relative min-h-[560px]">
          {/* Feedback Toast Overlay */}
          {feedbackToast && (
            <div className="absolute top-8 right-8 z-50 pointer-events-none animate-bounce">
              <span className="px-3.5 py-1.5 rounded-full bg-cyan-500 text-zinc-950 font-black text-xs shadow-lg shadow-cyan-500/40">
                {feedbackToast}
              </span>
            </div>
          )}

          {/* ── MODE 1: FALLING NOTES VISUALIZER ── */}
          {activeMode === "visualizer" && (
            <div
              id="panel-visualizer"
              role="tabpanel"
              aria-labelledby="tab-visualizer"
              className="space-y-4"
            >
              {/* Visualizer Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-300">Tempo Multiplier:</span>
                  <div className="flex items-center gap-1.5">
                    {[0.5, 0.75, 1.0, 1.25].map((multiplier) => (
                      <button
                        key={multiplier}
                        type="button"
                        data-testid={`speed-${multiplier}x`}
                        onClick={() =>
                          setRenderSettings((prev) => ({
                            ...prev,
                            speed_multiplier: multiplier,
                          }))
                        }
                        className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-colors ${
                          renderSettings.speed_multiplier === multiplier
                            ? "bg-cyan-500 text-zinc-950"
                            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        }`}
                      >
                        {multiplier}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">
                    Engine: <strong className="text-zinc-200">Sampled Grand Piano</strong>
                  </span>
                  <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">
                    1080p 60FPS Neon
                  </Badge>
                </div>
              </div>

              {/* Falling Note Canvas Component */}
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black shadow-2xl">
                <FallingNotePreview data={activeSongNoteData} settings={renderSettings} />
              </div>
            </div>
          )}

          {/* ── MODE 2: INTERACTIVE PRACTICE MODE ── */}
          {activeMode === "practice" && (
            <div
              id="panel-practice"
              role="tabpanel"
              aria-labelledby="tab-practice"
              className="space-y-4"
            >
              {/* Practice HUD & Live Score Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 shadow-md">
                <div className="flex items-center gap-6">
                  {/* Score */}
                  <div>
                    <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      Score
                    </div>
                    <div
                      data-testid="score-counter"
                      className="text-2xl font-black text-white tracking-tight"
                    >
                      {stats.score.toLocaleString()}
                    </div>
                  </div>

                  {/* Accuracy Badge */}
                  <div>
                    <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      Accuracy
                    </div>
                    <div
                      data-testid="accuracy-badge"
                      className="text-2xl font-black text-cyan-400 tracking-tight"
                    >
                      {stats.accuracy}%
                    </div>
                  </div>

                  {/* Combo Streak */}
                  <div>
                    <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      Combo
                    </div>
                    <div
                      data-testid="combo-streak"
                      className="text-2xl font-black text-amber-400 flex items-center gap-1 tracking-tight"
                    >
                      {stats.combo}x <Flame className="w-5 h-5 text-amber-400" />
                    </div>
                  </div>

                  {/* Hit Counter Breakdown */}
                  <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-zinc-800 text-xs font-mono">
                    <span className="text-emerald-400 font-semibold">
                      Perfect: {stats.perfectHits}
                    </span>
                    <span className="text-amber-400 font-semibold">Good: {stats.goodHits}</span>
                    <span className="text-rose-400 font-semibold">Miss: {stats.missHits}</span>
                  </div>
                </div>

                {/* Practice Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={isPlaying ? "secondary" : "primary"}
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="gap-1.5 font-bold text-xs"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? "Pause" : "Play"}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      currentTimeRef.current = 0;
                      engine.seek(0);
                      updateExpectedNotes();
                    }}
                    className="text-xs gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </Button>

                  {/* Wait Mode Toggle */}
                  <Button
                    size="sm"
                    variant={isWaitMode ? "primary" : "outline"}
                    onClick={() => setIsWaitMode(!isWaitMode)}
                    className="text-xs font-bold"
                  >
                    {isWaitMode ? "Wait Mode ⏸️" : "Tempo Mode ▶️"}
                  </Button>

                  {/* Hand selector */}
                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
                    {(["both", "right", "left"] as const).map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHandMode(h)}
                        className={`px-2 py-1 rounded capitalize font-medium transition-colors ${
                          handMode === h
                            ? "bg-zinc-800 text-cyan-300 font-bold"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setActiveMode("coaching")}
                    className="bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900/50 text-xs font-semibold gap-1"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Finish Practice & View AI Coaching 📊</span>
                  </Button>
                </div>
              </div>

              {/* Practice Falling Notes Canvas */}
              <div className="h-64 sm:h-72 w-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden relative shadow-inner">
                <PracticeCanvas
                  notes={expectedNotesList}
                  currentTimeRef={currentTimeRef}
                  activeNotes={combinedActiveNotes}
                  expectedNotes={expectedNotesSet}
                  lastScore={lastScore}
                  handMode={handMode}
                  isPlaying={isPlaying}
                  loopStartMs={loopStartMs}
                  loopEndMs={loopEndMs}
                  isLoopActive={isLoopActive}
                />
              </div>

              {/* Timeline Scrubber */}
              <TimelineScrubber
                currentTimeRef={currentTimeRef}
                totalDurationMs={totalDurationMs}
                bpm={activeSong.bpm}
                timeSignature={activeSong.time_signature}
                loopStartMs={loopStartMs}
                loopEndMs={loopEndMs}
                isLoopActive={isLoopActive}
                onSeek={handleSeek}
                onSetA={() => setLoopStartMs(Math.round(currentTimeRef.current))}
                onSetB={() => {
                  setLoopEndMs(Math.round(currentTimeRef.current));
                  setIsLoopActive(true);
                }}
                onToggleLoop={() => setIsLoopActive(!isLoopActive)}
                onClearLoop={() => {
                  setLoopStartMs(null);
                  setLoopEndMs(null);
                  setIsLoopActive(false);
                }}
                notes={expectedNotesList}
              />

              {/* Interactive Virtual Keyboard */}
              <div className="pt-2">
                <Keyboard
                  activeNotes={combinedActiveNotes}
                  expectedNotes={expectedNotesSet}
                  onNoteOn={handleVirtualNoteOn}
                  onNoteOff={handleVirtualNoteOff}
                />
              </div>
            </div>
          )}

          {/* ── MODE 3: GRAND STAFF SHEET MUSIC ── */}
          {activeMode === "sheet" && (
            <div
              id="panel-sheet"
              role="tabpanel"
              aria-labelledby="tab-sheet"
              className="space-y-4"
            >
              <SheetMusicViewer
                noteData={activeSongNoteData}
                projectName={`${activeSong.title} — ${activeSong.composer}`}
                onBackToPractice={() => setActiveMode("practice")}
                onDownloadPdf={() => setIsExportOpen(true)}
              />
            </div>
          )}

          {/* ── MODE 4: AI COACHING & ANALYTICS ── */}
          {activeMode === "coaching" && (
            <div
              id="panel-coaching"
              role="tabpanel"
              aria-labelledby="tab-coaching"
              className="space-y-6"
            >
              {/* Grade Banner */}
              <div className="flex flex-wrap items-center justify-between p-5 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 gap-4 shadow-md">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-3xl font-black text-white shadow-xl ring-2 ring-white/10">
                    {coachingReport.overallGrade}
                  </div>
                  <div>
                    <div className="text-xl font-extrabold text-white flex items-center gap-2">
                      <span>{coachingReport.overallAccuracy}% Accuracy</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold">
                        Mastery Grade {coachingReport.overallGrade}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1 max-w-xl leading-relaxed">
                      {coachingReport.summaryMessage}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-2xl font-black text-cyan-400">+120 XP</div>
                    <div className="text-xs text-zinc-400 font-medium">🔥 5 Day Streak</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveMode("practice")}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs"
                  >
                    Start New Practice Run 🎹
                  </Button>
                </div>
              </div>

              {/* Bi-directional Timing Gauge */}
              <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                      Bi-directional Timing Gauge & Rhythm Drift
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Evaluates micro-timing bias in milliseconds against the metronomic grid
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold uppercase px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 ${
                      coachingReport.timing.globalClassification === "pocket"
                        ? "text-emerald-400"
                        : coachingReport.timing.globalClassification === "rushing"
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {coachingReport.timing.globalClassification === "pocket"
                      ? "🎯 Locked In The Pocket (±15ms)"
                      : coachingReport.timing.globalClassification === "rushing"
                      ? "⚡ Systematically Rushing Early"
                      : "⏳ Systematically Dragging Late"}
                  </span>
                </div>

                {/* Gauge Rail */}
                <div className="relative pt-4 pb-2 px-1">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-2 font-medium">
                    <span className="text-amber-400">◄ Rushing (-60ms Early)</span>
                    <span className="text-emerald-400 font-bold">Pocket (±15ms)</span>
                    <span className="text-rose-400">Dragging (+60ms Late) ►</span>
                  </div>

                  {/* Scale Track */}
                  <div className="h-3.5 rounded-full bg-zinc-900 border border-zinc-800 relative overflow-hidden flex shadow-inner">
                    <div className="w-[35%] bg-amber-500/20 border-r border-zinc-800" />
                    <div className="w-[30%] bg-emerald-500/25 border-r border-zinc-800" />
                    <div className="w-[35%] bg-rose-500/20" />
                  </div>

                  {/* Zero Mark Indicator */}
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-3.5 bg-zinc-400/50 pointer-events-none" />

                  {/* Indicator Pin */}
                  <div
                    data-testid="timing-gauge-pin"
                    className="absolute top-7 w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_12px_rgba(34,211,238,0.9)] -translate-x-1/2 transition-all duration-300"
                    style={{ left: `${pinPercent}%` }}
                    title={`Mean Timing Bias: ${coachingReport.timing.globalMeanBiasMs}ms`}
                  />

                  {/* Legend Stats */}
                  <div className="flex justify-between text-[11px] text-zinc-400 mt-2 font-mono">
                    <span>
                      Mean Bias:{" "}
                      <strong className="text-white">
                        {coachingReport.timing.globalMeanBiasMs > 0
                          ? `+${coachingReport.timing.globalMeanBiasMs}ms`
                          : `${coachingReport.timing.globalMeanBiasMs}ms`}
                      </strong>
                    </span>
                    <span>
                      Stability / Jitter (σ):{" "}
                      <strong className="text-white">
                        ±{coachingReport.timing.globalJitterMs}ms
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Hand Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
                    <span className="text-zinc-400 font-medium">Right Hand (Treble / Melody)</span>
                    <div className="text-base font-bold text-white mt-1">
                      {coachingReport.timing.rightHand.meanBiasMs > 0
                        ? `+${coachingReport.timing.rightHand.meanBiasMs}ms`
                        : `${coachingReport.timing.rightHand.meanBiasMs}ms`}
                      <span className="text-xs text-zinc-500 font-normal ml-2">
                        (Jitter: ±{coachingReport.timing.rightHand.jitterMs}ms •{" "}
                        {coachingReport.timing.rightHand.noteCount} notes)
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
                    <span className="text-zinc-400 font-medium">Left Hand (Bass / Harmony)</span>
                    <div className="text-base font-bold text-white mt-1">
                      {coachingReport.timing.leftHand.meanBiasMs > 0
                        ? `+${coachingReport.timing.leftHand.meanBiasMs}ms`
                        : `${coachingReport.timing.leftHand.meanBiasMs}ms`}
                      <span className="text-xs text-zinc-500 font-normal ml-2">
                        (Jitter: ±{coachingReport.timing.leftHand.jitterMs}ms •{" "}
                        {coachingReport.timing.leftHand.noteCount} notes)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Measure Accuracy Heatmap */}
              <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 shadow-sm">
                <MeasureHeatmap
                  measures={coachingReport.measures}
                  onDrillMeasure={handleApplyDrillFromMeasure}
                />
              </div>

              {/* Targeted Loop Drills */}
              <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 shadow-sm">
                <CoachRecommendations
                  drills={coachingReport.drills}
                  onApplyDrill={handleApplyDrill}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Unified Export Center Modal */}
      <ExportCenterModal
        open={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        projectId={activeSong.id}
        projectName={activeSong.title}
        durationSec={activeSongNoteData.duration_sec ?? activeSong.duration_sec}
        totalNotes={activeSongNoteData.notes.length}
        filteredNoteData={activeSongNoteData}
        settings={renderSettings}
      />
    </div>
  );
}
