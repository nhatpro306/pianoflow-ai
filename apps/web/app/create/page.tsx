"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { submitAudio, submitUrl, type TranscribeStatus } from "@/lib/transcribeClient";
import { useRequireAuth } from "@/lib/useRequireAuth";

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
const ACCEPTED_TYPES = [".wav", ".mp3", ".m4a", ".mid", ".midi"];

const STATUS_MESSAGES: Record<TranscribeStatus, string> = {
  idle: "",
  uploading: "Uploading audio…",
  processing: "Converting audio to MIDI on GPU…",
  done: "Done!",
  error: "",
};

export default function CreatePage() {
  const router = useRouter();
  const { authenticated } = useRequireAuth();

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [status, setStatus] = useState<TranscribeStatus>("idle");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fullMix, setFullMix] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [rightsAttested, setRightsAttested] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!authenticated) return null;

  function validateAndSetFile(f: File) {
    setFileError(null);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["wav", "mp3", "m4a", "mid", "midi"].includes(ext)) {
      setFileError("Unsupported file type. Please upload a .wav, .mp3, .m4a, or .mid file.");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError("File exceeds 50 MB limit.");
      return;
    }
    setFile(f);
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

  async function saveToProject(midiB64: string, name: string) {
    const bytes = Uint8Array.from(atob(midiB64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "audio/midi" });
    const safe = (name || "Transcription").slice(0, 100);
    const project = await api.createProject(safe);
    const init = await api.initUpload(project.id, `${safe}.mid`, blob.size);
    await api.putToSignedUrl(init, blob);
    await api.confirmUpload(project.id, init.upload_id);
    router.push(`/projects/${encodeURIComponent(project.id)}`);
  }

  async function handleMidiUpload() {
    if (!file) return;
    setSaving(true);
    try {
      const safe = (file.name.replace(/\.[^.]+$/, "") || "Uploaded MIDI").slice(0, 100);
      const project = await api.createProject(safe);
      const init = await api.initUpload(project.id, file.name, file.size);
      await api.putToSignedUrl(init, file);
      await api.confirmUpload(project.id, init.upload_id);
      router.push(`/projects/${encodeURIComponent(project.id)}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed.");
      setSaving(false);
    }
  }

  async function handleTranscribeLink() {
    if (!linkUrl.trim()) return;
    setErrorMsg(null);
    try {
      const options = fullMix
        ? { engine: "transkun", separate: true, stem: "piano" }
        : { engine: "transkun", separate: false };
      const res = await submitUrl(linkUrl.trim(), rightsAttested, options, (s) => setStatus(s));
      setSaving(true);
      await saveToProject(res.midi_b64, "Transcription from link");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleTranscribe() {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (["mid", "midi"].includes(ext)) {
      return handleMidiUpload();
    }
    
    setErrorMsg(null);
    try {
      const options = fullMix
        ? { engine: "transkun", separate: true, stem: "piano" }
        : { engine: "transkun", separate: false };
      const res = await submitAudio(file, options, (s) => setStatus(s));
      setSaving(true);
      await saveToProject(res.midi_b64, file.name.replace(/\.[^.]+$/, "") ?? "Transcription");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    } finally {
      setSaving(false);
    }
  }

  const isWorking = status === "uploading" || status === "processing" || saving;

  function statusText(): string {
    if (saving) return "Saving to project…";
    return STATUS_MESSAGES[status];
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-4xl flex-col items-center gap-8 px-6 py-12">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold text-white">
          Create Project
        </h1>
        <p className="max-w-lg text-sm text-zinc-400">
          Drop a MIDI file, audio file, or paste a link — we&apos;ll prepare an editable lesson.
        </p>
      </div>

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
            Drop an <strong className="text-zinc-200">audio</strong> or{" "}
            <strong className="text-zinc-200">MIDI</strong> file here, or click to browse
          </span>
        )}
        <span className="text-xs text-zinc-600">Max 50 MB</span>
      </div>

      {/* File validation error */}
      {fileError && <p className="text-sm text-red-400">{fileError}</p>}

      {/* Or paste a link */}
      <div className="flex w-full flex-col gap-2">
        <p className="text-xs text-zinc-500">…or paste a YouTube / TikTok / Instagram link:</p>
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none"
        />
        <label className="flex cursor-pointer items-start gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={rightsAttested}
            onChange={(e) => setRightsAttested(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-cyan-400"
          />
          I own this content or have permission to transcribe it.
        </label>
        <button
          disabled={!linkUrl.trim() || !rightsAttested || isWorking}
          onClick={() => void handleTranscribeLink()}
          className="self-start rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-5 py-2 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Transcribe from link
        </button>
        {!isWorking && (!linkUrl.trim() || !rightsAttested) && (
          <p className="text-xs text-zinc-500">
            {!linkUrl.trim()
              ? "Paste a YouTube / TikTok / Instagram link above to enable this."
              : "Tick the box above to confirm you have the rights, then this unlocks."}
          </p>
        )}
      </div>

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

      {/* Transcribe button — only shown once a file is selected (the link flow
          has its own button above) */}
      {file && (
        <button
          disabled={isWorking || !!fileError}
          onClick={() => void handleTranscribe()}
          className="rounded-lg bg-cyan-500 px-8 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isWorking ? statusText() : (file.name.toLowerCase().endsWith(".mid") || file.name.toLowerCase().endsWith(".midi") ? "Upload MIDI project" : "Transcribe audio")}
        </button>
      )}

      {/* Progress indicator */}
      {isWorking && (
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-cyan-400" />
          {statusText()}
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-400">
          {errorMsg}
        </p>
      )}
    </main>
  );
}
