"use client";

import Link from "next/link";

import { ApiError, type Project } from "@/lib/api";
import { useDeleteProject, useProjects } from "@/lib/hooks";

const STATUS_STYLE: Record<Project["status"], string> = {
  created: "bg-zinc-700 text-zinc-200",
  uploading: "bg-amber-900 text-amber-200",
  parsing: "bg-amber-900 text-amber-200",
  ready: "bg-emerald-900 text-emerald-200",
  failed: "bg-red-900 text-red-200",
  archived: "bg-zinc-800 text-zinc-400",
};

function formatDuration(seconds: number | undefined): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ProjectCard({ project }: { project: Project }) {
  const del = useDeleteProject();
  const summary = project.analysis_summary;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/projects/${project.id}`}
          className="font-semibold hover:text-cyan-400"
        >
          {project.name}
        </Link>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[project.status]}`}
        >
          {project.status}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-xs text-zinc-400">
        <div>
          <dt className="text-zinc-600">Duration</dt>
          <dd>{formatDuration(summary?.duration_sec)}</dd>
        </div>
        <div>
          <dt className="text-zinc-600">BPM</dt>
          <dd>{summary?.bpm ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-600">Notes</dt>
          <dd>{summary?.note_count ?? "—"}</dd>
        </div>
      </dl>

      <div className="flex justify-between text-xs text-zinc-500">
        <span>{new Date(project.created_at).toLocaleDateString()}</span>
        <button
          onClick={() => {
            if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
              del.mutate(project.id);
            }
          }}
          className="text-red-400 hover:text-red-300"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { data, isLoading, isError, error } = useProjects();
  const unauthorized = error instanceof ApiError && error.status === 401;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link
          href="/upload"
          className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
        >
          + New project
        </Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-zinc-900" />
          ))}
        </div>
      )}

      {isError && unauthorized && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <span className="text-4xl">🔒</span>
          <p className="text-zinc-400">Sign in to see your project history.</p>
          <Link href="/login" className="text-cyan-400 hover:underline">
            Sign in →
          </Link>
        </div>
      )}

      {isError && !unauthorized && (
        <p className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          Could not load projects. Is the API running?
        </p>
      )}

      {data && data.items.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <span className="text-4xl">🎼</span>
          <p className="text-zinc-400">No projects yet.</p>
          <Link href="/upload" className="text-cyan-400 hover:underline">
            Upload your first MIDI →
          </Link>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </main>
  );
}
