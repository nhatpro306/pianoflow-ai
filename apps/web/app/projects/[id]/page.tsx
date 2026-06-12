"use client";

import type { RenderSettings } from "@pianoflow/shared-types";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";

import { FallingNotePreview } from "@/components/FallingNotePreview";
import { OutputsPanel } from "@/components/OutputsPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ApiError, api } from "@/lib/api";
import {
  useJob,
  useNotes,
  useOutputs,
  usePatchSettings,
  useProject,
  useSettings,
} from "@/lib/hooks";

export default function ProjectEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const project = useProject(id);
  const ready = project.data?.status === "ready";
  const activeJobId = project.data?.active_jobs?.[0]?.id ?? null;
  const activeJob = useJob(activeJobId);
  const notes = useNotes(id, ready);
  const serverSettings = useSettings(id);
  const patchSettings = usePatchSettings(id);

  // Local optimistic settings: preview reacts instantly; PATCH debounced.
  const [local, setLocal] = useState<RenderSettings | null>(null);
  const pendingRef = useRef<Partial<RenderSettings>>({});
  const timerRef = useRef<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [viewSimplified, setViewSimplified] = useState(false);
  const simplifiedNotes = useNotes(
    id,
    ready && viewSimplified && local?.difficulty !== "original",
    local?.difficulty,
  );
  const hasActiveJobs = (project.data?.active_jobs?.length ?? 0) > 0;
  const outputs = useOutputs(id, Boolean(ready), hasActiveJobs);

  // When the polled job finishes, pick up new outputs and project summary
  // (e.g. analysis_summary.simplified_notes) without a manual reload.
  const jobStatus = activeJob.data?.status;
  useEffect(() => {
    if (jobStatus === "completed" || jobStatus === "failed") {
      project.refetch();
      outputs.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobStatus]);

  useEffect(() => {
    if (serverSettings.data && local === null) setLocal(serverSettings.data);
  }, [serverSettings.data, local]);

  function onChange(patch: Partial<RenderSettings>) {
    setLocal((prev) => (prev ? ({ ...prev, ...patch } as RenderSettings) : prev));
    pendingRef.current = { ...pendingRef.current, ...patch };
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const pending = pendingRef.current;
      pendingRef.current = {};
      patchSettings.mutate(pending, {
        // Server is authoritative (presets fill colors server-side).
        onSuccess: (saved) => setLocal(saved),
      });
    }, 500);
  }

  if (project.isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-900" />
        <div className="mt-6 h-96 animate-pulse rounded-xl bg-zinc-900" />
      </main>
    );
  }

  if (project.isError) {
    const notFound = project.error instanceof ApiError && project.error.status === 404;
    return (
      <main className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 py-24 text-center">
        <p className="text-lg text-zinc-300">
          {notFound ? "Project not found." : "Could not load this project."}
        </p>
        <Link href="/projects" className="text-cyan-400 hover:underline">
          ← Back to projects
        </Link>
      </main>
    );
  }

  const p = project.data!;
  const summary = p.analysis_summary;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-2xl font-bold">{p.name}</h1>
        {summary && (
          <span className="font-mono text-sm text-zinc-400">
            {summary.bpm} BPM · {Math.floor(summary.duration_sec / 60)}:
            {String(Math.round(summary.duration_sec % 60)).padStart(2, "0")} ·{" "}
            {summary.note_count} notes · {summary.track_count} tracks · hands:{" "}
            {summary.hand_split ?? "—"} <span className="text-zinc-600">(estimate)</span>
          </span>
        )}
      </div>

      {p.status === "failed" && (
        <p className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          Parsing failed — the uploaded file isn&apos;t a valid MIDI.{" "}
          <Link href="/upload" className="underline">
            Try another file
          </Link>
          .
        </p>
      )}

      {(p.status === "parsing" || p.status === "created") && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-400">
            {activeJob.data?.progress_message ?? "Analyzing your MIDI..."}
          </p>
          {activeJob.data && (
            <div className="h-2 overflow-hidden rounded bg-zinc-900">
              <div
                className="h-full bg-cyan-400 transition-all"
                style={{ width: `${activeJob.data.progress}%` }}
              />
            </div>
          )}
          <div className="h-96 animate-pulse rounded-xl bg-zinc-900" />
        </div>
      )}

      {ready && (notes.isLoading || !local) && (
        <div className="h-96 animate-pulse rounded-xl bg-zinc-900" />
      )}

      {ready && notes.data && local && (
        <div className="flex flex-col gap-6">
          {/* Generate / Export actions */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
            {local.difficulty !== "original" && (
              <>
                <button
                  disabled={generating}
                  onClick={async () => {
                    setGenerating(true);
                    setGenerateError(null);
                    try {
                      await api.simplifyMidi(id);
                      project.refetch();
                    } catch (e) {
                      setGenerateError(e instanceof Error ? e.message : "Failed to simplify.");
                    } finally {
                      setGenerating(false);
                    }
                  }}
                  className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
                >
                  {generating ? "Simplifying…" : `Simplify (${local.difficulty.replace("_", " ")})`}
                </button>
                {p.analysis_summary?.simplified_notes?.[local.difficulty] && (
                  <button
                    onClick={() => setViewSimplified((v) => !v)}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      viewSimplified
                        ? "border-amber-400 text-amber-300"
                        : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    {viewSimplified ? "Viewing simplified" : "View simplified"}
                  </button>
                )}
              </>
            )}
            <button
              disabled={generating}
              onClick={async () => {
                setGenerating(true);
                setGenerateError(null);
                try {
                  await api.renderVideo(id);
                  project.refetch();
                } catch (e) {
                  setGenerateError(e instanceof Error ? e.message : "Failed to start video render.");
                } finally {
                  setGenerating(false);
                }
              }}
              className="rounded-md border border-cyan-700 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-950 disabled:opacity-50"
            >
              Render Video
            </button>
            <button
              disabled={generating}
              onClick={async () => {
                setGenerating(true);
                setGenerateError(null);
                try {
                  await api.renderSheet(id);
                  project.refetch();
                } catch (e) {
                  setGenerateError(e instanceof Error ? e.message : "Failed to start sheet render.");
                } finally {
                  setGenerating(false);
                }
              }}
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              Render Sheet PDF
            </button>
            {generateError && (
              <p className="text-sm text-red-400">{generateError}</p>
            )}
          </div>

          {activeJob.data &&
            (activeJob.data.status === "queued" || activeJob.data.status === "processing") && (
              <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <p className="text-sm text-zinc-400">
                  {activeJob.data.job_type.replace("_", " ")}:{" "}
                  {activeJob.data.progress_message ?? "Working..."}
                </p>
                <div className="h-2 overflow-hidden rounded bg-zinc-900">
                  <div
                    className="h-full bg-cyan-400 transition-all"
                    style={{ width: `${activeJob.data.progress}%` }}
                  />
                </div>
              </div>
            )}

          <OutputsPanel outputs={outputs.data?.items ?? []} />

          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="min-w-0 flex-1">
              {viewSimplified && simplifiedNotes.data ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-amber-400">
                    Simplified ({local.difficulty.replace("_", " ")}) ·{" "}
                    {simplifiedNotes.data.notes.length} notes
                    {" "}(original: {notes.data.notes.length})
                  </p>
                  <FallingNotePreview data={simplifiedNotes.data} settings={local} />
                </div>
              ) : (
                <FallingNotePreview data={notes.data} settings={local} />
              )}
            </div>
            <SettingsPanel
              settings={local}
              durationSec={notes.data.duration_sec}
              onChange={onChange}
            />
          </div>
        </div>
      )}
    </main>
  );
}
