"use client";

import React, { useEffect, useRef, useMemo, useCallback } from "react";
import type { ExpectedNote } from "@/lib/midi/MidiEngine";

export interface TimelineScrubberProps {
  currentTimeRef: React.MutableRefObject<number> | React.RefObject<number | null>;
  totalDurationMs: number;
  bpm?: number;
  timeSignature?: string;
  loopStartMs: number | null;
  loopEndMs: number | null;
  isLoopActive: boolean;
  onSeek: (timeMs: number) => void;
  onSetA?: () => void;
  onSetB?: () => void;
  onToggleLoop?: () => void;
  onClearLoop?: () => void;
  notes?: ExpectedNote[];
  className?: string;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function TimelineScrubber({
  currentTimeRef,
  totalDurationMs,
  bpm = 120,
  timeSignature = "4/4",
  loopStartMs,
  loopEndMs,
  isLoopActive,
  onSeek,
  onSetA,
  onSetB,
  onToggleLoop,
  onClearLoop,
  notes,
  className = "",
}: TimelineScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const timeTextRef = useRef<HTMLSpanElement>(null);
  const barTextRef = useRef<HTMLSpanElement>(null);
  const densityCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);

  // Compute bar/measure parameters
  const { barDurationMs, totalBars } = useMemo(() => {
    const beatsPerMinute = bpm && bpm > 0 ? bpm : 120;
    const beatsPerBar = (() => {
      if (!timeSignature) return 4;
      const num = parseInt(timeSignature.split("/")[0], 10);
      return isNaN(num) || num <= 0 ? 4 : num;
    })();
    const secPerBeat = 60 / beatsPerMinute;
    const secPerBar = secPerBeat * beatsPerBar;
    const durationMs = secPerBar * 1000;
    const calculatedBars = Math.max(1, Math.ceil(Math.max(1000, totalDurationMs) / durationMs));
    return { barDurationMs: durationMs, totalBars: calculatedBars };
  }, [bpm, timeSignature, totalDurationMs]);

  // Update DOM directly via rAF loop to prevent React state re-render churn
  useEffect(() => {
    let animId: number;

    const updateDOM = () => {
      if (!isDraggingRef.current) {
        const curMs = typeof currentTimeRef.current === "number" ? currentTimeRef.current : 0;
        const ratio = totalDurationMs > 0 ? Math.min(1, Math.max(0, curMs / totalDurationMs)) : 0;
        const pct = `${(ratio * 100).toFixed(2)}%`;

        if (progressBarRef.current) {
          progressBarRef.current.style.width = pct;
        }
        if (handleRef.current) {
          handleRef.current.style.left = pct;
        }
        if (timeTextRef.current) {
          timeTextRef.current.textContent = `${formatTime(curMs)} / ${formatTime(totalDurationMs)}`;
        }
        if (barTextRef.current) {
          const curBar = 1 + Math.max(0, Math.floor(curMs / barDurationMs));
          barTextRef.current.textContent = `Bar ${curBar} / ${totalBars}`;
        }
      }
      animId = requestAnimationFrame(updateDOM);
    };

    animId = requestAnimationFrame(updateDOM);
    return () => cancelAnimationFrame(animId);
  }, [currentTimeRef, totalDurationMs, barDurationMs, totalBars]);

  // Draw note density overview canvas once or on resize
  useEffect(() => {
    const canvas = densityCanvasRef.current;
    if (!canvas || !notes || notes.length === 0 || totalDurationMs <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const w = Math.floor(rect.width || 800);
    const h = Math.floor(rect.height || 24);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);

    for (const note of notes) {
      const x = (note.start / totalDurationMs) * w;
      const isRH = note.hand ? note.hand === "R" : note.pitch >= 60;
      ctx.fillStyle = isRH ? "rgba(168, 85, 247, 0.55)" : "rgba(6, 182, 212, 0.55)";
      ctx.fillRect(Math.floor(x), 2, 1.5, h - 4);
    }
  }, [notes, totalDurationMs]);

  const seekFromPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const track = trackRef.current;
      if (!track || totalDurationMs <= 0) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetMs = Math.round(ratio * totalDurationMs);

      const pct = `${(ratio * 100).toFixed(2)}%`;
      if (progressBarRef.current) progressBarRef.current.style.width = pct;
      if (handleRef.current) handleRef.current.style.left = pct;
      if (timeTextRef.current) {
        timeTextRef.current.textContent = `${formatTime(targetMs)} / ${formatTime(totalDurationMs)}`;
      }
      if (barTextRef.current) {
        const curBar = 1 + Math.max(0, Math.floor(targetMs / barDurationMs));
        barTextRef.current.textContent = `Bar ${curBar} / ${totalBars}`;
      }

