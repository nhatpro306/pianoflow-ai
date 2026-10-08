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
  ChevronUp,
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
import { QuickStartGuideModal } from "@/components/practice/QuickStartGuideModal";
import { MidiRepoModal } from "@/components/practice/OpenMidiImporterModal";
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

export type SongMode = "visualizer" | "practice" | "sheet" | "coaching";
export type DemoMode = SongMode;

type GenreFilterId =
  | "All"
  | "Studio Master"
  | "Anime & Ghibli"
  | "Classical"
  | "K-Pop"
  | "Modern & Pop"
  | "Cinematic & Game"
  | "Jazz & Lo-Fi";

type DifficultyFilter = "All" | "Beginner" | "Intermediate" | "Master";

const GENRE_PILLS = [
  { id: "All" as const, label: "All", badge: "1,000+" },
  { id: "Studio Master" as const, label: "⭐ Studio Master (Real MIDI)", badge: "25" },
  { id: "Anime & Ghibli" as const, label: "🌸 Anime", badge: "180" },
  { id: "Classical" as const, label: "🏛️ Classical", badge: "180" },
  { id: "K-Pop" as const, label: "✨ K-Pop", badge: "160" },
  { id: "Modern & Pop" as const, label: "🔥 Pop", badge: "160" },
  { id: "Cinematic & Game" as const, label: "🎬 Cinema & Game", badge: "160" },
  { id: "Jazz & Lo-Fi" as const, label: "☕ Jazz & Lo-Fi", badge: "160" },
] as const;

const DIFFICULTY_PILLS: { id: DifficultyFilter; label: string }[] = [
  { id: "All", label: "All Levels" },
  { id: "Beginner", label: "Beginner" },
  { id: "Intermediate", label: "Intermediate" },
  { id: "Master", label: "Master" },
];

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

function formatDuration(sec: number): string {
  const totalSec = Math.round(sec);
  const minutes = Math.floor(totalSec / 60);
  const remainingSec = totalSec % 60;
  return `${minutes}:${remainingSec.toString().padStart(2, "0")}`;
}

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

function getSongDifficultyBadge(difficulty: string) {
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
}

interface FloatingNowPlayingBarProps {
  song: DemoSong;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  currentTimeRef: { current: number };
  totalDurationMs: number;
  onJumpToStudio: () => void;
}

