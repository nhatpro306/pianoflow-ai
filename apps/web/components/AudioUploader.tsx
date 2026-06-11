"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { api, ApiError } from "@/lib/api";

type Stage = "idle" | "creating" | "uploading" | "transcribing" | "error";

const STAGE_LABEL: Record<Stage, string> = {
  idle: "",
  creating: "Creating project…",
  uploading: "Uploading…",
  transcribing: "Starting transcription…",
  error: "",
};

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const AUDIO_PATTERN = /\.(wav|mp3|m4a)$/i;

function defaultName(filename: string): string {
  return filename.replace(AUDIO_PATTERN, "").slice(0, 120) || "Untitled";
}

export function AudioUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const pick = useCallback((candidate: File | undefined) => {
    setError(null);
    if (!candidate) return;
    if (!AUDIO_PATTERN.test(candidate.name)) {
      setError("Only .wav / .mp3 / .m4a files are accepted in the Beta.");
      return;
    }
    if (candidate.size > MAX_AUDIO_BYTES) {
      setError(`File is too large (max ${MAX_AUDIO_BYTES / 1024 / 1024} MB).`);
      return;
    }
    setFile(candidate);
    setName(defaultName(candidate.name));
  }, []);

  async function submit() {
    if (!file || !rightsConfirmed) return;
    setError(null);
    try {
      setStage("creating");
      const project = await api.createProject(name || defaultName(file.name));

      setStage("uploading");
      const init = await api.initAudioUpload(project.id, file.name, file.size, rightsConfirmed);
      await api.putToSignedUrl(init, file);

      setStage("transcribing");
      await api.confirmAudioUpload(project.id, init.upload_id);

      router.push(`/projects/${project.id}`);
    } catch (exc) {
      setStage("error");
      if (exc instanceof ApiError && exc.code === "RIGHTS_ATTESTATION_REQUIRED") {
        setError("Please confirm you have the rights to process this file.");
      } else if (exc instanceof ApiError && exc.code === "AUDIO_TRANSCRIPTION_NOT_ENABLED") {
        setError("Audio transcription is not enabled on this server yet.");
      } else {
        setError(exc instanceof Error ? exc.message : "Upload failed.");
      }
    }
  }

  const busy = stage === "creating" || stage === "uploading" || stage === "transcribing";

  return (
    <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="mb-4 rounded-md border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
        <p>Audio transcription works best with clean solo piano recordings.</p>
        <p>The generated MIDI is an editable draft and may need correction.</p>
        <p>Only upload audio that you own or have permission to use.</p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={`flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm transition ${
          dragging ? "border-cyan-400 bg-cyan-400/5" : "border-zinc-700 hover:border-zinc-500"
        }`}
      >
        <span className="text-3xl">🎤</span>
        {file ? (
          <span className="font-medium text-zinc-200">{file.name}</span>
        ) : (
          <>
            <span className="text-zinc-300">Drop an audio file here or click to browse</span>
            <span className="text-xs text-zinc-500">
              .wav / .mp3 / .m4a · max {MAX_AUDIO_BYTES / 1024 / 1024} MB · max 3 min · solo piano
            </span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".wav,.mp3,.m4a"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>

      {file && (
        <div className="mt-4 flex flex-col gap-3">
          <label className="text-xs text-zinc-400" htmlFor="audio-project-name">
            Project name
          </label>
          <input
            id="audio-project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
          />
          <label className="flex items-start gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={rightsConfirmed}
              onChange={(e) => setRightsConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I confirm that I own this file or have permission to process it with PianoFlow AI.
            </span>
          </label>
          <button
            onClick={submit}
            disabled={busy || !name.trim() || !rightsConfirmed}
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? STAGE_LABEL[stage] : "Upload & create draft MIDI"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
