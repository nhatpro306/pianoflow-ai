"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { NoteData } from "@pianoflow/shared-types";
import { buildSheetScoreModel } from "@/lib/sheet/sheetModel";
import { AcousticPianoFeedback } from "@/lib/audio/acousticFeedback";
import { Button } from "@/components/ui/Button";
import { SegmentedControl, type SegmentedControlOption } from "@/components/ui/SegmentedControl";
import { MetronomeControl } from "@/components/practice/MetronomeControl";
import type { TimeSignature } from "@/lib/audio/metronomeEngine";

const HAND_OPTIONS: SegmentedControlOption[] = [
  { id: "both", label: "Both 👐", testId: "hand-both" },
  { id: "right", label: "RH ✋", testId: "hand-rh" },
  { id: "left", label: "LH 🤚", testId: "hand-lh" },
];

const SPEED_OPTIONS: SegmentedControlOption[] = [
  { id: "0.5", label: "0.5x", testId: "speed-0.5" },
  { id: "0.75", label: "0.75x", testId: "speed-0.75" },
  { id: "1", label: "1x", testId: "speed-1.0" },
  { id: "1.25", label: "1.25x", testId: "speed-1.25" },
];

interface SheetMusicViewerProps {
  noteData: NoteData;
  projectName?: string;
  onBackToPractice?: () => void;
  pdfDownloadUrl?: string;
  onDownloadPdf?: () => void;
}

