"use client";

import type { RenderSettings } from "@pianoflow/shared-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FallingNotePreview } from "@/components/FallingNotePreview";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Progress } from "@/components/ui/Progress";
import { api, ApiError } from "@/lib/api";
import { useJob, useNotes, useOutputs, usePatchSettings, useProject, useSettings } from "@/lib/hooks";
import { useRouter } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  SIMPLIFIED_NOTES_NOT_READY: "Generate the beginner MIDI first.",
  NOTES_NOT_READY: "Notes are still processing. They will appear automatically.",
};

function getFriendlyError(code: string | undefined | null, fallback: string) {
  return ERROR_MESSAGES[code as string] || fallback;
}

export function ProjectEditor({ id }: { id: string }) {
  const project = useProject(id);
  const ready = project.data?.status === "ready";
  const activeJobId = project.data?.active_jobs?.[0]?.id ?? null;
  const activeJob = useJob(activeJobId);
  const serverSettings = useSettings(id);
  const patchSettings = usePatchSettings(id);
  const queryClient = useQueryClient();
  const router = useRouter();

  const [local, setLocal] = useState<RenderSettings | null>(null);
  const [sheetJobId, setSheetJobId] = useState<string | null>(null);
  const [videoJobId, setVideoJobId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const pendingRef = useRef<Partial<RenderSettings>>({});
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (serverSettings.data && local === null) setLocal(serverSettings.data);
  }, [serverSettings.data, local]);

  const difficulty = local?.difficulty ?? serverSettings.data?.difficulty ?? "original";
  const notes = useNotes(id, ready, difficulty);

  async function syncPendingSettings() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = {};
    if (Object.keys(pending).length > 0) {
      const saved = await api.patchSettings(id, pending);
      setLocal(saved);
      queryClient.setQueryData(["projects", id, "settings"], saved);
    }
  }

  const simplify = useMutation({
    mutationFn: async () => {
      await syncPendingSettings();
      return api.enqueueSimplifyMidi(id);
    },
    onSuccess: (job) => {
      queryClient.setQueryData(["jobs", job.id], job);
      queryClient.invalidateQueries({ queryKey: ["projects", id] });
    },
  });
  const renderSheet = useMutation({
    mutationFn: async () => {
      await syncPendingSettings();
      return api.enqueueRenderSheet(id);
    },
    onSuccess: (job) => {
      queryClient.setQueryData(["jobs", job.id], job);
      queryClient.invalidateQueries({ queryKey: ["projects", id] });
      setSheetJobId(job.id);
    },
  });
  const renderVideo = useMutation({
    mutationFn: async () => {
      await syncPendingSettings();
      return api.enqueueRenderVideo(id);
    },
    onSuccess: (job) => {
      queryClient.setQueryData(["jobs", job.id], job);
      queryClient.invalidateQueries({ queryKey: ["projects", id] });
      setVideoJobId(job.id);
    },
  });

  const sheetJob = useJob(sheetJobId);
  const videoJob = useJob(videoJobId);
  const hasActiveRender = [sheetJob.data?.status, videoJob.data?.status].some(
    (s) => s === "queued" || s === "processing",
  );
  const outputs = useOutputs(id, ready, hasActiveRender);

  useEffect(() => {
    if (sheetJob.data?.status === "completed" || videoJob.data?.status === "completed") {
      void queryClient.invalidateQueries({ queryKey: ["projects", id, "outputs"] });
    }
  }, [sheetJob.data?.status, videoJob.data?.status, id, queryClient]);

  function onChange(patch: Partial<RenderSettings>) {
    setLocal((prev) => (prev ? ({ ...prev, ...patch } as RenderSettings) : prev));
    pendingRef.current = { ...pendingRef.current, ...patch };
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const pending = pendingRef.current;
      pendingRef.current = {};
      patchSettings.mutate(pending, {
        onSuccess: (saved) => setLocal(saved),
      });
    }, 500);
  }

  if (project.isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10">
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-900" />
        <div className="mt-6 h-96 animate-pulse rounded-xl bg-zinc-900" />
      </main>
    );
  }

  if (project.isError) {
    const notFound = project.error instanceof ApiError && project.error.status === 404;
    return (
      <main className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 sm:px-6 py-16 sm:py-24 text-center">
        <p className="text-lg text-zinc-300">
          {notFound ? "Project not found." : "Could not load this project."}
        </p>
        <Link href="/projects" className="text-cyan-400 hover:underline">
          Back to projects
        </Link>
      </main>
    );
  }

  const p = project.data!;
  const summary = p.analysis_summary;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h1 className="text-2xl font-bold">{p.name}</h1>
        {summary && (
          <div className="flex flex-wrap gap-2 text-sm mt-1">
            <Badge>{summary.bpm} BPM</Badge>
            <Badge>
              {Math.floor(summary.duration_sec / 60)}:
              {String(Math.round(summary.duration_sec % 60)).padStart(2, "0")}
            </Badge>
            <Badge>{summary.note_count} notes</Badge>
            <Badge>{summary.track_count} tracks</Badge>
            <Badge>
              hands: {summary.hand_split ?? "-"} <span className="text-zinc-500 ml-1">(estimate)</span>
            </Badge>
          </div>
        )}
      </div>

      {p.status === "failed" && (
        <p className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          Parsing failed. The uploaded file is not a valid MIDI.{" "}
          <Link href="/upload" className="underline">
            Try another file
          </Link>
          .
        </p>
      )}

      {(p.status === "parsing" || p.status === "created" || p.status === "transcribing") && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-400">
            {activeJob.data?.progress_message ??
              (p.status === "transcribing" ? "Transcribing audio to MIDI..." : "Analyzing your MIDI...")}
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

      {ready && local && (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1 overflow-x-auto">
            {notes.data ? (
              <FallingNotePreview data={notes.data} settings={local} />
            ) : (
              <div className="flex h-96 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-400">
                {notes.isError ? "Beginner notes not generated yet." : "Loading notes..."}
              </div>
            )}
            {activeJob.data && ["processing", "queued", "parsing", "transcribing"].includes(activeJob.data.status) && (
              <div className="mt-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                <div className="flex justify-between text-sm mb-2 text-zinc-300">
                  <span className="capitalize">{activeJob.data.job_type.replace('_', ' ')}...</span>
                  <span>{activeJob.data.progress}%</span>
                </div>
                <Progress value={activeJob.data.progress} />
                {activeJob.data.progress_message && (
                  <p className="text-xs text-zinc-500 mt-2">{activeJob.data.progress_message}</p>
                )}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                onClick={() => router.push(`/projects/${id}/practice`)}
              >
                Start Practice (MIDI)
              </Button>
              <div className="flex flex-wrap gap-2">
                {local.difficulty !== "original" && (
                  <Button
                    variant="outline"
                    onClick={() => simplify.mutate()}
                    disabled={simplify.isPending}
                  >
                    {simplify.isPending ? "Simplifying..." : "Generate beginner MIDI"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => renderSheet.mutate()}
                  disabled={renderSheet.isPending}
                >
                  {renderSheet.isPending ? "Queued..." : "Generate sheet"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => renderVideo.mutate()}
                  disabled={renderVideo.isPending}
                >
                  {renderVideo.isPending ? "Queued..." : "Generate tutorial video"}
                </Button>
              </div>
            </div>
            {notes.isError && (
              <p className="mt-3 rounded-md border border-amber-900 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
                {notes.error instanceof ApiError
                  ? getFriendlyError(notes.error.code, "Could not load notes for this difficulty.")
                  : "Could not load notes for this difficulty."}
              </p>
            )}

            {/* Downloads */}
            {((outputs.data?.items?.length ?? 0) > 0 || hasActiveRender) && (
              <div className="mt-5 flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-zinc-300">Downloads</h2>

                {/* Sheet job progress / failure */}
                {sheetJob.data?.status === "queued" || sheetJob.data?.status === "processing" ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-zinc-400">
                      {sheetJob.data.progress_message ?? "Rendering sheet…"}
                    </p>
                    <div className="h-2 overflow-hidden rounded bg-zinc-900">
                      <div
                        className="h-full bg-cyan-400 transition-all"
                        style={{ width: `${sheetJob.data.progress}%` }}
                      />
                    </div>
                  </div>
                ) : sheetJob.data?.status === "failed" ? (
                  <p className="text-xs text-red-400">
                    Sheet render failed:{" "}
                    {getFriendlyError(sheetJob.data.error_type, sheetJob.data.error_message ?? "Unknown error.")}
                  </p>
                ) : null}

                {/* Video job progress / failure */}
                {videoJob.data?.status === "queued" || videoJob.data?.status === "processing" ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-zinc-400">
                      {videoJob.data.progress_message ?? "Rendering video…"}
                    </p>
                    <div className="h-2 overflow-hidden rounded bg-zinc-900">
                      <div
                        className="h-full bg-cyan-400 transition-all"
                        style={{ width: `${videoJob.data.progress}%` }}
                      />
                    </div>
                  </div>
                ) : videoJob.data?.status === "failed" ? (
                  <p className="text-xs text-red-400">
                    Video render failed:{" "}
                    {getFriendlyError(videoJob.data.error_type, videoJob.data.error_message ?? "Unknown error.")}
                  </p>
                ) : null}

                {/* Output file buttons */}
                {(outputs.data?.items?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {outputs.data!.items.map((output) => {
                      if (output.kind === "sheet_pdf") {
                        return (
                          <button
                            key={output.id}
                            onClick={() => {
                              void api
                                .createDownloadUrl(output.id)
                                .then(({ download_url }) =>
                                  window.open(download_url, "_blank", "noopener"),
                                );
                            }}
                            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900"
                          >
                            Download PDF
                          </button>
                        );
                      }
                      if (output.kind === "sheet_musicxml") {
                        return (
                          <button
                            key={output.id}
                            onClick={() => {
                              void api
                                .createDownloadUrl(output.id)
                                .then(({ download_url }) =>
                                  window.open(download_url, "_blank", "noopener"),
                                );
                            }}
                            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900"
                          >
                            Download MusicXML
                          </button>
                        );
                      }
                      if (output.kind === "video_mp4" && output.streamable && !output.downloadable) {
                        return (
                          <button
                            key={output.id}
                            onClick={() => {
                              void api
                                .createStreamUrl(output.id)
                                .then(({ stream_url }) => setVideoUrl(stream_url));
                            }}
                            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900"
                          >
                            Watch
                          </button>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}

                {videoUrl && (
                  <video src={videoUrl} controls className="mt-3 w-full rounded-lg" />
                )}
              </div>
            )}
          </div>
          <SettingsPanel
            settings={local}
            durationSec={notes.data?.duration_sec ?? summary?.duration_sec ?? 0}
            onChange={onChange}
          />
        </div>
      )}
    </main>
  );
}
