"use client";

import type { Note, NoteData } from "@pianoflow/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";

import { HAND_COLORS } from "@/lib/piano";

interface Props {
  data: NoteData;
  playhead: number;
  onSeek: (t: number) => void;
}

const MIN_PX_PER_SEC = 20;
const MAX_PX_PER_SEC = 400;

/**
 * Horizontal piano roll on <canvas>: time → x, pitch → key lane (same
 * geometry as the keyboard below it). Wheel scrolls, buttons zoom,
 * click seeks the playhead. Only the visible time window is drawn.
 */
export function PianoRollPreview({ data, playhead, onSeek }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pxPerSec, setPxPerSec] = useState(80);
  const [offsetSec, setOffsetSec] = useState(0);
  const [size, setSize] = useState({ w: 800, h: 360 });

  // Track container width.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: 360 });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const maxOffset = Math.max(0, data.duration_sec - size.w / pxPerSec + 1);

  // Sorted once; binary-search-free virtualization via simple scan window
  // (notes are already start-sorted from the parser).
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const t0 = offsetSec;
    const t1 = offsetSec + size.w / pxPerSec;

    // time → x, pitch → y (high pitches at top).
    const span = 108 - 21 + 1;
    const pitchTop = (pitch: number) => ((108 - pitch) / span) * size.h;
    const noteH = size.h / span;

    // Background + horizontal octave guides at each C.
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, size.w, size.h);
    ctx.fillStyle = "#18181b";
    for (let pitch = 24; pitch <= 108; pitch += 12) {
      ctx.fillRect(0, pitchTop(pitch), size.w, 1);
    }

    for (const note of data.notes as Note[]) {
      if (note.end < t0) continue;
      if (note.start > t1) break; // start-sorted → nothing further is visible
      const x = (note.start - t0) * pxPerSec;
      const w = Math.max(2, note.duration * pxPerSec - 1);
      const y = pitchTop(note.pitch);
      ctx.fillStyle = HAND_COLORS[note.hand] ?? "#a1a1aa";
      ctx.globalAlpha = 0.5 + (note.velocity / 127) * 0.5;
      ctx.beginPath();
      ctx.roundRect(x, y, w, Math.max(3, noteH - 1), 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Playhead.
    if (playhead >= t0 && playhead <= t1) {
      const x = (playhead - t0) * pxPerSec;
      ctx.strokeStyle = "#f4f4f5";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size.h);
      ctx.stroke();
    }

    // Time ruler.
    ctx.fillStyle = "#52525b";
    ctx.font = "10px monospace";
    const step = pxPerSec >= 100 ? 1 : pxPerSec >= 40 ? 5 : 10;
    for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) {
      const x = (t - t0) * pxPerSec;
      ctx.fillText(`${t}s`, x + 2, 12);
      ctx.fillRect(x, 0, 1, 6);
    }
  }, [data, playhead, pxPerSec, offsetSec, size]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex gap-3">
          <span>
            <span style={{ color: HAND_COLORS.R }}>■</span> Right hand
          </span>
          <span>
            <span style={{ color: HAND_COLORS.L }}>■</span> Left hand
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPxPerSec((z) => Math.max(MIN_PX_PER_SEC, z / 1.5))}
            className="rounded border border-zinc-700 px-2 py-0.5 hover:bg-zinc-800"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            onClick={() => setPxPerSec((z) => Math.min(MAX_PX_PER_SEC, z * 1.5))}
            className="rounded border border-zinc-700 px-2 py-0.5 hover:bg-zinc-800"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: size.w, height: size.h }}
        className="cursor-crosshair rounded-lg border border-zinc-800"
        aria-label={`Piano roll: ${data.notes.length} notes, ${Math.round(
          data.duration_sec,
        )} seconds, ${data.bpm} BPM`}
        onWheel={(e) => {
          const delta = (e.deltaY + e.deltaX) / pxPerSec;
          setOffsetSec((o) => Math.min(maxOffset, Math.max(0, o + delta)));
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onSeek(offsetSec + (e.clientX - rect.left) / pxPerSec);
        }}
      />

      <input
        type="range"
        min={0}
        max={maxOffset}
        step={0.1}
        value={offsetSec}
        onChange={(e) => setOffsetSec(Number(e.target.value))}
        className="w-full accent-cyan-500"
        aria-label="Scroll position"
      />
    </div>
  );
}
