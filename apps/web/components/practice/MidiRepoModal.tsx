"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Globe,
  Music,
  UploadCloud,
  ExternalLink,
  Trophy,
  CheckCircle2,
  Link as LinkIcon,
  AlertCircle,
  Loader2,
  FileMusic,
  Sparkles,
  Zap,
} from "lucide-react";
import { parseMidiBytes } from "@/lib/midi/midiParser";
import type { DemoSong } from "@/lib/demoSongs";
import type { NoteData } from "@pianoflow/shared-types";

export interface MidiRepoModalProps {
  open: boolean;
  onClose: () => void;
  onSongLoaded?: (song: DemoSong) => void;
}

interface FeaturedMidiItem {
  id: string;
  canonicalId: string;
  title: string;
  composer: string;
  source: "Mutopia Project" | "Kunst der Fuge" | "VGMusic" | "BitMidi";
  genre: "Classical" | "Cinematic & Game" | "Modern & Pop" | "Anime & Ghibli";
  difficulty: "Beginner" | "Intermediate" | "Master";
  noteCountApprox: number;
  durationLabel: string;
  externalUrl: string;
  sourceColor: string;
}

const FEATURED_DIRECT_MIDI_ITEMS: FeaturedMidiItem[] = [
  // Mutopia Project
  {
    id: "mutopia-bach-prelude",
    canonicalId: "bach-prelude-c-major",
    title: "Prelude in C Major (BWV 846)",
    composer: "Johann Sebastian Bach",
    source: "Mutopia Project",
    genre: "Classical",
    difficulty: "Beginner",
    noteCountApprox: 559,
    durationLabel: "2:03",
    externalUrl: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=BWV846",
    sourceColor: "border-sky-500/30 text-sky-400 bg-sky-950/30",
  },
  {
    id: "mutopia-moonlight-3rd",
    canonicalId: "moonlight-sonata-3rd",
    title: "Moonlight Sonata (Presto Agitato - 3rd Mvt)",
    composer: "Ludwig van Beethoven",
    source: "Mutopia Project",
    genre: "Classical",
    difficulty: "Master",
    noteCountApprox: 3365,
    durationLabel: "3:02",
    externalUrl: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=BeethovenLv-Moonlight",
    sourceColor: "border-sky-500/30 text-sky-400 bg-sky-950/30",
  },
  // Kunst der Fuge
  {
    id: "kdf-debussy-arabesque",
    canonicalId: "debussy-arabesque-1",
    title: "Première Arabesque (L. 66)",
    composer: "Claude Debussy",
    source: "Kunst der Fuge",
    genre: "Classical",
    difficulty: "Master",
    noteCountApprox: 2800,
    durationLabel: "4:48",
    externalUrl: "https://www.kunstderfuge.com/debussy.htm",
    sourceColor: "border-amber-500/30 text-amber-400 bg-amber-950/30",
  },
  {
    id: "kdf-chopin-waltz-aminor",
    canonicalId: "chopin-waltz-in-a-minor",
    title: "Waltz in A Minor (B. 150)",
    composer: "Frédéric Chopin",
    source: "Kunst der Fuge",
    genre: "Classical",
    difficulty: "Intermediate",
    noteCountApprox: 1717,
    durationLabel: "3:14",
    externalUrl: "https://www.kunstderfuge.com/chopin.htm",
    sourceColor: "border-amber-500/30 text-amber-400 bg-amber-950/30",
  },
  // VGMusic
  {
    id: "vgmusic-mario",
    canonicalId: "super-mario-theme",
    title: "Super Mario Bros. (Overworld Theme)",
    composer: "Koji Kondo",
    source: "VGMusic",
    genre: "Cinematic & Game",
    difficulty: "Beginner",
    noteCountApprox: 1517,
    durationLabel: "2:13",
    externalUrl: "https://www.vgmusic.com/music/console/nintendo/nes/",
    sourceColor: "border-emerald-500/30 text-emerald-400 bg-emerald-950/30",
  },
  {
    id: "vgmusic-zelda",
    canonicalId: "zelda-lullaby",
    title: "The Legend of Zelda (Zelda's Lullaby)",
    composer: "Koji Kondo",
    source: "VGMusic",
    genre: "Cinematic & Game",
    difficulty: "Beginner",
    noteCountApprox: 1211,
    durationLabel: "3:03",
    externalUrl: "https://www.vgmusic.com/music/console/nintendo/n64/",
    sourceColor: "border-emerald-500/30 text-emerald-400 bg-emerald-950/30",
  },
  {
    id: "vgmusic-megalovania",
    canonicalId: "megalovania",
    title: "Undertale (Megalovania - Sans Boss)",
    composer: "Toby Fox",
    source: "VGMusic",
    genre: "Cinematic & Game",
    difficulty: "Master",
    noteCountApprox: 1935,
    durationLabel: "3:03",
    externalUrl: "https://www.vgmusic.com/music/other/miscellaneous/piano/",
    sourceColor: "border-emerald-500/30 text-emerald-400 bg-emerald-950/30",
  },
  // BitMidi
  {
    id: "bitmidi-bohemian",
    canonicalId: "bohemian-rhapsody",
    title: "Bohemian Rhapsody (Concert Piano)",
    composer: "Freddie Mercury (Queen)",
    source: "BitMidi",
    genre: "Modern & Pop",
    difficulty: "Intermediate",
    noteCountApprox: 1886,
    durationLabel: "4:38",
    externalUrl: "https://bitmidi.com/queen-bohemian-rhapsody-mid",
    sourceColor: "border-violet-500/30 text-violet-400 bg-violet-950/30",
  },
  {
    id: "bitmidi-golden-hour",
    canonicalId: "golden-hour",
    title: "Golden Hour (Virtuosic Cascades)",
    composer: "JVKE",
    source: "BitMidi",
    genre: "Modern & Pop",
    difficulty: "Master",
    noteCountApprox: 2605,
    durationLabel: "3:53",
    externalUrl: "https://bitmidi.com/jvke-golden-hour-mid",
    sourceColor: "border-violet-500/30 text-violet-400 bg-violet-950/30",
  },
  {
    id: "bitmidi-pirates",
    canonicalId: "he-is-a-pirate",
    title: "Pirates of the Caribbean (He's a Pirate)",
    composer: "Klaus Badelt & Hans Zimmer",
    source: "BitMidi",
    genre: "Cinematic & Game",
    difficulty: "Master",
    noteCountApprox: 2309,
    durationLabel: "2:23",
    externalUrl: "https://bitmidi.com/pirates-of-the-caribbean-hes-a-pirate-mid",
    sourceColor: "border-violet-500/30 text-violet-400 bg-violet-950/30",
  },
];

