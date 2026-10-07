"use client";

import React from "react";
import Link from "next/link";
import type { Project, AnalysisSummary } from "@/lib/api";
import {
  isProjectReady,
  isProjectProcessing,
  isProjectFailed,
} from "@/lib/projectFilters";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

function formatDuration(seconds: number | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getDifficulty(summary: AnalysisSummary | null | undefined): string {
  if (!summary || !summary.note_count) return "Intermediate";
  if (summary.note_count < 400) return "Beginner";
  if (summary.note_count > 1000 || summary.bpm > 140) return "Advanced";
  return "Intermediate";
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
    <Card
      data-testid={`project-card-${project.id}`}
      className="bg-[#121215]/80 border-white/5 hover:border-white/15 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/5 group flex flex-col justify-between gap-3 p-4"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/projects/${encodeURIComponent(project.id)}`}
            data-testid={`project-title-${project.id}`}
            className="font-semibold text-zinc-100 group-hover:text-cyan-300 transition-colors line-clamp-1 text-base"
          >
            {project.name}
          </Link>
          {isReady && <Badge variant="success" dot>Ready</Badge>}
          {isProcessing && <Badge variant="warning" dot>Processing...</Badge>}
          {isFailed && <Badge variant="danger" dot>Failed</Badge>}
          {!isReady && !isProcessing && !isFailed && (
            <Badge variant="default" dot>{project.status}</Badge>
          )}
        </div>

        <dl className="mt-3.5 grid grid-cols-3 gap-2 rounded-xl bg-zinc-950/40 p-2.5 border border-white/5 text-xs text-zinc-400">
          <div>
            <dt className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Duration</dt>
            <dd className="font-mono font-medium text-zinc-200 mt-0.5">{formatDuration(summary?.duration_sec)}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Notes</dt>
            <dd className="font-mono font-medium text-zinc-200 mt-0.5">{summary?.note_count != null ? `${summary.note_count} notes` : "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Difficulty</dt>
            <dd className="font-medium text-zinc-200 mt-0.5">{getDifficulty(summary)}</dd>
          </div>
        </dl>
      </div>

      <div className="pt-2.5 border-t border-white/5 flex flex-col gap-2.5 mt-auto">
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span>{new Date(project.created_at).toLocaleDateString()}</span>
          {isProcessing && (
            <span className="flex items-center gap-1 text-amber-400 font-medium animate-pulse">
              ⚡ Processing...
            </span>
          )}
          {isFailed && (
            <span className="flex items-center gap-1 text-rose-400 font-medium">
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
                  className="inline-flex"
                >
                  <Button variant="gradient" size="sm">
                    Practice 🎹
                  </Button>
                </Link>
                <Link
                  href={`/projects/${encodeURIComponent(project.id)}/sheet`}
                  aria-label={`Sheet music for ${project.name}`}
                  data-testid={`project-sheet-btn-${project.id}`}
                  className="inline-flex"
                >
                  <Button variant="secondary" size="sm">
                    Sheet 🎼
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExport(project)}
                  aria-label={`Export ${project.name}`}
                  data-testid={`project-export-btn-${project.id}`}
                >
                  Export 🚀
                </Button>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-500 hover:text-rose-400 ml-auto"
            onClick={() => onDelete(project)}
            aria-label={`Delete ${project.name}`}
            data-testid={`project-delete-btn-${project.id}`}
          >
            Delete 🗑️
          </Button>
        </div>
      </div>
    </Card>
  );
}

