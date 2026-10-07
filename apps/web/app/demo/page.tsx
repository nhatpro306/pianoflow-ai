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
  Search,
  X,
} from "lucide-react";
import type { RenderSettings } from "@pianoflow/shared-types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Keyboard } from "@/components/ui/Keyboard";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/ui/SegmentedControl";
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

type GenreFilterId =
  | "All"
  | "Anime & Ghibli"
  | "K-Pop"
  | "Modern & Pop"
  | "Cinematic & Game"
  | "Classical";

const GENRE_PILLS = [
  { id: "All" as const, label: "All", badge: "250" },
  { id: "Anime & Ghibli" as const, label: "🌸 Anime", badge: "50" },
  { id: "K-Pop" as const, label: "✨ K-Pop", badge: "50" },
  { id: "Modern & Pop" as const, label: "🔥 Pop", badge: "50" },
  { id: "Cinematic & Game" as const, label: "🎬 Cinema & Game", badge: "50" },
  { id: "Classical" as const, label: "🏛️ Classical", badge: "50" },
] as const;

const DEMO_MODES: SegmentedControlOption[] = [
  { id: "visualizer", label: "Falling Notes Visualizer 🎬", testId: "tab-visualizer" },
  { id: "practice", label: "Interactive Practice Mode 🎹", testId: "tab-practice" },
  { id: "sheet", label: "Grand Staff Sheet Music 🎼", testId: "tab-sheet" },
  { id: "coaching", label: "AI Coaching & Analytics 📊", testId: "tab-coaching" },
];

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

  // Expanded Repertoire Category Filter & Instant Search State
  const [selectedGenre, setSelectedGenre] = useState<GenreFilterId>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSongs = useMemo(() => {
    let list = DEMO_SONGS;
    if (selectedGenre !== "All") {
      list = list.filter((s) => s.genre === selectedGenre);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.composer.toLowerCase().includes(q) ||
          s.key.toLowerCase().includes(q) ||
          s.period.toLowerCase().includes(q) ||
          s.genre.toLowerCase().includes(q) ||
          s.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [selectedGenre, searchQuery]);

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
        <Badge variant="success" size="sm">
          Beginner
        </Badge>
      );
    }
    if (difficulty === "Intermediate") {
      return (
        <Badge variant="warning" size="sm">
          Intermediate
        </Badge>
      );
    }
    return (
      <Badge variant="accent" size="sm">
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
      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Sleek Sub-Header Action Strip (Replaces Duplicate Sticky Header) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-2">
                <span>🎹</span>
                <span>Interactive Classical Library Showcase</span>
              </h1>
              <Badge variant="accent" size="sm" className="hidden sm:inline-flex">
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
              variant="gradient"
              onClick={() => setIsExportOpen(true)}
              className="text-xs font-semibold gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Export & Share 🚀</span>
            </Button>
          </div>
        </div>

        {/* Multi-Genre Repertoire Catalog Strip (250 Pieces across 5 Genres) */}
        <section aria-labelledby="song-library-heading" className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2
                id="song-library-heading"
                className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5"
              >
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                <span>Multi-Genre Repertoire Library</span>
              </h2>
              <Badge variant="accent" size="sm" className="font-mono text-[10px]">
                {filteredSongs.length} of {DEMO_SONGS.length} Pieces
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 font-mono hidden md:inline">
                Selected: <strong className="text-zinc-200">{activeSong.title}</strong>
              </span>

              {/* Instant Search Input */}
              <div className="relative min-w-[200px] sm:min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  data-testid="repertoire-search-input"
                  placeholder="Search 250 pieces by title, artist, key..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-zinc-900 border border-white/10 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    data-testid="repertoire-search-clear"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Genre Category Pill Strip */}
          <div
            role="tablist"
            aria-label="Repertoire Genre Filter"
            className="flex items-center gap-1.5 p-1 rounded-xl bg-[#121215] border border-white/10 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800"
          >
            {GENRE_PILLS.map((pill) => {
              const isSelected = selectedGenre === pill.id;
              const testId = `genre-pill-${pill.id.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
              return (
                <button
                  key={pill.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-testid={testId}
                  onClick={() => setSelectedGenre(pill.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    isSelected
                      ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-md shadow-cyan-950/40 font-bold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80"
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? "bg-black/30 text-white font-bold"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    ({pill.badge})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Song Card Grid Container */}
          <div className="max-h-[460px] overflow-y-auto pr-1 -mr-1 rounded-2xl scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {filteredSongs.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs bg-[#121215]/50 rounded-2xl border border-white/5">
                <Music className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-zinc-300">No piano pieces match your search.</p>
                <p className="text-zinc-500 mt-0.5">Try searching for a different composer, anime, or piece title.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGenre("All");
                    setSearchQuery("");
                  }}
                  className="mt-3 px-3 py-1 rounded-lg bg-zinc-800 text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {filteredSongs.map((song) => {
                  const isSelected = song.id === activeSong.id;
                  return (
                    <button
                      key={song.id}
                      type="button"
                      data-testid={`song-card-${song.id}`}
                      onClick={() => handleSelectSong(song)}
                      className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                        isSelected
                          ? "ring-1 ring-cyan-500/50 border-cyan-500/50 bg-[#121215] shadow-lg shadow-cyan-950/30"
                          : "bg-[#121215] border-white/10 hover:border-white/20 hover:-translate-y-0.5 shadow-md"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-mono text-zinc-400">{song.period}</span>
                          {getDifficultyBadge(song.difficulty)}
                        </div>
                        <h3 className="font-bold text-base text-white group-hover:text-cyan-200 transition-colors flex items-center gap-1.5">
                          {isSelected && <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                          <span className="truncate">{song.title}</span>
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">{song.composer}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-zinc-400">
                        <span className="font-semibold text-zinc-300">{song.bpm} BPM</span>
                        <span>{song.time_signature}</span>
                        <span className="text-cyan-300 font-medium">{song.noteCount} notes</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 4-Mode Interactive Tab Bar */}
        <section aria-label="Demo Experience Modes">
          <SegmentedControl
            options={DEMO_MODES}
            value={activeMode}
            onChange={(val) => setActiveMode(val as DemoMode)}
            variant="gradient"
            size="md"
            ariaLabel="Demo interactive modes"
            className="w-full overflow-x-auto justify-start sm:justify-center"
          />
        </section>

        {/* Consolidated Workspace Toolbar (Metronome & Difficulty) */}
        <section
          aria-label="Workspace Controls"
          className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#121215] border border-white/10 text-xs shadow-md"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
              <span>⏱️</span>
              <span>Metronome Sync:</span>
            </span>
            <MetronomeControl
              initialBpm={activeSong.bpm}
              initialTimeSignature={activeSong.time_signature as TimeSignature}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <DifficultySelector
              value={difficulty}
              onChange={setDifficulty}
              stats={simplificationStats}
              compact
            />
            <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2 flex-wrap">
              <span>Piece: <strong className="text-zinc-200">{activeSong.title}</strong></span>
              <span>•</span>
              <span className="text-cyan-400 font-bold">{activeSong.bpm} BPM</span>
              <span>•</span>
              <span data-testid="active-song-note-count" className="text-zinc-300">
                {activeSongNoteData.notes.length} notes
              </span>
              <span>•</span>
              <span
                data-testid="active-song-voicing-status"
                className="font-medium text-zinc-300"
              >
                {difficulty === "original"
                  ? "100% Voicing"
                  : `${difficulty === "easy" ? "Easy" : "Very Easy"} (-${simplificationStats.reductionPercent}%)`}
              </span>
            </div>
          </div>
        </section>

        {/* Active Mode Viewport Panels */}
        <div className="rounded-2xl border border-white/10 bg-[#050507]/60 p-4 sm:p-6 shadow-2xl relative min-h-[560px]">
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
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#121215] border border-white/10 text-xs shadow-md">
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
                            ? "bg-cyan-500 text-zinc-950 shadow-sm"
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
                  <Badge variant="default" size="sm">
                    1080p 60FPS Neon
                  </Badge>
                </div>
              </div>

              {/* Obsidian Stage Well: Falling Note Canvas Component */}
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#050507] shadow-2xl relative">
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
              {/* Practice Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#121215] border border-white/10 shadow-md">
                <div className="flex items-center gap-2 flex-wrap">
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
                  <div className="flex items-center bg-zinc-900 border border-white/10 rounded-lg p-0.5 text-xs">
                    {(["both", "right", "left"] as const).map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHandMode(h)}
                        className={`px-2.5 py-1 rounded capitalize font-medium transition-colors ${
                          handMode === h
                            ? "bg-zinc-800 text-cyan-300 font-bold"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>

                  {/* Hit Counter Breakdown */}
                  <div className="hidden xl:flex items-center gap-3 pl-3 border-l border-white/10 text-xs font-mono">
                    <span className="text-emerald-400 font-semibold">
                      Perfect: {stats.perfectHits}
                    </span>
                    <span className="text-amber-400 font-semibold">Good: {stats.goodHits}</span>
                    <span className="text-rose-400 font-semibold">Miss: {stats.missHits}</span>
                  </div>
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

              {/* Obsidian Stage Well: Practice Falling Notes Canvas */}
              <div className="h-64 sm:h-72 w-full bg-[#050507] rounded-2xl border border-white/10 overflow-hidden relative shadow-2xl">
                {/* Floating Frosted-Glass Performance HUD */}
                <div className="absolute top-4 right-4 z-20 pointer-events-none flex items-center gap-3">
                  <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-zinc-950/80 backdrop-blur-md border border-white/10 shadow-xl">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Score</span>
                      <span data-testid="score-counter" className="text-xl font-black text-white tracking-tight tabular-nums">
                        {stats.score.toLocaleString()}
                      </span>
                    </div>
                    <div className="border-l border-white/10 pl-3">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Accuracy</span>
                      <span data-testid="accuracy-badge" className="text-xl font-black text-cyan-400 tracking-tight tabular-nums">
                        {stats.accuracy}%
                      </span>
                    </div>
                    <div className="border-l border-white/10 pl-3">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Combo</span>
                      <span data-testid="combo-streak" className="text-xl font-black text-amber-400 flex items-center gap-1 tabular-nums">
                        {stats.combo}x <Flame className="w-4 h-4 text-amber-400" />
                      </span>
                    </div>
                  </div>
                </div>

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

              {/* Obsidian Stage Well: Interactive Virtual Keyboard */}
              <div className="bg-[#050507] rounded-2xl border border-white/10 p-3 shadow-2xl relative overflow-hidden">
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
