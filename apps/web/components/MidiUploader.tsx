"use client";

import { LIMITS } from "@pianoflow/shared-types";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { api, ApiError } from "@/lib/api";

type Stage = "idle" | "creating" | "uploading" | "analyzing" | "error";

const STAGE_LABEL: Record<Stage, string> = {
  idle: "",
  creating: "Creating project…",
  uploading: "Uploading…",
  analyzing: "Analyzing your MIDI…",
  error: "",
};

function defaultName(filename: string): string {
  return filename.replace(/\.(mid|midi)$/i, "").slice(0, 120) || "Untitled";
}

export function MidiUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const pick = useCallback((candidate: File | undefined) => {
    setError(null);
    if (!candidate) return;
    if (!/\.(mid|midi)$/i.test(candidate.name)) {
      setError("Only .mid / .midi files are accepted.");
      return;
    }
    if (candidate.size > LIMITS.MAX_MIDI_BYTES) {
      setError(`File is too large (max ${LIMITS.MAX_MIDI_BYTES / 1024 / 1024} MB).`);
      return;
    }
    setFile(candidate);
    setName(defaultName(candidate.name));
  }, []);

  async function submit() {
    if (!file) return;
    setError(null);
    try {
      setStage("creating");
      const project = await api.createProject(name || defaultName(file.name));

      setStage("uploading");
      const init = await api.initUpload(project.id, file.name, file.size);
      await api.putToSignedUrl(init, file);

      setStage("analyzing");
      await api.confirmUpload(project.id, init.upload_id);

      router.push(`/projects/${project.id}`);
    } catch (exc) {
      setStage("error");
      if (exc instanceof ApiError && exc.code === "INVALID_MIDI") {
        setError("This file isn't a valid MIDI. Try exporting again from your app as .mid.");
      } else {
        setError(exc instanceof Error ? exc.message : "Upload failed.");
      }
    }
  }

  const busy = stage === "creating" || stage === "uploading" || stage === "analyzing";

  return (
    <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
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
        <span className="text-3xl">🎹</span>
        {file ? (
          <span className="font-medium text-zinc-200">{file.name}</span>
        ) : (
          <>
            <span className="text-zinc-300">Drop a MIDI file here or click to browse</span>
            <span className="text-xs text-zinc-500">
              .mid / .midi · max {LIMITS.MAX_MIDI_BYTES / 1024 / 1024} MB · max{" "}
              {LIMITS.MAX_SONG_SECONDS / 60} min
            </span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".mid,.midi"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>

      {file && (
        <div className="mt-4 flex flex-col gap-3">
          <label className="text-xs text-zinc-400" htmlFor="project-name">
            Project name
          </label>
          <input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
          />
          <button
            onClick={submit}
            disabled={busy || !name.trim()}
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? STAGE_LABEL[stage] : "Upload & analyze"}
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