export function SheetMusicViewer({
  noteData,
  projectName = "Sheet Music",
  onBackToPractice,
  pdfDownloadUrl,
  onDownloadPdf,
}: SheetMusicViewerProps) {
  const model = useMemo(() => buildSheetScoreModel(noteData, 2), [noteData]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [handFilter, setHandFilter] = useState<"both" | "right" | "left">("both");
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const currentTimeRef = useRef(0);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState(0);
  const audioRef = useRef<AcousticPianoFeedback | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const systemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lastSystemIndexRef = useRef<number>(-1);

  useEffect(() => {
    audioRef.current = new AcousticPianoFeedback();
    void audioRef.current.init();
    return () => {
      audioRef.current?.destroy();
      audioRef.current = null;
    };
  }, []);

  const totalDuration = model.measureDuration * model.totalMeasures;

  // Real-time animation loop
  const animate = useCallback(
    (time: number) => {
      if (lastTimeRef.current !== null) {
        const dt = (time - lastTimeRef.current) / 1000;
        const nextTime = currentTimeRef.current + dt * speedMultiplier;

        if (nextTime >= totalDuration) {
          setIsPlaying(false);
          currentTimeRef.current = 0;
          setCurrentTimeDisplay(0);
          lastSystemIndexRef.current = -1;
          return;
        }

        // Sound trigger for notes passing playhead
        for (const sys of model.systems) {
          for (const m of sys.measures) {
            const allNotes = [...m.trebleNotes, ...m.bassNotes];
            for (const n of allNotes) {
              if (n.start >= currentTimeRef.current && n.start < nextTime) {
                if (
                  !isAudioMuted &&
                  (handFilter === "both" ||
                    (handFilter === "right" && n.hand === "R") ||
                    (handFilter === "left" && n.hand === "L"))
                ) {
                  audioRef.current?.noteOn(n.pitch, 80);
                  const dur = Math.max(0.1, n.end - n.start);
                  setTimeout(() => {
                    audioRef.current?.noteOff(n.pitch);
                  }, (dur / speedMultiplier) * 1000);
                }
              }
            }
          }
        }

        currentTimeRef.current = nextTime;
        setCurrentTimeDisplay(nextTime);
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    },
    [model, speedMultiplier, totalDuration, handFilter, isAudioMuted]
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

  // Smooth auto-scroll across systems
  useEffect(() => {
    if (!isPlaying) return;
    const currentMeasureIndex = Math.floor(currentTimeDisplay / model.measureDuration);
    const currentSysIndex = Math.floor(currentMeasureIndex / 2);
    if (
      currentSysIndex !== lastSystemIndexRef.current &&
      currentSysIndex >= 0 &&
      currentSysIndex < model.systems.length
    ) {
      lastSystemIndexRef.current = currentSysIndex;
      systemRefs.current[currentSysIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentTimeDisplay, isPlaying, model.measureDuration, model.systems.length]);

  const handleSeek = (timeSec: number) => {
    currentTimeRef.current = Math.max(0, Math.min(totalDuration, timeSec));
    setCurrentTimeDisplay(currentTimeRef.current);
  };

  const handleReset = () => {
    setIsPlaying(false);
    currentTimeRef.current = 0;
    setCurrentTimeDisplay(0);
    lastSystemIndexRef.current = -1;
  };

  const handleToggleAudioPreview = () => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      if (!next && !isPlaying) {
        // Quick acoustic piano chord audition (C4, E4, G4)
        audioRef.current?.noteOn(60, 80);
        audioRef.current?.noteOn(64, 80);
        audioRef.current?.noteOn(67, 80);
        setTimeout(() => {
          audioRef.current?.noteOff(60);
          audioRef.current?.noteOff(64);
          audioRef.current?.noteOff(67);
        }, 500);
      }
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (onDownloadPdf) {
      onDownloadPdf();
    } else if (pdfDownloadUrl) {
      window.open(pdfDownloadUrl, "_blank", "noopener");
    } else {
      window.print();
    }
  };

  // Keyboard shortcut: Space for Play/Pause
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="sheet-music-container flex flex-col h-full min-h-screen bg-[#09090b] text-white select-none print:bg-white print:text-black">
      {/* High-contrast @media print stylesheet */}
      <style>{`
        @media print {
          @page {
            margin: 1cm;
            size: auto;
          }
          body,
          .sheet-music-container {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          header,
          nav,
          .print\\:hidden,
          [data-testid="header"],
          .sheet-music-playhead {
            display: none !important;
          }
          svg {
            color: #000000 !important;
          }
          .sheet-system-card {
            background-color: #ffffff !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 1.5rem !important;
          }
        }
      `}</style>

      {/* Controls Bar (Hidden during printing) */}
      <header className="print:hidden sticky top-0 flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/10 gap-3 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          {onBackToPractice && (
            <Button size="sm" variant="outline" onClick={onBackToPractice} className="flex items-center gap-1.5">
              <span>←</span> Practice Mode
            </Button>
          )}
          <h1 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
            <span>🎼</span> {projectName}
          </h1>
          <span className="text-xs text-zinc-400 hidden sm:inline font-mono">
            {model.bpm} BPM • {model.timeSignature} • {model.totalMeasures} Measures
          </span>
        </div>

        {/* Primary Playback, Speed, Hands & Zoom Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Hands Filter */}
          <SegmentedControl
            options={HAND_OPTIONS}
            value={handFilter}
            onChange={(val) => setHandFilter(val as "both" | "right" | "left")}
            size="sm"
            ariaLabel="Hand isolation"
          />

          {/* Speed selector */}
          <SegmentedControl
            options={SPEED_OPTIONS}
            value={speedMultiplier === 1 ? "1" : String(speedMultiplier)}
            onChange={(val) => setSpeedMultiplier(parseFloat(val))}
            size="sm"
            ariaLabel="Playback speed"
          />

          {/* Playback Controls */}
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={isPlaying ? "secondary" : "gradient"}
              onClick={() => setIsPlaying((p) => !p)}
              leftIcon={<span>{isPlaying ? "⏸" : "▶"}</span>}
              className="font-bold"
              aria-label={isPlaying ? "Pause score playback" : "Play score playback"}
              data-testid="sheet-play-pause-btn"
            >
              {isPlaying ? "Pause" : "Play"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              leftIcon={<span>⏮</span>}
              className="text-zinc-300 hover:text-white"
              aria-label="Reset playback"
              title="Reset to beginning"
              data-testid="sheet-reset-btn"
            >
              Reset
            </Button>

            <Button
              size="sm"
              variant={isAudioMuted ? "outline" : "secondary"}
              onClick={handleToggleAudioPreview}
              leftIcon={<span>{isAudioMuted ? "🔇" : "🔊"}</span>}
              className="text-xs text-zinc-300 hover:text-white"
              aria-label={isAudioMuted ? "Unmute audio preview" : "Mute audio preview"}
              title={isAudioMuted ? "Unmute audio preview" : "Mute audio preview"}
              data-testid="sheet-audio-preview-btn"
            >
              {isAudioMuted ? "Muted" : "Audio Preview"}
            </Button>
          </div>

          {/* Metronome Control (Phase K) */}
          <MetronomeControl
            initialBpm={model.bpm}
            initialTimeSignature={
              ["4/4", "3/4", "3/8", "6/8", "2/4"].includes(model.timeSignature)
                ? (model.timeSignature as TimeSignature)
                : "4/4"
            }
            compact
          />

          {/* Numeric Zoom Steppers */}
          <div className="flex items-center gap-1 bg-[#121215] border border-white/10 rounded-lg p-0.5 shadow-sm">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setZoomScale((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
              className="h-7 w-7 p-0 flex items-center justify-center font-bold text-sm"
              aria-label="Zoom out"
              data-testid="zoom-out-btn"
            >
              -
            </Button>
            <span
              data-testid="zoom-percentage"
              className="text-xs text-zinc-300 w-12 text-center font-mono font-semibold select-none"
            >
              {Math.round(zoomScale * 100)}%
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setZoomScale((z) => Math.min(2.0, Math.round((z + 0.1) * 10) / 10))}
              className="h-7 w-7 p-0 flex items-center justify-center font-bold text-sm"
              aria-label="Zoom in"
              data-testid="zoom-in-btn"
            >
              +
            </Button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 text-cyan-300 border-cyan-800/80 hover:bg-cyan-950/40"
          >
            <span>📥</span> Download Vector PDF
          </Button>

          <Button size="sm" variant="outline" onClick={handlePrint} className="flex items-center gap-1.5">
            <span>🖨️</span> Print
          </Button>
        </div>
      </header>

      {/* Sheet Music Systems Scrollable Area */}
      <main className="flex-1 overflow-y-auto px-4 py-8 print:p-0 print:overflow-visible print:bg-white">
        <div
          className="max-w-5xl mx-auto space-y-12 print:space-y-6 origin-top transition-transform print:transform-none"
          style={{ transform: `scale(${zoomScale})` }}
        >
          {model.systems.map((system, sysIdx) => {
            const measuresCount = system.measures.length;
            const measureW = (1000 - 90) / Math.max(1, measuresCount);

            return (
              <div
                key={system.index}
                ref={(el) => {
                  systemRefs.current[sysIdx] = el;
                }}
                className="sheet-system-card bg-zinc-900/60 print:bg-white rounded-xl p-4 border border-zinc-800/80 print:border-none shadow-xl print:shadow-none break-inside-avoid print:break-inside-avoid"
              >
                <svg
                  viewBox="0 0 1000 240"
                  className="w-full h-auto text-zinc-200 print:text-black font-sans"
                >
                  {/* Grand Staff Left Brace & Connectors */}
                  <path d="M 20 20 L 20 160 M 16 20 L 16 160" stroke="currentColor" strokeWidth="2" />
                  <path d="M 16 20 Q 24 90 16 160" fill="none" stroke="currentColor" strokeWidth="2" />

                  {/* System Clefs & Signatures (Header Section: X 20 to 85) */}
                  <text x="30" y="58" fontSize="42" fill="currentColor">
                    𝄞
                  </text>
                  <text x="30" y="152" fontSize="36" fill="currentColor">
                    𝄢
                  </text>
                  <text x="65" y="40" fontSize="18" fontWeight="bold" fill="currentColor">
                    {model.beatsPerMeasure}
                  </text>
                  <text x="65" y="58" fontSize="18" fontWeight="bold" fill="currentColor">
                    {model.timeSignature.split("/")[1] || "4"}
                  </text>
                  <text x="65" y="138" fontSize="18" fontWeight="bold" fill="currentColor">
                    {model.beatsPerMeasure}
                  </text>
                  <text x="65" y="156" fontSize="18" fontWeight="bold" fill="currentColor">
                    {model.timeSignature.split("/")[1] || "4"}
                  </text>

                  {/* Render Measures */}
                  {system.measures.map((measure, mIdx) => {
                    const measureX = 90 + mIdx * measureW;
                    const isCurrentMeasure =
                      currentTimeDisplay >= measure.startTime &&
                      currentTimeDisplay < measure.endTime;

                    const playheadProgress = Math.max(
                      0,
                      Math.min(1, (currentTimeDisplay - measure.startTime) / model.measureDuration)
                    );
                    const playheadX = measureX + playheadProgress * measureW;

                    return (
                      <g
                        key={measure.index}
                        className="cursor-pointer"
                        onClick={() => handleSeek(measure.startTime)}
                      >
                        {/* Measure Background Highlight on Hover */}
                        <rect
                          x={measureX}
                          y={10}
                          width={measureW}
                          height={190}
                          fill="transparent"
                          className="hover:fill-cyan-500/5 transition print:hidden"
                        />

                        {/* Treble Staff 5 Lines (Y = 20, 30, 40, 50, 60) */}
                        {[20, 30, 40, 50, 60].map((y) => (
                          <line
                            key={`treble-${y}`}
                            x1={measureX}
                            y1={y}
                            x2={measureX + measureW}
                            y2={y}
                            stroke="currentColor"
                            strokeWidth="1.2"
                            opacity="0.8"
                          />
                        ))}

                        {/* Bass Staff 5 Lines (Y = 120, 130, 140, 150, 160) */}
                        {[120, 130, 140, 150, 160].map((y) => (
                          <line
                            key={`bass-${y}`}
                            x1={measureX}
                            y1={y}
                            x2={measureX + measureW}
                            y2={y}
                            stroke="currentColor"
                            strokeWidth="1.2"
                            opacity="0.8"
                          />
                        ))}

                        {/* Right Measure Bar Line */}
                        <line
                          x1={measureX + measureW}
                          y1={20}
                          x2={measureX + measureW}
                          y2={160}
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />

                        {/* Measure Number Label */}
                        <text
                          x={measureX + 4}
                          y={15}
                          fontSize="9"
                          fill="currentColor"
                          opacity="0.5"
                        >
                          m.{measure.index + 1}
                        </text>

                        {/* Treble Notes Rendering */}
                        {(handFilter === "both" || handFilter === "right") &&
                          measure.trebleNotes.map((note) => {
                            const noteProgress = Math.max(
                              0,
                              Math.min(1, (note.start - measure.startTime) / model.measureDuration)
                            );
                            const noteX = measureX + 25 + noteProgress * (measureW - 50);
                            // Line 1 is E4 at Y = 60; each half-space offset moves up 5px
                            const noteY = 60 - note.staffOffset * 5;

                            return (
                              <g key={note.id} className="text-cyan-400 print:text-black">
                                {/* Ledger Lines */}
                                {note.ledgerLines.map((ll) => (
                                  <line
                                    key={ll}
                                    x1={noteX - 8}
                                    y1={60 - ll * 5}
                                    x2={noteX + 8}
                                    y2={60 - ll * 5}
                                    stroke="currentColor"
                                    strokeWidth="1.2"
                                  />
                                ))}

                                {/* Accidental (#) */}
                                {note.accidental === "sharp" && (
                                  <text
                                    x={noteX - 11}
                                    y={noteY + 4}
                                    fontSize="12"
                                    fill="currentColor"
                                  >
                                    ♯
                                  </text>
                                )}

                                {/* Notehead */}
                                <ellipse
                                  cx={noteX}
                                  cy={noteY}
                                  rx="5.5"
                                  ry="4"
                                  transform={`rotate(-18 ${noteX} ${noteY})`}
                                  fill={note.isHollow ? "none" : "currentColor"}
                                  stroke="currentColor"
                                  strokeWidth={note.isHollow ? "1.8" : "0"}
                                />

                                {/* Stem */}
                                <line
                                  x1={note.stemDirection === "up" ? noteX + 5 : noteX - 5}
                                  y1={noteY}
                                  x2={note.stemDirection === "up" ? noteX + 5 : noteX - 5}
                                  y2={note.stemDirection === "up" ? noteY - 30 : noteY + 30}
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                />
                              </g>
                            );
                          })}

                        {/* Bass Notes Rendering */}
                        {(handFilter === "both" || handFilter === "left") &&
                          measure.bassNotes.map((note) => {
                            const noteProgress = Math.max(
                              0,
                              Math.min(1, (note.start - measure.startTime) / model.measureDuration)
                            );
                            const noteX = measureX + 25 + noteProgress * (measureW - 50);
                            // Line 1 is G2 at Y = 160; each half-space offset moves up 5px
                            const noteY = 160 - note.staffOffset * 5;

                            return (
                              <g key={note.id} className="text-purple-400 print:text-black">
                                {/* Ledger Lines */}
                                {note.ledgerLines.map((ll) => (
                                  <line
                                    key={ll}
                                    x1={noteX - 8}
                                    y1={160 - ll * 5}
                                    x2={noteX + 8}
                                    y2={160 - ll * 5}
                                    stroke="currentColor"
                                    strokeWidth="1.2"
                                  />
                                ))}

                                {/* Accidental (#) */}
                                {note.accidental === "sharp" && (
                                  <text
                                    x={noteX - 11}
                                    y={noteY + 4}
                                    fontSize="12"
                                    fill="currentColor"
                                  >
                                    ♯
                                  </text>
                                )}

                                {/* Notehead */}
                                <ellipse
                                  cx={noteX}
                                  cy={noteY}
                                  rx="5.5"
                                  ry="4"
                                  transform={`rotate(-18 ${noteX} ${noteY})`}
                                  fill={note.isHollow ? "none" : "currentColor"}
                                  stroke="currentColor"
                                  strokeWidth={note.isHollow ? "1.8" : "0"}
                                />

                                {/* Stem */}
                                <line
                                  x1={note.stemDirection === "up" ? noteX + 5 : noteX - 5}
                                  y1={noteY}
                                  x2={note.stemDirection === "up" ? noteX + 5 : noteX - 5}
                                  y2={note.stemDirection === "up" ? noteY - 30 : noteY + 30}
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                />
                              </g>
                            );
                          })}

                        {/* Live Playhead Cursor */}
                        {isCurrentMeasure && isPlaying && (
                          <line
                            x1={playheadX}
                            y1={15}
                            x2={playheadX}
                            y2={165}
                            stroke="#06b6d4"
                            strokeWidth="2.5"
                            className="sheet-music-playhead print:hidden shadow-[0_0_8px_#06b6d4]"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