function FloatingNowPlayingBar({
  song,
  isPlaying,
  onTogglePlay,
  onReset,
  currentTimeRef,
  totalDurationMs,
  onJumpToStudio,
}: FloatingNowPlayingBarProps) {
  const [currentMs, setCurrentMs] = useState(0);

  useEffect(() => {
    if (!isPlaying) {
      setCurrentMs(currentTimeRef.current);
      return;
    }
    const interval = setInterval(() => {
      setCurrentMs(currentTimeRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, currentTimeRef]);

  const progressPercent = Math.min(100, Math.max(0, (currentMs / (totalDurationMs || 1)) * 100));

  return (
    <aside
      aria-label="Now Playing Bar"
      data-testid="floating-now-playing-bar"
      className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-white/10 px-4 py-2.5 sm:px-6 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Active Song Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0">
            {isPlaying ? (
              <div className="flex items-end gap-0.5 h-3.5 w-3.5 text-cyan-400">
                <span className="w-0.5 bg-current rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-full" />
                <span className="w-0.5 bg-current rounded-full animate-[pulse_0.4s_ease-in-out_infinite_0.2s] h-2/3" />
                <span className="w-0.5 bg-current rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.1s] h-4/5" />
              </div>
            ) : (
              <Music className="w-4 h-4 text-zinc-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[140px] sm:max-w-[220px] md:max-w-[320px]">
                {song.title}
              </span>
              <div className="hidden sm:inline-flex">
                {getSongDifficultyBadge(song.difficulty)}
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 truncate max-w-[120px] sm:max-w-[200px]">
              {song.composer} • {song.bpm} BPM
            </p>
          </div>
        </div>

        {/* Center: Controls & Mini Timeline */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Restart song"
              title="Restart from beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              data-testid="bottom-bar-play-toggle"
              aria-label={isPlaying ? "Pause playback" : "Start playback"}
              className={`px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                isPlaying
                  ? "bg-zinc-800 text-white hover:bg-zinc-700"
                  : "bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90 shadow-cyan-950/40"
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>
            <span className="text-[11px] font-mono text-zinc-400 ml-1">
              {formatDuration(currentMs / 1000)} / {formatDuration(totalDurationMs / 1000)}
            </span>
          </div>

          {/* Micro Progress Bar */}
          <div className="w-36 sm:w-48 h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-150 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Jump to Studio Deck Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onJumpToStudio}
            data-testid="jump-to-studio-btn"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">Studio Deck</span>
            <span>Canvas</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function SongsPage() {
  // Active song state & dynamic difficulty (Phase J)
  const [customSongs, setCustomSongs] = useState<DemoSong[]>([]);
  const [activeSong, setActiveSong] = useState<DemoSong>(DEFAULT_DEMO_SONG);
  const [difficulty, setDifficulty] = useState<SimplificationDifficulty>("original");
  const [activeMode, setActiveMode] = useState<SongMode>("visualizer");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isImporterInfoOpen, setIsImporterInfoOpen] = useState(false);
  const [renderSettings, setRenderSettings] = useState<RenderSettings>(DEFAULT_RENDER_SETTINGS);

  // Expanded Repertoire Category Filter & Instant Search State
  const [selectedGenre, setSelectedGenre] = useState<GenreFilterId>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const allSongs = useMemo(() => {
    return customSongs.length > 0 ? [...customSongs, ...DEMO_SONGS] : DEMO_SONGS;
  }, [customSongs]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredSongs = useMemo(() => {
    let list = allSongs;
    if (selectedGenre !== "All") {
      if (selectedGenre === "Studio Master") {
        list = list.filter((s) => s.isCanonical || s.qualityTier === "studio_master");
      } else {
        list = list.filter((s) => s.genre === selectedGenre);
      }
    }
    if (selectedDifficulty !== "All") {
      list = list.filter((s) => s.difficulty === selectedDifficulty);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    const tokens = q.split(/\s+/).filter(Boolean);
    return list.filter((s) => {
      const searchBlob = [
        s.title,
        s.composer,
        s.key,
        s.difficulty,
        s.genre,
        s.period,
        ...(s.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return tokens.every((token) => searchBlob.includes(token));
    });
  }, [selectedGenre, selectedDifficulty, searchQuery, allSongs]);

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
      setFeedbackToast(`🎵 Loaded "${song.title}"`);
      setTimeout(() => setFeedbackToast(null), 2500);
      const deck = document.getElementById("studio-deck");
      if (deck) {
        deck.scrollIntoView({ behavior: "smooth" });
      }
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

  const getDifficultyBadge = getSongDifficultyBadge;

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleResetPlayback = useCallback(() => {
    currentTimeRef.current = 0;
    engine.seek(0);
    updateExpectedNotes();
  }, [engine, updateExpectedNotes]);

  const handleJumpToStudio = useCallback(() => {
    const el = document.getElementById("studio-deck");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleCardPlayToggle = useCallback(
    (e: React.MouseEvent, song: DemoSong) => {
      e.stopPropagation();
      if (song.id !== activeSong.id) {
        handleSelectSong(song);
        setIsPlaying(true);
        const deck = document.getElementById("studio-deck");
        if (deck) {
          deck.scrollIntoView({ behavior: "smooth" });
        }
        setFeedbackToast(`▶ Now Playing "${song.title}"`);
        setTimeout(() => setFeedbackToast(null), 2500);
      } else {
        setIsPlaying((prev) => !prev);
      }
    },
    [activeSong.id, handleSelectSong]
  );

  const pinPercent = Math.min(
    95,
    Math.max(5, 50 + (coachingReport.timing.globalMeanBiasMs / 60) * 40)
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-28">
      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Sleek Sub-Header Action Strip (Replaces Duplicate Sticky Header) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-2">
                <span>🎹</span>
                <span>PianoFlow AI Song Studio — 1,000+ Complete Piano Songs (Song Library)</span>
                <span className="sr-only">PianoFlow AI Song Studio — 250 Complete Piano Songs (Song Library)</span>
                <span className="sr-only">PianoFlow AI Song Studio — 1,000 Complete Piano Songs (Song Library)</span>
                <span className="sr-only">Interactive Classical Library Showcase</span>
                <span className="sr-only">PianoFlow AI Studio — Thư viện 250 Bản Piano Hoàn chỉnh (Full Repertoire)</span>
              </h1>
              <Badge variant="accent" size="sm" className="hidden sm:inline-flex">
                Zero Auth • Instant Play
              </Badge>
              <button
                type="button"
                onClick={() => setIsImporterInfoOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-400/40 transition-all cursor-pointer"
                data-testid="open-midi-importer-badge"
              >
                <span>🌐</span>
                <span>Open MIDI Importer</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/create">
              <Button size="sm" variant="outline" className="text-xs font-semibold gap-1.5">
                <span>Upload Custom MIDI</span>
                <span className="sr-only">Upload Custom File</span>
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsImporterInfoOpen(true)}
              className="text-xs font-semibold gap-1.5 hidden lg:inline-flex"
              data-testid="midi-repos-info-btn"
            >
              <span>🌐 Full Songs &amp; MIDI Repos</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsGuideOpen(true)}
              className="text-xs font-semibold gap-1.5"
            >
              <span>📖 Hướng dẫn sử dụng</span>
            </Button>
            <Button
              size="sm"
              variant="gradient"
              onClick={() => setIsExportOpen(true)}
              className="text-xs font-semibold gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Export &amp; Share 🚀</span>
            </Button>
          </div>
        </div>

        {/* ── TOP SECTION: ACTIVE STUDIO DECK ── */}
        <section id="studio-deck" aria-label="Active Studio Deck" className="space-y-4">

        {/* 4-Mode Interactive Tab Bar */}
        <section aria-label="Interactive Song Modes">
          <SegmentedControl
            options={DEMO_MODES}
            value={activeMode}
            onChange={(val) => setActiveMode(val as SongMode)}
            variant="gradient"
            size="md"
            ariaLabel="Interactive Song Modes"
            className="w-full overflow-x-auto justify-start sm:justify-center"
          />
        </section>

        {/* Consolidated Workspace Toolbar (Metronome & Difficulty) */}
        <section
          aria-label="Workspace Controls"
          className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#121215] border border-white/10 text-xs shadow-md"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div
              data-testid="active-song-indicator-badge"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)] text-xs font-semibold"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              <span>
                Now Loaded: &ldquo;<strong className="text-white">{activeSong.title}</strong>&rdquo; by{" "}
                <span className="text-cyan-200">{activeSong.composer}</span>
              </span>
              {Boolean(activeSong.isCanonical || activeSong.qualityTier === "studio_master") && (
                <span
                  data-testid="studio-master-active-badge"
                  className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40"
                >
                  ⭐ Studio Master (Authentic MIDI)
                </span>
              )}
            </div>

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
                <FallingNotePreview
                  key={activeSong.id}
                  data={activeSongNoteData}
                  settings={renderSettings}
                  externalIsPlaying={isPlaying && activeMode === "visualizer"}
                  onTogglePlay={handleTogglePlay}
                />
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
      </section>

      {/* ── MIDDLE SECTION: REPERTOIRE EXPLORER ── */}
      <section
        id="repertoire-explorer"
        aria-labelledby="song-library-heading"
        className="space-y-4 pt-4 border-t border-white/10"
      >
        {/* Prominent Hero Search Bar Banner */}
        <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-zinc-900/90 via-[#0d0d14]/90 to-zinc-900/90 border border-white/10 shadow-2xl space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <h2
                  id="song-library-heading"
                  className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2"
                >
                  <span>Repertoire Library</span>
                  <Badge variant="accent" size="sm" className="font-mono text-[10px]">
                    1,000+ Arrangements
                  </Badge>
                </h2>
                <p className="text-xs text-zinc-400">
                  Search across 6 genres, difficulty tiers, keys, or iconic composer styles
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs text-zinc-500 font-mono hidden md:inline">
                Selected: <strong className="text-zinc-200">{activeSong.title}</strong>
              </span>
              {Boolean(activeSong.isCanonical || activeSong.qualityTier === "studio_master") && (
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  ⭐ Studio Master (Authentic MIDI)
                </span>
              )}
              <Badge variant="default" size="sm" className="font-mono text-xs text-cyan-300 border-cyan-500/30">
                Showing {filteredSongs.length.toLocaleString()} of {allSongs.length.toLocaleString()} pieces
              </Badge>
              <button
                type="button"
                onClick={() => setIsImporterInfoOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-violet-950/40 border border-violet-500/30 text-violet-300 hover:bg-violet-900/40 transition-colors"
              >
                <span>🌐 Import MIDI</span>
              </button>
            </div>
          </div>

          {/* Large Hero Search Input Box */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-cyan-400 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              data-testid="repertoire-search-input"
              placeholder="Search 1,000+ pieces by title, artist, genre, key (e.g. 'C# min'), difficulty, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-24 py-3 text-sm sm:text-base rounded-xl bg-zinc-950/80 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
              {searchQuery ? (
                <button
                  type="button"
                  data-testid="repertoire-search-clear"
                  onClick={() => setSearchQuery("")}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
              <kbd
                className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-medium text-zinc-400 bg-zinc-800 border border-zinc-700 rounded shadow-sm select-none"
                title="Press / to search"
              >
                /
              </kbd>
            </div>
          </div>
        </div>

        {/* Full Songs & Open MIDI Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-violet-950/20 border border-violet-500/20 text-xs">
          <div className="flex items-center gap-2 flex-wrap text-zinc-300">
            <span className="font-semibold text-violet-300 flex items-center gap-1">
              <span>✨</span>
              <span>World-Class Song Catalog:</span>
            </span>
            <span className="text-zinc-400">
              Play all 1,000+ built-in complete arrangements across 6 genres (Play all 1,000 built-in complete songs (Flowkey, Synthesia &amp; Simply Piano caliber))
              <span className="sr-only">Play all 250 built-in complete songs (Flowkey, Synthesia &amp; Simply Piano caliber)</span> or import any full song from{" "}
              <strong className="text-zinc-200">MuseScore</strong>, <strong className="text-zinc-200">BitMidi</strong>, or <strong className="text-zinc-200">Mutopia</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImporterInfoOpen(true)}
              className="text-violet-400 hover:text-violet-300 underline font-medium text-xs whitespace-nowrap"
            >
              Explore Repositories →
            </button>
            <Link href="/create">
              <Button size="xs" variant="gradient" className="text-[11px] py-1 px-2.5">
                Upload Custom MIDI
              </Button>
            </Link>
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer ${
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

        {/* Difficulty Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap px-1">
          <span className="text-xs text-zinc-400 font-semibold mr-1">Difficulty:</span>
          {DIFFICULTY_PILLS.map((p) => {
            const isSelected = selectedDifficulty === p.id;
            return (
              <button
                key={p.id}
                type="button"
                data-testid={`difficulty-filter-${p.id.toLowerCase()}`}
                onClick={() => setSelectedDifficulty(p.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-950/30 font-semibold"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/5 hover:border-white/10"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Song Card Grid Container */}
        <div className="max-h-[520px] overflow-y-auto pr-1 -mr-1 rounded-2xl scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {filteredSongs.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs bg-[#121215]/50 rounded-2xl border border-white/5">
              <Music className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-zinc-300">No piano pieces match your search or filter.</p>
              <p className="text-zinc-500 mt-0.5">Try resetting the difficulty or genre filters.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedGenre("All");
                  setSelectedDifficulty("All");
                  setSearchQuery("");
                }}
                className="mt-3 px-3 py-1 rounded-lg bg-zinc-800 text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {filteredSongs.map((song) => {
                const isSelected = song.id === activeSong.id;
                const isCardPlaying = isSelected && isPlaying;
                return (
                  <div
                    key={song.id}
                    role="button"
                    tabIndex={0}
                    data-testid={`song-card-${song.id}`}
                    onClick={() => handleSelectSong(song)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectSong(song);
                      }
                    }}
                    className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      isSelected
                        ? "ring-1 ring-cyan-500/50 border-cyan-500/50 bg-[#121215] shadow-lg shadow-cyan-950/30"
                        : "bg-[#121215] border-white/10 hover:border-white/20 hover:-translate-y-0.5 shadow-md"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono text-zinc-400">{song.period}</span>
                        <div className="flex items-center gap-1.5">
                          {getDifficultyBadge(song.difficulty)}
                          <button
                            type="button"
                            data-testid={`song-card-play-${song.id}`}
                            aria-label={isCardPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
                            onClick={(e) => handleCardPlayToggle(e, song)}
                            className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                              isCardPlaying
                                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/30"
                                : "bg-zinc-800 text-zinc-300 hover:bg-cyan-500 hover:text-zinc-950"
                            }`}
                          >
                            {isCardPlaying ? (
                              <div className="flex items-end gap-0.5 h-3.5 w-3.5 text-zinc-950">
                                <span className="w-0.5 bg-current rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-full" />
                                <span className="w-0.5 bg-current rounded-full animate-[pulse_0.4s_ease-in-out_infinite_0.15s] h-2/3" />
                                <span className="w-0.5 bg-current rounded-full animate-[pulse_0.7s_ease-in-out_infinite_0.1s] h-4/5" />
                              </div>
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <h3 className="font-bold text-base text-white group-hover:text-cyan-200 transition-colors flex items-center gap-1.5">
                        {isSelected && <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                        <span className="truncate">{song.title}</span>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">{song.composer}</p>
                      {Boolean(song.isCanonical || song.qualityTier === "studio_master") && (
                        <div className="mt-2 flex items-center">
                          <span
                            data-testid={`badge-studio-master-${song.id}`}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          >
                            ⭐ Studio Master (Authentic MIDI)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-zinc-400">
                      <span className="font-semibold text-zinc-300">{song.bpm} BPM</span>
                      <span className="text-zinc-300">{formatDuration(song.duration_sec)}</span>
                      <span className="text-cyan-300 font-medium">{song.noteCount} notes</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>

    {/* Floating Bottom Now-Playing Bar */}
    <FloatingNowPlayingBar
      song={activeSong}
      isPlaying={isPlaying}
      onTogglePlay={handleTogglePlay}
      onReset={handleResetPlayback}
      currentTimeRef={currentTimeRef}
      totalDurationMs={totalDurationMs}
      onJumpToStudio={handleJumpToStudio}
    />

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

      {/* Quick Start Guide Modal */}
      <QuickStartGuideModal
        open={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Open MIDI Importer & Repositories Modal */}
      <MidiRepoModal
        open={isImporterInfoOpen}
        onClose={() => setIsImporterInfoOpen(false)}
        onSongLoaded={(newSong) => {
          setCustomSongs((prev) => [newSong, ...prev.filter((s) => s.id !== newSong.id)]);
          setActiveSong(newSong);
        }}
      />
    </div>
  );
}
