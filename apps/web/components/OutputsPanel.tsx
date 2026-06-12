"use client";

import { useState } from "react";

import { api, type Output } from "@/lib/api";

const KIND_LABELS: Record<string, string> = {
  sheet_pdf: "Sheet music (PDF)",
  sheet_musicxml: "Sheet music (MusicXML)",
  simplified_midi: "Simplified MIDI",
  draft_midi: "Draft MIDI (transcription)",
  video_mp4: "Tutorial video",
};

function kindLabel(output: Output): string {
  const base = KIND_LABELS[output.kind] ?? output.kind;
  const difficulty = output.metadata?.difficulty;
  if (output.kind === "simplified_midi" && typeof difficulty === "string") {
    return `${base} — ${difficulty.replace("_", " ")}`;
  }
  return base;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OutputsPanel({ outputs }: { outputs: Output[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (outputs.length === 0) return null;

  async function download(output: Output) {
    setBusyId(output.id);
    setError(null);
    try {
      const { download_url } = await api.createDownloadUrl(output.id);
      window.open(download_url, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function watch(output: Output) {
    setBusyId(output.id);
    setError(null);
    try {
      const { stream_url } = await api.createStreamUrl(output.id);
      setStreamUrl(stream_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start playback.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="text-sm font-semibold">Exports</h3>
      <ul className="flex flex-col gap-2">
        {outputs.map((output) => (
          <li
            key={output.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2"
          >
            <div className="flex flex-col">
              <span className="text-sm text-zinc-200">{kindLabel(output)}</span>
              <span className="text-xs text-zinc-500">
                {formatSize(output.size_bytes)} ·{" "}
                {new Date(output.created_at).toLocaleString()}
                {output.kind === "video_mp4" && " · view-only, no download"}
              </span>
            </div>
            <div className="flex gap-2">
              {output.downloadable && (
                <button
                  disabled={busyId === output.id}
                  onClick={() => download(output)}
                  className="rounded-md border border-cyan-700 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-950 disabled:opacity-50"
                >
                  Download
                </button>
              )}
              {output.streamable && (
                <button
                  disabled={busyId === output.id}
                  onClick={() => watch(output)}
                  className="rounded-md border border-amber-700 px-3 py-1 text-xs text-amber-300 hover:bg-amber-950 disabled:opacity-50"
                >
                  Watch
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {streamUrl && (
        <video
          src={streamUrl}
          controls
          autoPlay
          className="w-full rounded-md border border-zinc-800"
        />
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
