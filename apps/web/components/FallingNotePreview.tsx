"use client";

import { api } from "@/lib/api";
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
const PREVIEW_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export function FallingNotePreview({ data, settings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SampledPiano | null>(null);
  const rafRef = useRef<number>(0);
  const pausedAtRef = useRef(0);
  const lastUiUpdateRef = useRef(0);

  const [width, setWidth] = useState(900);
  const [playing, setPlaying] = useState(false);
  const [loadingSound, setLoadingSound] = useState(false);
  const [approxSound, setApproxSound] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [previewSpeed, setPreviewSpeed] = useState(settings.speed_multiplier);
  const [previewVolume, setPreviewVolume] = useState(settings.volume);

  const [remoteToken, setRemoteToken] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [showRemoteDialog, setShowRemoteDialog] = useState(false);
  const [remoteQr, setRemoteQr] = useState<string | null>(null);
  const [remoteCopied, setRemoteCopied] = useState(false);
  const remoteSeqRef = useRef(0);
  const playingRef = useRef(playing);
  const handlersRef = useRef({ togglePlay: () => {}, restart: () => {}, seek: (_: number) => {}, changeSpeed: (_: number) => {} });

  const audioNotes = useMemo(() => applySustain(data), [data]);
  const speed = previewSpeed;
  const scaledDuration = data.duration_sec / speed;
  const fallSpeed = BASE_FALL_PX_PER_SEC * settings.note_fall_speed;

  useEffect(() => setPreviewSpeed(settings.speed_multiplier), [settings.speed_multiplier]);
  useEffect(() => setPreviewVolume(settings.volume), [settings.volume]);

  useEffect(() => { playingRef.current = playing; }, [playing]);
  // Keep handlersRef current every render so the polling interval never has stale closures.
  useEffect(() => { handlersRef.current = { togglePlay, restart, seek, changeSpeed }; });

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

  useEffect(() => {
    synthRef.current?.configure({
      sound: settings.piano_sound,
      volume: previewVolume,
      reverb: settings.reverb,
    });
  }, [settings.piano_sound, previewVolume, settings.reverb]);

  useEffect(() => {
    if (!remoteUrl) return;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(remoteUrl, { width: 192, margin: 1 }).then(setRemoteQr);
    });
  }, [remoteUrl]);

  useEffect(() => {
    if (!remoteToken) return;
    const id = window.setInterval(async () => {
      try {
        const session = await api.getRemoteSession(remoteToken);
        if (session.seq <= remoteSeqRef.current) return;
        remoteSeqRef.current = session.seq;
        const h = handlersRef.current;
        switch (session.action) {
          case "play":
            if (!playingRef.current) h.togglePlay();
            break;
          case "pause":
            if (playingRef.current) h.togglePlay();
            break;
          case "restart":
            h.restart();
            break;
          case "seek_fwd":
            h.seek(pausedAtRef.current + 10);
            break;
          case "seek_back":
            h.seek(Math.max(0, pausedAtRef.current - 10));
            break;
          case "speed":
            if (session.value != null) h.changeSpeed(session.value);
            break;
        }
      } catch {
        setRemoteToken(null);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [remoteToken]);

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

      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, width, CANVAS_H);

      const visibleSpan = hitY / fallSpeed;
      ctx.save();
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 24 * settings.glow_intensity;
      for (const note of data.notes) {
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

      const fog = ctx.createLinearGradient(0, hitY - 80, 0, hitY);
      fog.addColorStop(0, "rgba(255,255,255,0)");
      fog.addColorStop(1, `rgba(255,255,255,${0.1 + settings.glow_intensity * 0.12})`);
      ctx.fillStyle = fog;
      ctx.fillRect(0, hitY - 80, width, 80);

      ctx.save();
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 16;
      ctx.fillStyle = colors.hit_effect;
      ctx.fillRect(0, hitY - 2, width, 2.5);
      ctx.restore();

      if (!settings.show_keyboard) return;

      const active = new Map<number, string>();
      for (const note of data.notes) {
        const start = note.start / speed;
        if (start > t) break;
        if (note.end / speed >= t) active.set(note.pitch, note.hand);
      }

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
        setPlaying(false);
        return;
      }
      pausedAtRef.current = t;
      if (t - lastUiUpdateRef.current > 0.2) {
        lastUiUpdateRef.current = t;
        setCurrentTime(t);
      }
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

  const prevSpeedRef = useRef(speed);
  useEffect(() => {
    const prev = prevSpeedRef.current;
    if (prev === speed) return;
    prevSpeedRef.current = speed;
    pausedAtRef.current = (pausedAtRef.current * prev) / speed;
    setCurrentTime(pausedAtRef.current);
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
      setCurrentTime(pausedAtRef.current);
      setPlaying(false);
    } else {
      void startPlayback(pausedAtRef.current).then(() => setPlaying(true));
    }
  }

  function restart() {
    pausedAtRef.current = 0;
    setCurrentTime(0);
    if (playing) {
      void startPlayback(0);
    } else {
      draw(0);
    }
  }

  function seek(value: number) {
    const next = Math.min(Math.max(value, 0), scaledDuration);
    pausedAtRef.current = next;
    setCurrentTime(next);
    if (playing) {
      void startPlayback(next);
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

  async function startRemote() {
    try {
      const session = await api.createRemoteSession();
      const url = `${window.location.origin}/remote/${session.token}`;
      remoteSeqRef.current = 0;
      setRemoteToken(session.token);
      setRemoteUrl(url);
      setRemoteQr(null);
      setShowRemoteDialog(true);
    } catch {
      // Redis unavailable or network error
    }
  }

  function stopRemote() {
    setRemoteToken(null);
    setRemoteUrl(null);
    setRemoteQr(null);
    setShowRemoteDialog(false);
  }

  async function copyRemoteUrl() {
    if (!remoteUrl) return;
    await navigator.clipboard.writeText(remoteUrl);
    setRemoteCopied(true);
    setTimeout(() => setRemoteCopied(false), 2000);
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
      <div className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-black">
        <canvas
          ref={canvasRef}
          style={{ width, height: CANVAS_H }}
          className="block"
          aria-label={`Falling-note preview: ${data.notes.length} notes, ${Math.round(
            scaledDuration,
          )} seconds at ${speed}x`}
          onClick={togglePlay}
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
              onClick={togglePlay}
              disabled={loadingSound}
              className="min-w-16 rounded bg-white px-3 py-1 font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
            >
              {loadingSound ? "Load" : playing ? "Pause" : "Play"}
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
              onClick={remoteToken ? () => setShowRemoteDialog(true) : startRemote}
              className={`rounded border px-2 py-1 hover:bg-white/10 ${
                remoteToken
                  ? "border-green-400/60 text-green-400"
                  : "border-white/30"
              }`}
              title={remoteToken ? "Remote active — click to show link" : "Open mobile remote"}
            >
              {remoteToken ? "● Remote" : "Remote"}
            </button>
            <button
              onClick={toggleFullscreen}
              className="ml-auto rounded border border-white/30 px-2 py-1 hover:bg-white/10"
            >
              Fullscreen
            </button>
          </div>
        </div>
      </div>
      {showRemoteDialog && remoteUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">Mobile Remote</h2>
              <button
                onClick={() => setShowRemoteDialog(false)}
                className="text-zinc-400 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm text-zinc-400">
              Scan this QR code or open the link on your phone to control playback.
            </p>
            {remoteQr ? (
              <img
                src={remoteQr}
                alt="Remote control QR code"
                className="mx-auto mb-4 rounded-lg"
                width={192}
                height={192}
              />
            ) : (
              <div className="mx-auto mb-4 flex h-48 w-48 items-center justify-center rounded-lg bg-zinc-800 text-sm text-zinc-500">
                Generating…
              </div>
            )}
            <div className="mb-4 flex gap-2">
              <input
                readOnly
                value={remoteUrl}
                className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300"
              />
              <button
                onClick={copyRemoteUrl}
                className="rounded bg-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-600"
              >
                {remoteCopied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button
              onClick={stopRemote}
              className="w-full rounded border border-red-500/40 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
            >
              Stop Remote
            </button>
          </div>
        </div>
      )}
      <div className="text-xs text-zinc-500">
        {approxSound
          ? "High-quality piano unavailable offline - using basic sound."
          : "Sampled piano preview - export renders studio-quality audio."}
      </div>
    </div>
  );
}