export function MidiRepoModal({
  open,
  onClose,
  onSongLoaded,
}: MidiRepoModalProps) {
  const [urlInput, setUrlInput] = useState("");
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleProcessMidiBytes = (
    bytes: ArrayBuffer,
    fileName: string,
    composerName = "Imported Repertoire"
  ) => {
    try {
      const noteData = parseMidiBytes(bytes);
      const cleanTitle = fileName
        .replace(/\.(mid|midi)$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const importedSong: DemoSong = {
        id: `imported-${Date.now()}-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        title: cleanTitle,
        composer: composerName,
        period: "Contemporary",
        genre: "Modern & Pop",
        difficulty:
          noteData.notes.length > 500
            ? "Master"
            : noteData.notes.length > 200
            ? "Intermediate"
            : "Beginner",
        bpm: noteData.bpm,
        time_signature: noteData.time_signature,
        key: "C maj",
        duration_sec: noteData.duration_sec,
        description: `Imported studio MIDI with ${noteData.notes.length} notes, dual-hand separation, and velocity dynamics.`,
        coverGradient: "from-cyan-600/30 via-zinc-900 to-zinc-950 border-cyan-500/40",
        noteCount: noteData.notes.length,
        tags: ["Imported", "MIDI", "Custom Repertoire"],
        isCanonical: true,
        qualityTier: "studio_master",
        noteData,
      };

      setSuccessMessage(
        `Successfully imported "${cleanTitle}" (${noteData.notes.length} notes)! Loading into studio...`
      );
      setErrorMessage(null);

      setTimeout(() => {
        onSongLoaded?.(importedSong);
        onClose();
        setSuccessMessage(null);
      }, 700);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to parse MIDI file: ${message}`);
      setSuccessMessage(null);
    } finally {
      setIsLoading(false);
      setLoadingItemId(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      if (buffer) {
        handleProcessMidiBytes(buffer, file.name, "Local MIDI File");
      }
    };
    reader.onerror = () => {
      setErrorMessage("Could not read local file. Please try again.");
      setIsLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFetchUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMessage("Please enter a valid MIDI file URL (.mid or .midi)");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(trimmed);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }
      const buffer = await res.arrayBuffer();
      const filename = trimmed.split("/").pop() || "Web Import.mid";
      handleProcessMidiBytes(buffer, filename, "Web MIDI Repository");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(
        `Could not fetch MIDI from URL. Note that some websites block direct browser access (CORS). Try downloading the .mid file and uploading it directly: ${message}`
      );
      setIsLoading(false);
    }
  };

  const handleLoadFeaturedPiece = async (item: FeaturedMidiItem) => {
    setIsLoading(true);
    setLoadingItemId(item.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/songs/data/${item.canonicalId}.json`);
      if (!res.ok) {
        throw new Error(`Could not load studio dataset for ${item.title}`);
      }
      const noteData = (await res.json()) as NoteData;

      const importedSong: DemoSong = {
        id: `featured-${item.canonicalId}-${Date.now()}`,
        title: item.title,
        composer: item.composer,
        period: "Classic",
        genre: item.genre,
        difficulty: item.difficulty,
        bpm: noteData.bpm,
        time_signature: noteData.time_signature,
        key: "C maj",
        duration_sec: noteData.duration_sec,
        description: `Authentic ${item.source} Studio Master arrangement with ${noteData.notes.length} notes, dual-hand separation, and full polyphonic wait mode.`,
        coverGradient: "from-cyan-600/35 via-zinc-900 to-zinc-950 border-cyan-500/40",
        noteCount: noteData.notes.length,
        tags: [item.source, "Direct Ingestion", "Studio Master", "Curated MIDI"],
        isCanonical: true,
        qualityTier: "studio_master",
        noteData,
      };

      setSuccessMessage(
        `Loaded "${item.title}" from ${item.source} (${noteData.notes.length} notes, ${item.durationLabel})! Opening studio...`
      );

      setTimeout(() => {
        onSongLoaded?.(importedSong);
        onClose();
        setSuccessMessage(null);
      }, 600);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to load featured MIDI piece: ${message}`);
    } finally {
      setIsLoading(false);
      setLoadingItemId(null);
    }
  };

  const filteredFeaturedItems =
    selectedSourceFilter === "All"
      ? FEATURED_DIRECT_MIDI_ITEMS
      : FEATURED_DIRECT_MIDI_ITEMS.filter((i) => i.source === selectedSourceFilter);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="🌐 Song Library & Multi-Platform MIDI Repertoire Ingestion"
      className="max-w-4xl"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
        {/* Intro Banner */}
        <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-500/20 space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-sm font-bold text-zinc-100">
              World-Class Full Song Learning Benchmark
            </h3>
            <Badge variant="accent" size="sm" className="text-[10px]">
              Flowkey • Synthesia • Simply Piano
            </Badge>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Every piece in PianoFlow AI is a{" "}
            <strong>complete, authentic piano arrangement</strong> with left-and-right hand
            separation, 60 FPS waterfall visuals, polyphonic wait mode, and vector sheet music.
          </p>
        </div>

        {/* Live MIDI Importer Tools (File & URL) */}
        <div className="p-4 rounded-xl bg-zinc-900/90 border border-cyan-500/30 space-y-4 shadow-lg shadow-cyan-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileMusic className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-white">
                Direct MIDI Importer (Visualizer &amp; Practice Studio)
              </h4>
            </div>
            <Badge variant="default" size="sm" className="font-mono text-[10px] text-cyan-300">
              Instant 60 FPS
            </Badge>
          </div>

          {/* Upload Button & Hidden Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mid,.midi"
                onChange={handleFileUpload}
                className="hidden"
                id="midi-file-upload-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-900/30 text-cyan-200 transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <UploadCloud className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold">
                  {isLoading && !loadingItemId ? "Processing MIDI..." : "Choose Local .mid / .midi File"}
                </span>
              </button>
            </div>

            {/* Paste URL */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <LinkIcon className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="https://example.com/song.mid"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFetchUrl();
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-black/60 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <Button
                type="button"
                variant="gradient"
                size="sm"
                onClick={handleFetchUrl}
                disabled={isLoading || !urlInput.trim()}
                className="shrink-0 text-xs py-2.5"
              >
                {isLoading && !loadingItemId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Load URL"
                )}
              </Button>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 flex items-start gap-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Featured Direct MIDI Links (1-Click Instant Studio Ingestion) */}
        <div className="space-y-3 p-4 rounded-xl bg-zinc-900/60 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-zinc-100">
                Featured Direct MIDI Links (1-Click Studio Ingestion)
              </h4>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {["All", "Mutopia Project", "Kunst der Fuge", "VGMusic", "BitMidi"].map((source) => (
                <button
                  key={source}
                  type="button"
                  onClick={() => setSelectedSourceFilter(source)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    selectedSourceFilter === source
                      ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                  }`}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {filteredFeaturedItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-black/40 border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-zinc-100 group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-zinc-400">{item.composer}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-mono border shrink-0 ${item.sourceColor}`}
                  >
                    {item.source}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                    <span>{item.noteCountApprox} nốt</span>
                    <span>•</span>
                    <span>{item.durationLabel}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={item.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`View on ${item.source}`}
                      className="p-1 rounded-md text-zinc-500 hover:text-cyan-400 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <Button
                      type="button"
                      variant="gradient"
                      size="sm"
                      onClick={() => handleLoadFeaturedPiece(item)}
                      disabled={isLoading}
                      className="text-[10px] py-1 px-2.5 h-7 gap-1"
                    >
                      {loadingItemId === item.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Zap className="w-3 h-3 text-amber-300" />
                      )}
                      <span>1-Click Load</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card 1: 1,000+ Complete Pieces */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 hover:border-cyan-500/30 transition-all space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Music className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-zinc-100">
                  1. 1,000+ Repertoire Pieces
                </h4>
              </div>
              <Badge variant="accent" size="sm" className="text-[10px]">
                6 Genres
              </Badge>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Play complete concert pieces across 6 rich genres: <strong>Anime &amp; Ghibli</strong>,{" "}
              <strong>Classical Masterpieces</strong>, <strong>K-Pop</strong>, <strong>Modern &amp; Pop</strong>,{" "}
              <strong>Cinematic &amp; Game</strong>, and <strong>Jazz &amp; Lo-Fi</strong>.
            </p>
            <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
              <li>44+ Authentic Studio Master Landmark Pieces</li>
              <li>Real-time voicing reduction to Easy (-25%) &amp; Very Easy (-45%)</li>
              <li>Instant practice studio with zero registration required</li>
            </ul>
          </div>

          {/* Card 2: Open MIDI Importer */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 hover:border-violet-500/30 transition-all space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-zinc-100">
                  2. Open MIDI Importer
                </h4>
              </div>
              <Badge variant="accent" size="sm" className="text-[10px]">
                Unlimited
              </Badge>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Have a favorite song not in the library? Import any standard <code className="text-cyan-300 bg-black/40 px-1 py-0.5 rounded">.mid</code> or <code className="text-cyan-300 bg-black/40 px-1 py-0.5 rounded">.midi</code> file from your computer or the web.
            </p>
            <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
              <li>Automatic hand separation &amp; tempo detection</li>
              <li>Dual staff vector notation &amp; waterfall rendering</li>
              <li>Interactive wait mode with acoustic feedback</li>
            </ul>
          </div>
        </div>

        {/* Repositories Directory */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Recommended Free Song &amp; MIDI Repositories
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Repo 1: Mutopia */}
            <a
              href="https://www.mutopiaproject.org"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-[#121215] border border-white/10 hover:border-cyan-500/30 space-y-2 flex flex-col justify-between transition-colors group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-xs group-hover:text-cyan-300 transition-colors">
                    Mutopia Project
                  </span>
                  <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-cyan-400" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Pure public domain classical sheet music and MIDI (Bach, Beethoven, Chopin, Mozart).
                </p>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-cyan-400 font-mono">
                <span>mutopiaproject.org</span>
                <span className="text-zinc-500">Public Domain</span>
              </div>
            </a>

            {/* Repo 2: Kunst der Fuge */}
            <a
              href="https://www.kunstderfuge.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-[#121215] border border-white/10 hover:border-amber-500/30 space-y-2 flex flex-col justify-between transition-colors group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-xs group-hover:text-amber-300 transition-colors">
                    Kunst der Fuge
                  </span>
                  <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-amber-400" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  World&apos;s largest classical piano MIDI archive (Debussy, Liszt, Schumann, Brahms).
                </p>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-amber-400 font-mono">
                <span>kunstderfuge.com</span>
                <span className="text-zinc-500">50k+ Files</span>
              </div>
            </a>

            {/* Repo 3: VGMusic */}
            <a
              href="https://www.vgmusic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-[#121215] border border-white/10 hover:border-emerald-500/30 space-y-2 flex flex-col justify-between transition-colors group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-xs group-hover:text-emerald-300 transition-colors">
                    VGMusic
                  </span>
                  <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Legendary archive of 30,000+ authentic game MIDI arrangements (Mario, Zelda, Pokemon).
                </p>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-emerald-400 font-mono">
                <span>vgmusic.com</span>
                <span className="text-zinc-500">30k+ Games</span>
              </div>
            </a>

            {/* Repo 4: BitMidi */}
            <a
              href="https://bitmidi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-[#121215] border border-white/10 hover:border-violet-500/30 space-y-2 flex flex-col justify-between transition-colors group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-xs group-hover:text-violet-300 transition-colors">
                    BitMidi
                  </span>
                  <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-violet-400" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Over 113,000 curated pop, rock, and soundtrack MIDI files with 1-click clean download.
                </p>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-violet-400 font-mono">
                <span>bitmidi.com</span>
                <span className="text-zinc-500">113k+ Files</span>
              </div>
            </a>
          </div>
        </div>

        {/* How to import tip */}
        <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-xs text-cyan-200/90 leading-relaxed">
            <strong>Tip:</strong> Simply download any <code className="text-white bg-black/40 px-1 py-0.5 rounded">.mid</code> file from these repositories or click <strong>&quot;1-Click Load&quot;</strong> above to start practicing with full 60 FPS visuals and audio feedback immediately.
          </p>
        </div>
      </div>

      <DialogActions>
        <Link href="/create" onClick={onClose}>
          <Button variant="outline" size="md" className="gap-1.5">
            <UploadCloud className="w-4 h-4" />
            <span>AI Audio Transcriber 🚀</span>
          </Button>
        </Link>
        <Button variant="gradient" size="md" onClick={onClose}>
          Bắt đầu luyện tập tác phẩm 🎹
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export { MidiRepoModal as OpenMidiImporterModal };
export type { MidiRepoModalProps as OpenMidiImporterModalProps };