      onSeek(targetMs);
    },
    [totalDurationMs, barDurationMs, totalBars, onSeek]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const track = trackRef.current;
      if (!track || totalDurationMs <= 0) return;
      track.setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      seekFromPointer(e);
    },
    [totalDurationMs, seekFromPointer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isDraggingRef.current) {
        seekFromPointer(e);
      }
    },
    [seekFromPointer]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  }, []);

  // Compute percentage positions for A and B loop markers
  const loopStartPct =
    loopStartMs !== null && totalDurationMs > 0
      ? Math.max(0, Math.min(100, (loopStartMs / totalDurationMs) * 100))
      : null;
  const loopEndPct =
    loopEndMs !== null && totalDurationMs > 0
      ? Math.max(0, Math.min(100, (loopEndMs / totalDurationMs) * 100))
      : null;

  const loopRegion = useMemo(() => {
    if (loopStartPct === null || loopEndPct === null) return null;
    const start = Math.min(loopStartPct, loopEndPct);
    const end = Math.max(loopStartPct, loopEndPct);
    return {
      left: `${start}%`,
      width: `${Math.max(0.5, end - start)}%`,
    };
  }, [loopStartPct, loopEndPct]);

  return (
    <div
      className={`w-full bg-zinc-950/90 border-b border-zinc-800/80 px-4 py-2 flex flex-col gap-1.5 select-none ${className}`}
    >
      {/* Top Meta & Loop Controls Row */}
      <div className="flex items-center justify-between text-xs text-zinc-400 gap-2">
        {/* Formatted time display */}
        <div className="flex items-center gap-2">
          <span
            ref={timeTextRef}
            className="font-mono text-xs font-semibold text-zinc-200 tracking-tight"
          >
            00:00 / {formatTime(totalDurationMs)}
          </span>

          {/* Loop Range Info Tag */}
          {(loopStartMs !== null || loopEndMs !== null) && (
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border ${
                isLoopActive
                  ? "bg-cyan-950/50 text-cyan-300 border-cyan-800/80"
                  : "bg-zinc-800/60 text-zinc-400 border-zinc-700/60"
              }`}
            >
              <span>🔁</span>
              <span>A: {loopStartMs !== null ? formatTime(loopStartMs) : "--:--"}</span>
              <span className="text-zinc-600">|</span>
              <span>B: {loopEndMs !== null ? formatTime(loopEndMs) : "--:--"}</span>
            </div>
          )}
        </div>

        {/* Loop Action Quick Controls */}
        <div className="flex items-center gap-1.5">
          {onSetA && (
            <button
              type="button"
              onClick={onSetA}
              title="Set Loop Point A to current playhead"
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 transition"
            >
              Set A
            </button>
          )}
          {onSetB && (
            <button
              type="button"
              onClick={onSetB}
              title="Set Loop Point B to current playhead"
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 transition"
            >
              Set B
            </button>
          )}
          {onToggleLoop && (
            <button
              type="button"
              disabled={loopStartMs === null || loopEndMs === null}
              onClick={onToggleLoop}
              title="Toggle A-B Looping on/off"
              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition disabled:opacity-40 disabled:pointer-events-none ${
                isLoopActive
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700/80"
              }`}
            >
              {isLoopActive ? "Loop: ON" : "Loop: OFF"}
            </button>
          )}
          {onClearLoop && (loopStartMs !== null || loopEndMs !== null) && (
            <button
              type="button"
              onClick={onClearLoop}
              title="Clear A-B Loop markers"
              className="px-1.5 py-0.5 rounded text-[11px] text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 transition"
            >
              ✕
            </button>
          )}

          {/* Bar / Measure Counter */}
          <span
            ref={barTextRef}
            className="font-mono text-xs font-semibold text-cyan-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 ml-1"
          >
            Bar 1 / {totalBars}
          </span>
        </div>
      </div>

      {/* Main Interactive Scrubber Track Bar */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative h-6 w-full bg-zinc-900/90 rounded-md border border-zinc-800 cursor-pointer overflow-visible group touch-none"
      >
        {/* Note Density Heatmap Canvas in background */}
        <canvas
          ref={densityCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none rounded-md"
        />

        {/* Shaded A-B Loop Region */}
        {loopRegion && (
          <div
            className={`absolute top-0 bottom-0 pointer-events-none transition-colors rounded-sm ${
              isLoopActive
                ? "bg-cyan-500/20 border-x border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                : "bg-zinc-600/15 border-x border-zinc-500/50"
            }`}
            style={{
              left: loopRegion.left,
              width: loopRegion.width,
            }}
          />
        )}

        {/* Marker A Pin Badge */}
        {loopStartPct !== null && (
          <div
            className="absolute top-0 -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none z-10"
            style={{ left: `${loopStartPct}%` }}
          >
            <span className="text-[9px] font-mono font-bold px-1 py-0.2 bg-cyan-400 text-zinc-950 rounded-t shadow">
              A
            </span>
            <div className="w-0.5 h-1.5 bg-cyan-400" />
          </div>
        )}

        {/* Marker B Pin Badge */}
        {loopEndPct !== null && (
          <div
            className="absolute top-0 -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none z-10"
            style={{ left: `${loopEndPct}%` }}
          >
            <span className="text-[9px] font-mono font-bold px-1 py-0.2 bg-sky-400 text-zinc-950 rounded-t shadow">
              B
            </span>
            <div className="w-0.5 h-1.5 bg-sky-400" />
          </div>
        )}

        {/* Current Progress Gradient Fill */}
        <div
          ref={progressBarRef}
          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-600/40 via-cyan-500/30 to-sky-400/50 pointer-events-none rounded-l-md"
          style={{ width: "0%" }}
        />

        {/* Scrubber Playhead Handle */}
        <div
          ref={handleRef}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-7 bg-white rounded-sm shadow-[0_0_10px_rgba(255,255,255,0.7)] border border-cyan-400 pointer-events-none transition-transform group-hover:scale-110 z-20"
          style={{ left: "0%" }}
        >
          <div className="w-0.5 h-3 bg-zinc-900 mx-auto mt-1.5 rounded-full" />
        </div>
      </div>
    </div>
  );
}
