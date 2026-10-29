"use client";

import type { NoteData, RenderSettings } from "@pianoflow/shared-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HIGHEST, isBlack, keyRect, LOWEST } from "@/lib/piano";
import { prewarmGrandPiano, SampledPiano } from "@/lib/sampledPiano";
import { applySustain } from "@/lib/sustain";

interface Props {
  data: NoteData;
  settings: RenderSettings;
  externalIsPlaying?: boolean;
  onTogglePlay?: () => void;
  onTimeUpdate?: (timeSec: number) => void;
}

const CANVAS_H = 480;
const BASE_FALL_PX_PER_SEC = 140;
const PREVIEW_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

function findFirstNoteIndexGE(notes: NoteData["notes"], targetStart: number): number {
  let low = 0;
  let high = notes.length - 1;
  let result = notes.length;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (notes[mid].start >= targetStart) {
      result = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return result;
}

export function FallingNotePreview({
  data,
  settings,
  externalIsPlaying,
  onTogglePlay,
  onTimeUpdate,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SampledPiano | null>(null);
  const rafRef = useRef<number>(0);
  const pausedAtRef = useRef(0);
  const lastUiUpdateRef = useRef(0);

  const [width, setWidth] = useState(900);
  const [canvasH, setCanvasH] = useState(CANVAS_H);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loadingSound, setLoadingSound] = useState(false);
  const [approxSound, setApproxSound] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [previewSpeed, setPreviewSpeed] = useState(settings.speed_multiplier);
  const [previewVolume, setPreviewVolume] = useState(settings.volume);

  const audioNotes = useMemo(() => applySustain(data), [data]);
  const sortedNotes = useMemo(() => {
    return [...data.notes].sort((a, b) => a.start - b.start || a.pitch - b.pitch);
  }, [data.notes]);
  const maxNoteDuration = useMemo(() => {
    return sortedNotes.reduce((max, n) => Math.max(max, n.duration || (n.end - n.start)), 0);
  }, [sortedNotes]);
  const speed = previewSpeed;
  const scaledDuration = data.duration_sec / speed;
  const fallSpeed = BASE_FALL_PX_PER_SEC * settings.note_fall_speed;

  useEffect(() => setPreviewSpeed(settings.speed_multiplier), [settings.speed_multiplier]);
  useEffect(() => setPreviewVolume(settings.volume), [settings.volume]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function syncFullscreen() {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      setCanvasH(fs ? window.innerHeight : CANVAS_H);
    }
    document.addEventListener("fullscreenchange", syncFullscreen);
    window.addEventListener("resize", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      window.removeEventListener("resize", syncFullscreen);
    };
  }, []);

  useEffect(() => {
    void prewarmGrandPiano();
    synthRef.current = new SampledPiano();
    return () => {
      synthRef.current?.stop();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    synthRef.current?.configure({
      sound: settings.piano_sound,
      volume: previewVolume,
      reverb: settings.reverb,
    });
  }, [settings.piano_sound, previewVolume, settings.reverb]);

  const draw = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr || canvas.height !== canvasH * dpr) {
        canvas.width = width * dpr;
        canvas.height = canvasH * dpr;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { colors } = settings;
      // Scale keyboard height proportionally so it stays well-proportioned when
      // the canvas grows in fullscreen (base ratio = 110/480).
      const keyboardH = 110 * settings.keyboard_size * (canvasH / CANVAS_H);
      const hitY = canvasH - keyboardH;

      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, width, canvasH);

      const visibleSpan = hitY / fallSpeed;
      ctx.save();
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 24 * settings.glow_intensity;

      // Binary search optimization: jump to the first note that could potentially be visible or active
      const minStartSec = Math.max(0, (t - maxNoteDuration) * speed);
      const noteStartIndex = findFirstNoteIndexGE(sortedNotes, minStartSec);

      for (let i = noteStartIndex; i < sortedNotes.length; i++) {
        const note = sortedNotes[i];
        const start = note.start / speed;
        const end = note.end / speed;
        if (end < t) continue;
        if (start > t + visibleSpan) break;

        const bottom = hitY - (start - t) * fallSpeed;
        const height = Math.max(6, (end - start) * fallSpeed);
        const top = bottom - height;
        if (bottom < 0 || top > hitY) continue;

        const lane = keyRect(note.pitch, width);
        const noteW = isBlack(note.pitch) ? lane.w : lane.w * 0.86;
        const x = lane.x + (lane.w - noteW) / 2;
        const renderTop = Math.max(-height, top);
        const renderHeight = Math.min(height, hitY - top);
        const baseColor = note.hand === "L" ? colors.left_hand : colors.right_hand;

        // Dual-hand dynamic glow per note
        ctx.shadowColor = baseColor;

        // 3D vertical linear gradient with specular highlight on top, richer tone on bottom
        const noteGrad = ctx.createLinearGradient(x, renderTop, x, renderTop + renderHeight);
        noteGrad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
        noteGrad.addColorStop(0.2, baseColor);
        noteGrad.addColorStop(0.85, baseColor);
        noteGrad.addColorStop(1, "rgba(0, 0, 0, 0.28)");

        ctx.fillStyle = noteGrad;
        ctx.globalAlpha = 0.55 + (note.velocity / 127) * 0.45;
        ctx.beginPath();
        ctx.roundRect(x, renderTop, noteW, renderHeight, 4);
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

      const fog = ctx.createLinearGradient(0, hitY - 80, 0, hitY);
      fog.addColorStop(0, "rgba(255,255,255,0)");
      fog.addColorStop(1, `rgba(255,255,255,${0.1 + settings.glow_intensity * 0.12})`);
      ctx.fillStyle = fog;
      ctx.fillRect(0, hitY - 80, width, 80);

      // Crimson piano felt strip (2.5px right above strike line hitY - 2.5)
      ctx.fillStyle = "#881337";
      ctx.fillRect(0, hitY - 2.5, width, 2.5);

      ctx.save();
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 16;
      ctx.fillStyle = colors.hit_effect;
      ctx.fillRect(0, hitY - 2, width, 2.5);
      ctx.restore();

      if (!settings.show_keyboard) return;

      const active = new Map<number, string>();
      for (let i = noteStartIndex; i < sortedNotes.length; i++) {
        const note = sortedNotes[i];
        const start = note.start / speed;
        if (start > t) break;
        if (note.end / speed >= t) active.set(note.pitch, note.hand);
      }

      for (let pitch = LOWEST; pitch <= HIGHEST; pitch++) {
        if (isBlack(pitch)) continue;
        const { x, w } = keyRect(pitch, width);
        const hand = active.get(pitch);
        const activeColor =
          hand === "L"
            ? colors.left_hand
            : hand === "R"
              ? colors.right_hand
              : colors.key_highlight;
        ctx.fillStyle = active.has(pitch) ? activeColor : "#f4f4f5";
        ctx.fillRect(x + 0.5, hitY, w - 1, keyboardH);
        ctx.strokeStyle = "#27272a";
        ctx.strokeRect(x + 0.5, hitY, w - 1, keyboardH);
      }
      for (let pitch = LOWEST; pitch <= HIGHEST; pitch++) {
        if (!isBlack(pitch)) continue;
        const { x, w } = keyRect(pitch, width);
        const hand = active.get(pitch);
        const activeColor =
          hand === "L"
            ? colors.left_hand
            : hand === "R"
              ? colors.right_hand
              : colors.key_highlight;
        ctx.fillStyle = active.has(pitch) ? activeColor : "#101012";
        ctx.fillRect(x, hitY, w, keyboardH * 0.62);
      }
    },
    [settings, width, canvasH, speed, fallSpeed, sortedNotes, maxNoteDuration],
  );

  const startPlayback = useCallback(
    (fromSec: number): void => {
      if (!synthRef.current) {
        synthRef.current = new SampledPiano();
      }
      const synth = synthRef.current;
      synth.stop();
      void synth.resumeContext();
      void synth.play(audioNotes, speed, fromSec);
      setPlaying(true);
      setApproxSound(synth.approximate);
      setLoadingSound(false);
    },
    [audioNotes, speed],
  );

  const externalIsPlayingRef = useRef(externalIsPlaying);
  useEffect(() => {
    externalIsPlayingRef.current = externalIsPlaying;
  }, [externalIsPlaying]);

  useEffect(() => {
    synthRef.current?.stop();
    pausedAtRef.current = 0;
    setCurrentTime(0);
    onTimeUpdate?.(0);
    draw(0);
    if (externalIsPlayingRef.current) {
      startPlayback(0);
    } else {
      setPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.notes, data.duration_sec]);

  const prevExternalRef = useRef<boolean | undefined>(externalIsPlaying);
  useEffect(() => {
    if (externalIsPlaying === undefined) return;
    if (prevExternalRef.current !== externalIsPlaying) {
      prevExternalRef.current = externalIsPlaying;
      if (externalIsPlaying && !playing) {
        const fromSec = pausedAtRef.current >= scaledDuration ? 0 : pausedAtRef.current;
        pausedAtRef.current = fromSec;
        setCurrentTime(fromSec);
        onTimeUpdate?.(fromSec);
        startPlayback(fromSec);
      } else if (!externalIsPlaying && playing) {
        synthRef.current?.stop();
        setPlaying(false);
      }
    }
  }, [externalIsPlaying, playing, startPlayback, scaledDuration, onTimeUpdate]);

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
        setCurrentTime(0);
        onTimeUpdate?.(0);
        setPlaying(false);
        if (externalIsPlaying && onTogglePlay) {
          onTogglePlay();
        }
        return;
      }
      pausedAtRef.current = t;
      if (t - lastUiUpdateRef.current > 0.08) {
        lastUiUpdateRef.current = t;
        setCurrentTime(t);
        onTimeUpdate?.(t);
      }
      draw(t);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, draw, scaledDuration, externalIsPlaying, onTogglePlay, onTimeUpdate]);

  const prevSpeedRef = useRef(speed);
  useEffect(() => {
    const prev = prevSpeedRef.current;
    if (prev === speed) return;
    prevSpeedRef.current = speed;
    pausedAtRef.current = (pausedAtRef.current * prev) / speed;
    setCurrentTime(pausedAtRef.current);
    onTimeUpdate?.(pausedAtRef.current);
    if (playing) {
      startPlayback(pausedAtRef.current);
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
      setCurrentTime(pausedAtRef.current);
      onTimeUpdate?.(pausedAtRef.current);
      setPlaying(false);
    } else {
      const fromSec = pausedAtRef.current >= scaledDuration ? 0 : pausedAtRef.current;
      pausedAtRef.current = fromSec;
      setCurrentTime(fromSec);
      onTimeUpdate?.(fromSec);
      startPlayback(fromSec);
    }
  }

  function handlePlayClick() {
    if (onTogglePlay) {
      onTogglePlay();
    } else {
      togglePlay();
    }
  }

  function restart() {
    pausedAtRef.current = 0;
    setCurrentTime(0);
    onTimeUpdate?.(0);
    if (playing) {
      startPlayback(0);
    } else {
      draw(0);
    }
  }

  function seek(value: number) {
    const next = Math.min(Math.max(value, 0), scaledDuration);
    pausedAtRef.current = next;
    setCurrentTime(next);
    onTimeUpdate?.(next);
    if (playing) {
      startPlayback(next);
    } else {
      draw(next);
    }
  }

  function changeSpeed(value: number) {
    const musicalTime = pausedAtRef.current * speed;
    const nextTime = musicalTime / value;
    setPreviewSpeed(value);
    pausedAtRef.current = nextTime;
    setCurrentTime(nextTime);
    if (playing) void startPlayback(nextTime);
  }

  function toggleMute() {
    setPreviewVolume((volume) => (volume > 0 ? 0 : settings.volume || 0.8));
  }

  async function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    } else {
      await el.requestFullscreen().catch(() => undefined);
    }
  }

  function formatTime(seconds: number): string {
    const safe = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safe / 60);
    return `${minutes}:${String(safe % 60).padStart(2, "0")}`;
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <div
        className={`group relative overflow-hidden border border-zinc-800 bg-black ${
          isFullscreen ? "flex h-full items-center justify-center rounded-none" : "rounded-lg"
        }`}
      >
        <canvas
          ref={canvasRef}
          style={{ width, height: canvasH }}
          className="block"
          aria-label={`Falling-note preview: ${data.notes.length} notes, ${Math.round(
            scaledDuration,
          )} seconds at ${speed}x`}
          onClick={handlePlayClick}
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-3 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <input
            type="range"
            min={0}
            max={Math.max(scaledDuration, 0.1)}
            step={0.05}
            value={Math.min(currentTime, scaledDuration)}
            onChange={(event) => seek(Number(event.target.value))}
            className="h-1 w-full cursor-pointer accent-red-500"
            aria-label="Seek preview"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-white">
            <button
              onClick={handlePlayClick}
              disabled={loadingSound}
              className="min-w-16 rounded bg-white px-3 py-1 font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
            >
              {loadingSound ? "Load" : (externalIsPlaying ?? playing) ? "Pause" : "Play"}
            </button>
            <button
              onClick={restart}
              className="rounded border border-white/30 px-2 py-1 hover:bg-white/10"
            >
              Restart
            </button>
            <span className="font-mono text-white/85">
              {formatTime(currentTime)} / {formatTime(scaledDuration)}
            </span>
            <button
              onClick={toggleMute}
              className="rounded border border-white/30 px-2 py-1 hover:bg-white/10"
            >
              {previewVolume > 0 ? "Mute" : "Unmute"}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={previewVolume}
              onChange={(event) => setPreviewVolume(Number(event.target.value))}
              className="w-24 accent-white"
              aria-label="Preview volume"
            />
            <select
              value={String(speed)}
              onChange={(event) => changeSpeed(Number(event.target.value))}
              className="rounded border border-white/30 bg-black/70 px-2 py-1"
              aria-label="Preview speed"
            >
              {PREVIEW_SPEEDS.map((value) => (
                <option key={value} value={String(value)}>
                  {value}x
                </option>
              ))}
            </select>
            <button
              onClick={toggleFullscreen}
              className="ml-auto rounded border border-white/30 px-2 py-1 hover:bg-white/10"
            >
              Fullscreen
            </button>
          </div>
        </div>
      </div>
      <div className="text-xs text-zinc-500">
        {approxSound
          ? "High-quality piano unavailable offline - using basic sound."
          : "Sampled piano preview - export renders studio-quality audio."}
      </div>
    </div>
  );
}
