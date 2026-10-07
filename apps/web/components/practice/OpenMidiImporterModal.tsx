"use client";

import React from "react";
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
} from "lucide-react";

export interface OpenMidiImporterModalProps {
  open: boolean;
  onClose: () => void;
}

export function OpenMidiImporterModal({
  open,
  onClose,
}: OpenMidiImporterModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="🌐 Song Library & Open MIDI Importer"
      className="max-w-3xl"
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
            PianoFlow AI is built to surpass commercial learning platforms. Every single piece in our 250-piece library is a{" "}
            <strong>complete, unabridged piano arrangement</strong> with multi-measure voicing, dynamic 60 FPS waterfall visuals, polyphonic wait mode, and vector sheet music.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card 1: 250 Complete Built-in Pieces */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 hover:border-cyan-500/30 transition-all space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Music className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-zinc-100">
                  1. 250 Complete Pieces
                </h4>
              </div>
              <Badge variant="accent" size="sm" className="text-[10px]">
                5 Genres
              </Badge>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Play complete concert pieces across 5 rich genres: <strong>Anime &amp; Ghibli</strong>, <strong>K-Pop</strong>, <strong>Modern &amp; Pop</strong>, <strong>Cinematic &amp; Video Game OSTs</strong>, and <strong>Classical Masterpieces</strong>.
            </p>
            <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
              <li>Full 32-bar and multi-phrase arrangements</li>
              <li>Voicing reduction to Easy (-25%) &amp; Very Easy (-45%)</li>
              <li>Zero authentication required to start practicing</li>
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
                Unlimited Songs
              </Badge>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Have a favorite song not in the library? Import any standard <code className="text-cyan-300 bg-black/40 px-1 py-0.5 rounded">.mid</code> or <code className="text-cyan-300 bg-black/40 px-1 py-0.5 rounded">.midi</code> file from your computer or the web.
            </p>
            <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
              <li>Automatic hand separation &amp; tempo detection</li>
              <li>Neural AI isolation &amp; audio-to-MIDI transcription</li>
              <li>Instant 60 FPS waterfall &amp; wait mode practice</li>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Repo 1: MuseScore */}
            <div className="p-3.5 rounded-xl bg-[#121215] border border-white/10 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-xs">MuseScore</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Millions of community piano arrangements for pop songs, anime openings, and movie soundtracks.
                </p>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-cyan-400 font-mono">
                <span>musescore.com</span>
                <span className="text-zinc-500">MIDI Export</span>
              </div>
            </div>

            {/* Repo 2: BitMidi */}
            <div className="p-3.5 rounded-xl bg-[#121215] border border-white/10 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-xs">BitMidi</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Over 113,000 curated, classic and contemporary MIDI files. Clean 1-click downloads with zero fuss.
                </p>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-cyan-400 font-mono">
                <span>bitmidi.com</span>
                <span className="text-zinc-500">113k+ Files</span>
              </div>
            </div>

            {/* Repo 3: Mutopia */}
            <div className="p-3.5 rounded-xl bg-[#121215] border border-white/10 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-xs">Mutopia Project</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Pure public domain classical sheet music and MIDI (Bach, Beethoven, Chopin, Mozart, Brahms).
                </p>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-cyan-400 font-mono">
                <span>mutopiaproject.org</span>
                <span className="text-zinc-500">Public Domain</span>
              </div>
            </div>
          </div>
        </div>

        {/* How to import tip */}
        <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-xs text-cyan-200/90 leading-relaxed">
            <strong>Tip:</strong> Simply download any <code className="text-white bg-black/40 px-1 py-0.5 rounded">.mid</code> file from these repositories and click <strong>&quot;+ Upload Custom MIDI&quot;</strong> to start practicing with full 60 FPS visuals and audio feedback immediately.
          </p>
        </div>
      </div>

      <DialogActions>
        <Link href="/create" onClick={onClose}>
          <Button variant="gradient" size="md" className="gap-1.5">
            <UploadCloud className="w-4 h-4" />
            <span>+ Upload Custom MIDI 🚀</span>
          </Button>
        </Link>
        <Button variant="outline" size="md" onClick={onClose}>
          Bắt đầu luyện tập tác phẩm 🎹
        </Button>
      </DialogActions>
    </Dialog>
  );
}
