"use client";

import type { Note, NoteData } from "@pianoflow/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";

import { HAND_COLORS, HIGHEST, isBlack, keyRect, LOWEST } from "@/lib/piano";

interface Props {
  data: NoteData;
  playhead: number;
}

const HEIGHT = 90;

/** 88-key strip; keys sounding at the playhead glow in their hand color. */
export function KeyboardVisualizer({ data, playhead }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = HEIGHT * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Keys sounding at playhead, by pitch → hand.
    const active = new Map<number, string>();
    for (const note of data.notes as Note[]) {
      if (note.start > playhead) break; // start-sorted
      if (note.end >= playhead) active.set(note.pitch, note.hand);
    }

    // White keys first, black keys on top.
    for (let pitch = LOWEST; pitch <= HIGHEST; pitch++) {
      if (isBlack(pitch)) continue;
      const { x, w } = keyRect(pitch, width);
      ctx.fillStyle = active.has(pitch) ? HAND_COLORS[active.get(pitch)!] : "#fafafa";
      ctx.fillRect(x + 0.5, 0, w - 1, HEIGHT);
      ctx.strokeStyle = "#3f3f46";
      ctx.strokeRect(x + 0.5, 0, w - 1, HEIGHT);
    }
    for (let pitch = LOWEST; pitch <= HIGHEST; pitch++) {
      if (!isBlack(pitch)) continue;
      const { x, w } = keyRect(pitch, width);
      ctx.fillStyle = active.has(pitch) ? HAND_COLORS[active.get(pitch)!] : "#18181b";
      ctx.fillRect(x, 0, w, HEIGHT * 0.62);
    }
  }, [data, playhead, width]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div ref={containerRef}>
      <canvas
        ref={canvasRef}
        style={{ width, height: HEIGHT }}
        className="rounded-b-lg"
        aria-label="Piano keyboard showing active keys at the playhead"
      />
    </div>
  );
}
