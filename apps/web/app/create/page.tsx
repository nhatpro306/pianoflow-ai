"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { submitAudio, submitUrl, type TranscribeStatus } from "@/lib/transcribeClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { Progress } from "@/components/ui/Progress";
import { AudioRecorder } from "@/components/AudioRecorder";
import { AudioPreviewWaveform } from "@/components/AudioPreviewWaveform";

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
const ACCEPTED_TYPES = [".wav", ".mp3", ".m4a", ".mid", ".midi", ".webm"];

export default function CreatePage() {
  const router = useRouter();
  const { authenticated } = useRequireAuth();

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [status, setStatus] = useState<TranscribeStatus>("idle");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [fullMix, setFullMix] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [rightsAttested, setRightsAttested] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!authenticated) return null;

  function validateAndSetFile(f: File) {
    setFileError(null);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["wav", "mp3", "m4a", "mid", "midi", "webm"].includes(ext)) {
      setFileError("Unsupported file type. Please upload a .wav, .mp3, .m4a, .webm, or .mid file.");
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
    await api.putToSignedUrl(init, blob, setUploadProgress);
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
      await api.putToSignedUrl(init, file, setUploadProgress);
      await api.confirmUpload(project.id, init.upload_id);
      router.push(`/projects/${encodeURIComponent(project.id)}`);
    } catch (err) {
      console.error("Transcribe/Save Error:", err);
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setErrorMsg(msg === "Failed to fetch" ? "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại." : msg);
      setSaving(false);
    }
  }

  async function handleTranscribeLink() {
    let cleanedUrl = linkUrl.trim();
    if (cleanedUrl && !cleanedUrl.startsWith("http://") && !cleanedUrl.startsWith("https://")) {
      cleanedUrl = `https://${cleanedUrl}`;
    }
    if (!cleanedUrl) return;
    setErrorMsg(null);
    try {
      const options = fullMix
        ? { engine: "transkun", separate: true, stem: "piano" }
        : { engine: "transkun", separate: false };
      const res = await submitUrl(cleanedUrl, rightsAttested, options, (s) => setStatus(s), setProcessingProgress);
      setSaving(true);
      await saveToProject(res.midi_b64, "Transcription from link");
    } catch (err) {
      console.error("Transcribe/Save Error:", err);
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
        setErrorMsg(msg === "Failed to fetch" ? "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại." : msg);
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
      const res = await submitAudio(file, options, (s) => setStatus(s), setProcessingProgress);
      setSaving(true);
      await saveToProject(res.midi_b64, file.name.replace(/\.[^.]+$/, "") ?? "Transcription");
    } catch (err) {
      console.error("Transcribe/Save Error:", err);
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
        setErrorMsg(msg === "Failed to fetch" ? "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại." : msg);
      }
    } finally {
      setSaving(false);
    }
  }

  const isWorking = status === "uploading" || status === "processing" || saving;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-4xl flex-col items-center gap-6 sm:gap-8 px-4 sm:px-6 py-8 sm:py-12">
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
          "flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 sm:px-8 py-8 sm:py-12 transition-colors",
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
        <span className="text-xs text-zinc-500">Max 50 MB</span>
      </div>

      {/* File validation error */}
      {fileError && <p className="text-sm text-red-400">{fileError}</p>}

      {/* Audio Waveform Preview & Auditioning (Phase K) */}
      {file && !file.name.toLowerCase().endsWith(".mid") && !file.name.toLowerCase().endsWith(".midi") && (
        <AudioPreviewWaveform
          file={file}
          fileName={file.name}
          onRemove={() => setFile(null)}
        />
      )}

      {/* MIDI File Selected Card */}
      {file && (file.name.toLowerCase().endsWith(".mid") || file.name.toLowerCase().endsWith(".midi")) && (
        <div className="w-full p-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎹</span>
            <div>
              <h4 className="text-sm font-bold text-white">{file.name}</h4>
              <p className="text-xs text-zinc-400 font-mono">
                Standard MIDI File • {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="text-xs text-zinc-400 hover:text-rose-400 font-semibold transition"
          >
            Remove
          </button>
        </div>
      )}

      {/* Record audio directly */}
      <AudioRecorder 
        onRecordingComplete={validateAndSetFile} 
        disabled={isWorking} 
      />

      {/* Or paste a link */}
      <div className="flex w-full flex-col gap-2">
        <p className="text-xs text-zinc-500">…or paste a YouTube / TikTok / Instagram link:</p>
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none"
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
          className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-8 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isWorking ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
          ) : file.name.toLowerCase().endsWith(".mid") || file.name.toLowerCase().endsWith(".midi") ? (
            "Upload MIDI project"
          ) : (
            "Transcribe audio"
          )}
        </button>
      )}

      {/* 3-step progress pipeline */}
      {isWorking && (() => {
        const step1Done = status === "processing" || status === "done" || saving;
        const step1Value = step1Done ? 100 : (status === "uploading" ? Math.max(uploadProgress, 5) : 0);
        const step2Done = status === "done" || saving;
        const step2Value = step2Done ? 100 : (status === "processing" ? processingProgress : 0);
        const step3Done = status === "done";

        return (
          <div className="w-full max-w-md flex flex-col gap-4">
            {/* Step 1: Upload */}
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${step1Done ? "bg-cyan-400/20 text-cyan-400" : status === "uploading" ? "bg-cyan-400/10 text-cyan-400 animate-pulse" : "bg-zinc-800 text-zinc-600"}`}>
                {step1Done ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13" /></svg>
                )}
              </div>
              <div className="flex-1">
                <Progress value={step1Value} />
              </div>
              <span className="w-10 text-right text-xs tabular-nums text-zinc-400">
                {step1Value}%
              </span>
            </div>

            {/* Step 2: AI Processing */}
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${step2Done ? "bg-cyan-400/20 text-cyan-400" : status === "processing" ? "bg-cyan-400/10 text-cyan-400 animate-pulse" : "bg-zinc-800 text-zinc-600"}`}>
                {step2Done ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" /></svg>
                )}
              </div>
              <div className="flex-1">
                {status === "processing" && processingProgress === 0 ? (
                  <Progress indeterminate />
                ) : (
                  <Progress value={step2Value} />
                )}
              </div>
              <span className="w-10 text-right text-xs tabular-nums text-zinc-400">
                {status === "processing" && processingProgress === 0 ? "…" : `${step2Value}%`}
              </span>
            </div>

            {/* Step 3: Save */}
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${step3Done ? "bg-cyan-400/20 text-cyan-400" : saving ? "bg-cyan-400/10 text-cyan-400 animate-pulse" : "bg-zinc-800 text-zinc-600"}`}>
                {step3Done ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                )}
              </div>
              <div className="flex-1">
                {saving ? (
                  <Progress indeterminate />
                ) : (
                  <Progress value={step3Done ? 100 : 0} />
                )}
              </div>
              <span className="w-10 text-right text-xs tabular-nums text-zinc-400">
                {saving ? "…" : step3Done ? "100%" : "—"}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Error message */}
      {errorMsg && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-400">
          {errorMsg}
        </p>
      )}
    </main>
  );
}
