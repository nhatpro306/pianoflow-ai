"use client";

import React from "react";
import Link from "next/link";
import type { Project } from "@/lib/api";
import {
  isProjectReady,
  isProjectProcessing,
  isProjectFailed,
} from "@/lib/projectFilters";

const STATUS_STYLE: Record<string, string> = {
  created: "bg-zinc-700 text-zinc-200",
  uploading: "bg-amber-900/80 text-amber-200 border border-amber-700/50",
  parsing: "bg-amber-900/80 text-amber-200 border border-amber-700/50",
  transcribing: "bg-amber-900/80 text-amber-200 border border-amber-700/50",
  ready: "bg-emerald-900/80 text-emerald-200 border border-emerald-700/50",
  completed: "bg-emerald-900/80 text-emerald-200 border border-emerald-700/50",
  parsed: "bg-emerald-900/80 text-emerald-200 border border-emerald-700/50",
  failed: "bg-red-900/80 text-red-200 border border-red-700/50",
  error: "bg-red-900/80 text-red-200 border border-red-700/50",
  archived: "bg-zinc-800 text-zinc-400 border border-zinc-700/50",
};

function formatDuration(seconds: number | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export interface ProjectCardProps {
  project: Project;
  onDelete: (project: Project) => void;
  onExport: (project: Project) => void;
}

export function ProjectCard({ project, onDelete, onExport }: ProjectCardProps) {
  const summary = project.analysis_summary;
  const isReady = isProjectReady(project.status);
  const isProcessing = isProjectProcessing(project.status);
  const isFailed = isProjectFailed(project.status);

  return (
    <div
      data-testid={`project-card-${project.id}`}
      className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/projects/${encodeURIComponent(project.id)}`}
            data-testid={`project-title-${project.id}`}
            className="font-semibold text-zinc-100 hover:text-cyan-400 transition-colors line-clamp-1"
          >
            {project.name}
          </Link>
          <span
            className={`rounded-full px-2 py-0.5 text-xs whitespace-nowrap capitalize ${
              STATUS_STYLE[project.status] ?? "bg-zinc-800 text-zinc-300"
            }`}
          >
            {project.status}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-zinc-400">
          <div>
            <dt className="text-zinc-500">Duration</dt>
            <dd className="font-medium text-zinc-300">{formatDuration(summary?.duration_sec)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">BPM</dt>
            <dd className="font-medium text-zinc-300">{summary?.bpm ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Notes</dt>
            <dd className="font-medium text-zinc-300">{summary?.note_count ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span>{new Date(project.created_at).toLocaleDateString()}</span>
          {isProcessing && (
            <span className="flex items-center gap-1 text-amber-400 font-medium animate-pulse">
              ⚡ Processing...
            </span>
          )}
          {isFailed && (
            <span className="flex items-center gap-1 text-red-400 font-medium">
              ⚠️ Ingestion Failed
            </span>
          )}
        </div>

        {/* Quick actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {isReady && (
              <>
                <Link
                  href={`/projects/${encodeURIComponent(project.id)}/practice`}
                  aria-label={`Practice ${project.name}`}
                  data-testid={`project-practice-btn-${project.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-600/20 px-2.5 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-600/30 transition-colors"
                >
                  Practice 🎹
                </Link>
                <Link
                  href={`/projects/${encodeURIComponent(project.id)}/sheet`}
                  aria-label={`Sheet music for ${project.name}`}
                  data-testid={`project-sheet-btn-${project.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-600/20 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-600/30 transition-colors"
                >
                  Sheet 🎼
                </Link>
                <button
                  type="button"
                  onClick={() => onExport(project)}
                  aria-label={`Export ${project.name}`}
                  data-testid={`project-export-btn-${project.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
                >
                  Export 🚀
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => onDelete(project)}
            aria-label={`Delete ${project.name}`}
            data-testid={`project-delete-btn-${project.id}`}
            className="text-xs text-red-400 hover:text-red-300 hover:underline px-1 py-1 transition-colors"
          >
            Delete 🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
