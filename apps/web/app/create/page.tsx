"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { submitAudio, submitUrl, type TranscribeStatus } from "@/lib/transcribeClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    <main className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-4xl flex-col items-center gap-6 sm:gap-8 px-4 sm:px-6 py-8 sm:py-12">
      {/* Ambient Concert Stage Lighting */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.12),rgba(255,255,255,0))]"
        aria-hidden="true"
      />

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <span>Create Piano Lesson &amp; Transcription</span>
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">🎙️</span>
        </h1>
        <p className="max-w-xl text-sm text-zinc-400 leading-relaxed">
          Drop a MIDI file, audio recording, or paste a link. Demucs isolates piano stems and Transkun neural AI generates interactive falling notes and sheet music.
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
          "relative z-10 flex w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-4 sm:px-8 py-8 sm:py-12 transition-all duration-300 select-none",
          isDragging
            ? "border-cyan-400 bg-cyan-500/10 shadow-xl shadow-cyan-500/20"
            : "border-white/10 bg-[#121215]/80 hover:border-white/20 hover:bg-[#18181b]/80 shadow-lg backdrop-blur-xl",
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
          className="h-12 w-12 text-zinc-400"
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
          <span className="text-sm font-semibold text-white">{file.name}</span>
        ) : (
          <span className="text-sm text-zinc-300 text-center">
            Drop an <strong className="text-cyan-300 font-semibold">audio</strong> or{" "}
            <strong className="text-violet-300 font-semibold">MIDI</strong> file here, or click to browse
          </span>
        )}

        {/* Supported format chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1" data-testid="supported-format-chips">
          <Badge variant="hand-lh">.mp3</Badge>
          <Badge variant="hand-lh">.wav</Badge>
          <Badge variant="hand-rh">.mid</Badge>
          <Badge variant="default">.m4a</Badge>
          <Badge variant="default">Max 50 MB</Badge>
        </div>
      </div>

      {/* File validation error */}
      {fileError && <p className="relative z-10 text-sm text-rose-400 font-medium">{fileError}</p>}

      {/* Audio Waveform Preview & Auditioning */}
      {file && !file.name.toLowerCase().endsWith(".mid") && !file.name.toLowerCase().endsWith(".midi") && (
        <div className="relative z-10 w-full">
          <AudioPreviewWaveform
            file={file}
            fileName={file.name}
            onRemove={() => setFile(null)}
          />
        </div>
      )}

      {/* MIDI File Selected Card */}
      {file && (file.name.toLowerCase().endsWith(".mid") || file.name.toLowerCase().endsWith(".midi")) && (
        <Card className="relative z-10 w-full p-5 rounded-2xl border-white/10 bg-[#121215]/80 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎹</span>
            <div>
              <h4 className="text-sm font-bold text-white">{file.name}</h4>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Standard MIDI File • {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFile(null)}
            className="text-zinc-400 hover:text-rose-400"
          >
            Remove
          </Button>
        </Card>
      )}

      {/* Record audio directly */}
      <div className="relative z-10 w-full">
        <AudioRecorder 
          onRecordingComplete={validateAndSetFile} 
          disabled={isWorking} 
        />
      </div>

      {/* YouTube / TikTok / Social link card */}
      <Card className="relative z-10 flex w-full flex-col gap-3.5 p-6 rounded-2xl border-white/10 bg-[#121215]/80 shadow-xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-zinc-300">
            …or paste a YouTube / TikTok / Instagram link:
          </p>
          <div className="flex items-center gap-1.5" data-testid="social-platform-badges">
            <Badge variant="accent">YouTube</Badge>
            <Badge variant="hand-rh">TikTok</Badge>
            <Badge variant="hand-lh">Instagram</Badge>
          </div>
        </div>
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          className="w-full rounded-xl border border-white/10 bg-[#18181b]/80 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none backdrop-blur-md transition-all"
        />
        <label className="flex cursor-pointer items-start gap-2.5 text-xs text-zinc-300 select-none">
          <input
            type="checkbox"
            checked={rightsAttested}
            onChange={(e) => setRightsAttested(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-zinc-900 text-cyan-500 accent-cyan-400 focus:ring-cyan-500/40"
          />
          <span>I own this content or have permission to transcribe it.</span>
        </label>
        <Button
          variant="secondary"
          size="md"
          disabled={!linkUrl.trim() || !rightsAttested || isWorking}
          onClick={() => void handleTranscribeLink()}
          className="self-start"
        >
          Transcribe from link
        </Button>
        {!isWorking && (!linkUrl.trim() || !rightsAttested) && (
          <p className="text-xs text-zinc-500">
            {!linkUrl.trim()
              ? "Paste a YouTube / TikTok / Instagram link above to enable this."
              : "Tick the box above to confirm you have the rights, then this unlocks."}
          </p>
        )}
      </Card>

      {/* Full-mix toggle */}
      <label className="relative z-10 flex w-full cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-[#121215]/80 p-4 shadow-lg backdrop-blur-xl hover:border-white/20 transition-all select-none">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-zinc-200">
            Full-mix song stem separation
          </span>
          <span className="text-xs text-zinc-400">
            Isolate piano stem with Demucs AI
          </span>
        </div>
        <input
          type="checkbox"
          checked={fullMix}
          onChange={(e) => setFullMix(e.target.checked)}
          className="h-5 w-5 rounded border-white/20 bg-zinc-900 text-cyan-500 accent-cyan-400 cursor-pointer"
        />
      </label>

      {/* Transcribe button — only shown once a file is selected */}
      {file && (
        <div className="relative z-10 w-full flex justify-center">
          <Button
            variant="gradient"
            size="lg"
            className="w-full sm:w-auto shadow-xl shadow-violet-500/20"
            disabled={isWorking || !!fileError}
            onClick={() => void handleTranscribe()}
          >
            {isWorking
              ? "Processing..."
              : file.name.toLowerCase().endsWith(".mid") || file.name.toLowerCase().endsWith(".midi")
              ? "Upload MIDI Project 🎹"
              : "Transcribe Audio 🚀"}
          </Button>
        </div>
      )}

      {/* 3-step progress pipeline */}
      {isWorking && (() => {
        const step1Done = status === "processing" || status === "done" || saving;
        const step1Value = step1Done ? 100 : (status === "uploading" ? Math.max(uploadProgress, 5) : 0);
        const step2Done = status === "done" || saving;
        const step2Value = step2Done ? 100 : (status === "processing" ? processingProgress : 0);
        const step3Done = status === "done";

        return (
          <Card
            data-testid="transcription-progress-pipeline"
            className="w-full max-w-lg p-6 rounded-2xl border-white/10 bg-[#121215]/90 shadow-2xl backdrop-blur-xl flex flex-col gap-4 relative z-10"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                3-Step AI Pipeline Tracker
              </h4>
              <Badge variant="accent" size="sm">
                Demucs + Transkun
              </Badge>
            </div>

            {/* Step 1: Upload */}
            <div className="flex flex-col gap-1.5" data-testid="pipeline-step-upload">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                  <span>Step 1: Upload</span>
                  {step1Done && <Badge variant="success" size="sm">Done</Badge>}
                  {status === "uploading" && <Badge variant="warning" dot size="sm">Uploading...</Badge>}
                </span>
                <span className="font-mono text-zinc-400 tabular-nums">{step1Value}%</span>
              </div>
              <Progress value={step1Value} indeterminate={status === "uploading" && step1Value === 0} />
            </div>

            {/* Step 2: AI Transcription (Demucs + Transkun) */}
            <div className="flex flex-col gap-1.5" data-testid="pipeline-step-transcription">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                  <span>Step 2: AI Transcription (Demucs + Transkun)</span>
                  {step2Done && <Badge variant="success" size="sm">Done</Badge>}
                  {status === "processing" && <Badge variant="warning" dot size="sm">Active</Badge>}
                </span>
                <span className="font-mono text-zinc-400 tabular-nums">
                  {status === "processing" && processingProgress === 0 ? "…" : `${step2Value}%`}
                </span>
              </div>
              <Progress
                value={step2Value}
                indeterminate={status === "processing" && processingProgress === 0}
              />
            </div>

            {/* Step 3: Save to Repertoire */}
            <div className="flex flex-col gap-1.5" data-testid="pipeline-step-save">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                  <span>Step 3: Save to Repertoire</span>
                  {step3Done && <Badge variant="success" size="sm">Done</Badge>}
                  {saving && <Badge variant="accent" dot size="sm">Saving...</Badge>}
                </span>
                <span className="font-mono text-zinc-400 tabular-nums">
                  {saving ? "…" : step3Done ? "100%" : "—"}
                </span>
              </div>
              <Progress value={step3Done ? 100 : 0} indeterminate={saving} />
            </div>
          </Card>
        );
      })()}

      {/* Error message */}
      {errorMsg && (
        <p className="relative z-10 w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-sm text-rose-400">
          {errorMsg}
        </p>
      )}
    </main>
  );
}
