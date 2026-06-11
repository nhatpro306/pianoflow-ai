"use client";

import type { RenderSettings } from "@pianoflow/shared-types";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";

import { FallingNotePreview } from "@/components/FallingNotePreview";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ApiError } from "@/lib/api";
import { useJob, useNotes, usePatchSettings, useProject, useSettings } from "@/lib/hooks";

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
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1">
            <FallingNotePreview data={notes.data} settings={local} />
          </div>
          <SettingsPanel
            settings={local}
            durationSec={notes.data.duration_sec}
            onChange={onChange}
          />
        </div>
      )}
    </main>
  );
}
