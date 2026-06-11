"use client";

import type { NoteData, RenderSettings } from "@pianoflow/shared-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HIGHEST, isBlack, keyRect, LOWEST } from "@/lib/piano";
import { SampledPiano } from "@/lib/sampledPiano";
import { applySustain } from "@/lib/sustain";

interface Props {
  data: NoteData;
  settings: RenderSettings;
}

const CANVAS_H = 480;
const BASE_FALL_PX_PER_SEC = 140;

/**
 * Synthesia-style preview: notes fall onto the keyboard; bottom edge crosses
 * the hit line exactly at scaled note.start, when the synth plays it and the
 * key lights up. Animation clock = AudioContext time (no rAF drift).
 */
export function FallingNotePreview({ data, settings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SampledPiano | null>(null);
  const rafRef = useRef<number>(0);
  const pausedAtRef = useRef(0);
  const [width, setWidth] = useState(900);
  const [playing, setPlaying] = useState(false);
  const [loadingSound, setLoadingSound] = useState(false);
  const [approxSound, setApproxSound] = useState(false);

  // Audio plays sustain-extended notes; visuals keep raw note ends.
  const audioNotes = useMemo(() => applySustain(data), [data]);

  const speed = settings.speed_multiplier;
  const scaledDuration = data.duration_sec / speed;
  const fallSpeed = BASE_FALL_PX_PER_SEC * settings.note_fall_speed;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    synthRef.current = new SampledPiano();
    return () => {
      synthRef.current?.stop();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Live-apply sound settings (volume/reverb immediately; instrument on next play).
  useEffect(() => {
    synthRef.current?.configure({
      sound: settings.piano_sound,
      volume: settings.volume,
      reverb: settings.reverb,
    });
  }, [settings.piano_sound, settings.volume, settings.reverb]);

  const draw = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr) {
        canvas.width = width * dpr;
        canvas.height = CANVAS_H * dpr;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { colors } = settings;
      const keyboardH = 110 * settings.keyboard_size;
      const hitY = CANVAS_H - keyboardH;

      // Background.
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, width, CANVAS_H);

      // Falling notes (start-sorted; visible window only).
      const visibleSpan = hitY / fallSpeed; // seconds of fall visible above hit line
      ctx.save();
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 24 * settings.glow_intensity;
      for (const note of data.notes) {
        const start = note.start / speed;
        const end = note.end / speed;
        if (end < t) continue;
        if (start > t + visibleSpan) break;

        const bottom = hitY - (start - t) * fallSpeed;
        const height = Math.max(6, ((end - start) * fallSpeed));
        const top = bottom - height;
        if (bottom < 0 || top > hitY) continue;

        const lane = keyRect(note.pitch, width);
        const noteW = isBlack(note.pitch) ? lane.w : lane.w * 0.86;
        const x = lane.x + (lane.w - noteW) / 2;
        ctx.fillStyle = note.hand === "L" ? colors.left_hand : colors.right_hand;
        ctx.globalAlpha = 0.55 + (note.velocity / 127) * 0.45;
        ctx.beginPath();
        ctx.roundRect(x, Math.max(-height, top), noteW, Math.min(height, hitY - top), 4);
        ctx.fill();

        if (settings.show_note_names && height > 18 && noteW > 16) {
          ctx.globalAlpha = 0.9;
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#ffffff";
          ctx.font = "9px monospace";
          ctx.fillText(note.name, x + 2, Math.min(bottom, hitY) - 4);
          ctx.shadowBlur = 24 * settings.glow_intensity;
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      // Fog above the keyboard.
      const fog = ctx.createLinearGradient(0, hitY - 80, 0, hitY);
      fog.addColorStop(0, "rgba(255,255,255,0)");
      fog.addColorStop(1, `rgba(255,255,255,${0.1 + settings.glow_intensity * 0.12})`);
      ctx.fillStyle = fog;
      ctx.fillRect(0, hitY - 80, width, 80);

      // Hit line.
      ctx.save();
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 16;
      ctx.fillStyle = colors.hit_effect;
      ctx.fillRect(0, hitY - 2, width, 2.5);
      ctx.restore();

      if (!settings.show_keyboard) return;

      // Active pitches at t.
      const active = new Map<number, string>();
      for (const note of data.notes) {
        const start = note.start / speed;
        if (start > t) break;
        if (note.end / speed >= t) active.set(note.pitch, note.hand);
      }

      // Keyboard.
      for (let pitch = LOWEST; pitch <= HIGHEST; pitch++) {
        if (isBlack(pitch)) continue;
        const { x, w } = keyRect(pitch, width);
        ctx.fillStyle = active.has(pitch) ? colors.key_highlight : "#f4f4f5";
        ctx.fillRect(x + 0.5, hitY, w - 1, keyboardH);
        ctx.strokeStyle = "#27272a";
        ctx.strokeRect(x + 0.5, hitY, w - 1, keyboardH);
      }
      for (let pitch = LOWEST; pitch <= HIGHEST; pitch++) {
        if (!isBlack(pitch)) continue;
        const { x, w } = keyRect(pitch, width);
        ctx.fillStyle = active.has(pitch) ? colors.key_highlight : "#101012";
        ctx.fillRect(x, hitY, w, keyboardH * 0.62);
      }
    },
    [data, settings, width, speed, fallSpeed],
  );

  // Animation loop while playing; static frame otherwise.
  useEffect(() => {
    if (!playing) {
      draw(pausedAtRef.current);
      return;
    }
    const loop = () => {
      const synth = synthRef.current;
      if (!synth) return;
      const t = synth.time;
      if (t >= scaledDuration + 1) {
        synth.stop();
        pausedAtRef.current = 0;
        setPlaying(false);
        return;
      }
      pausedAtRef.current = t;
      draw(t);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, draw, scaledDuration]);

  async function startPlayback(fromSec: number): Promise<void> {
    const synth = synthRef.current;
    if (!synth) return;
    setLoadingSound(true);
    try {
      await synth.play(audioNotes, speed, fromSec);
      setApproxSound(synth.approximate);
    } finally {
      setLoadingSound(false);
    }
  }

  // Speed change: rescale the current position to the same musical moment
  // (t_new = t_old * old_speed / new_speed), restart scheduler if playing.
  const prevSpeedRef = useRef(speed);
  useEffect(() => {
    const prev = prevSpeedRef.current;
    if (prev === speed) return;
    prevSpeedRef.current = speed;
    pausedAtRef.current = (pausedAtRef.current * prev) / speed;
    if (playing) {
      void startPlayback(pausedAtRef.current);
    } else {
      draw(pausedAtRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  function togglePlay() {
    const synth = synthRef.current;
    if (!synth) return;
    if (playing) {
      synth.stop();
      setPlaying(false);
    } else {
      void startPlayback(pausedAtRef.current).then(() => setPlaying(true));
    }
  }

  function restart() {
    pausedAtRef.current = 0;
    if (playing) {
      void startPlayback(0);
    } else {
      draw(0);
    }
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        style={{ width, height: CANVAS_H }}
        className="rounded-lg border border-zinc-800"
        aria-label={`Falling-note preview: ${data.notes.length} notes, ${Math.round(
          scaledDuration,
        )} seconds at ${speed}x`}
        onClick={togglePlay}
      />
      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={togglePlay}
          disabled={loadingSound}
          className="rounded-md bg-zinc-100 px-4 py-1.5 font-semibold text-zinc-950 hover:bg-white disabled:opacity-60"
        >
          {loadingSound ? "Loading piano…" : playing ? "Pause" : "Play"}
        </button>
        <button
          onClick={restart}
          className="rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800"
        >
          Restart
        </button>
        <span className="text-xs text-zinc-500">
          {approxSound
            ? "High-quality piano unavailable offline — using basic sound."
            : "Sampled piano preview — export renders studio-quality audio."}
        </span>
      </div>
    </div>
  );
}
