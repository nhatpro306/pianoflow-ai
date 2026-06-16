"use client";

import { useEffect, useRef, useState } from "react";

import { FallingNotePreview } from "@/components/FallingNotePreview";
import { submitAudio, type TranscribeStatus, type TranscribeResult } from "@/lib/transcribeClient";
import type { NoteData, RenderSettings } from "@pianoflow/shared-types";
import { THEME_PRESETS } from "@pianoflow/shared-types";

const DEMO_SETTINGS: RenderSettings = {
  resolution: "720p",
  fps: 60,
  speed_multiplier: 1,
  piano_sound: "concert_grand",
  volume: 0.8,
  reverb: "light",
  difficulty: "original",
  show_note_names: false,
  show_keyboard: true,
  theme_preset: "classic",
  colors: THEME_PRESETS["classic"],
  glow_intensity: 0.7,
  note_fall_speed: 1,
  keyboard_size: 1,
  version: 2,
};

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
const ACCEPTED_TYPES = [".wav", ".mp3", ".m4a"];

const STATUS_MESSAGES: Record<TranscribeStatus, string> = {
  idle: "",
  uploading: "Uploading audio…",
  processing: "Converting audio to MIDI on GPU…",
  done: "Done!",
  error: "",
};

export default function DemoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [status, setStatus] = useState<TranscribeStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<TranscribeResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [exampleData, setExampleData] = useState<NoteData | null>(null);
  const [noteData, setNoteData] = useState<NoteData | null>(null);
  const [fullMix, setFullMix] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/examples/c_scale.json")
      .then((r) => r.json())
      .then((data: NoteData) => setExampleData(data))
      .catch(() => {}); // silently fail — example is optional
  }, []);

  function validateAndSetFile(f: File) {
    setFileError(null);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["wav", "mp3", "m4a"].includes(ext)) {
      setFileError("Unsupported file type. Please upload a .wav, .mp3, or .m4a file.");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError("File exceeds 50 MB limit.");
      return;
    }
    setFile(f);
    setResult(null);
    setErrorMsg(null);
    setStatus("idle");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSetFile(f);
  }

  async function handleTranscribe() {
    if (!file) return;
    setErrorMsg(null);
    setResult(null);
    setNoteData(null);
    try {
      const options = fullMix
        ? { engine: "transkun", separate: true, stem: "piano" }
        : { engine: "transkun", separate: false };
      const res = await submitAudio(file, options, (s) => setStatus(s));
      setResult(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  }

  const isWorking = status === "uploading" || status === "processing";

  // Sync transcription result into noteData when it arrives
  useEffect(() => {
    if (result?.notes) setNoteData(result.notes);
  }, [result]);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-4xl flex-col items-center gap-8 px-6 py-12">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold text-white">
          PianoFlow Demo{" "}
          <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-sm text-cyan-300">Beta</span>
        </h1>
        <p className="max-w-lg text-sm text-zinc-400">
          Drop an audio file and watch AI transcribe it to a falling-notes visualization — live in
          your browser.
        </p>
      </div>

      {/* Pre-baked example */}
      {exampleData && (
        <div className="flex w-full flex-col items-center gap-2">
          <p className="text-xs text-zinc-500">No audio? Try an instant example:</p>
          <button
            onClick={() => setNoteData(exampleData)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white hover:border-violet-500 hover:bg-zinc-800"
          >
            ▶ C Major Scale (pre-baked)
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Audio file drop zone"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={[
          "flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-8 py-12 transition-colors",
          isDragging
            ? "border-cyan-400 bg-cyan-500/10"
            : "border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-800/60",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={handleFileChange}
        />
        <svg
          className="h-10 w-10 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
        {file ? (
          <span className="text-sm font-medium text-white">{file.name}</span>
        ) : (
          <span className="text-sm text-zinc-400">
            Drop a <strong className="text-zinc-200">.wav</strong>,{" "}
            <strong className="text-zinc-200">.mp3</strong>, or{" "}
            <strong className="text-zinc-200">.m4a</strong> file here, or click to browse
          </span>
        )}
        <span className="text-xs text-zinc-600">Max 50 MB</span>
      </div>

      {/* File validation error */}
      {fileError && <p className="text-sm text-red-400">{fileError}</p>}

      {/* Full-mix toggle */}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
        <input
          type="checkbox"
          checked={fullMix}
          onChange={(e) => setFullMix(e.target.checked)}
          className="h-4 w-4 accent-cyan-400"
        />
        Full-mix song (isolate piano stem with Demucs)
      </label>

      {/* Transcribe button */}
      <button
        disabled={!file || isWorking || !!fileError}
        onClick={() => void handleTranscribe()}
        className="rounded-lg bg-cyan-500 px-8 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isWorking ? STATUS_MESSAGES[status] : "Transcribe"}
      </button>

      {/* Progress indicator */}
      {isWorking && (
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-cyan-400" />
          {STATUS_MESSAGES[status]}
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-400">
          {errorMsg}
        </p>
      )}

      {/* Falling-notes preview */}
      {noteData && (
        <div className="w-full">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Falling-note preview</h2>
          <FallingNotePreview data={noteData} settings={DEMO_SETTINGS} />
        </div>
      )}
    </main>
  );
}
