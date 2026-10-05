"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import type { Project } from "@/lib/api";
import { useDeleteProject, useProjects, useUserProgress } from "@/lib/hooks";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { LevelProgress } from "@/components/ui/LevelProgress";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { ExportCenterModal } from "@/components/ExportCenterModal";
import type {
  ProjectStatusFilter,
  ProjectSortOption,
} from "@/types/projectDashboard";
import {
  computeStatusCounts,
  filterProjects,
  sortProjects,
} from "@/lib/projectFilters";
import { ProjectSearchBar } from "@/components/projects/ProjectSearchBar";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectEmptyState } from "@/components/projects/ProjectEmptyState";

export default function ProjectsPage() {
  const { authenticated } = useRequireAuth();
  const { data, isLoading, isError } = useProjects();
  const { data: progressData } = useUserProgress();
  const del = useDeleteProject();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>("all");
  const [sortOption, setSortOption] = useState<ProjectSortOption>("newest");
  const [exportModalProject, setExportModalProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const rawProjects = useMemo(() => data?.items ?? [], [data?.items]);

  const statusCounts = useMemo(
    () => computeStatusCounts(rawProjects),
    [rawProjects]
  );

  const filteredProjects = useMemo(
    () => filterProjects(rawProjects, searchQuery, statusFilter),
    [rawProjects, searchQuery, statusFilter]
  );

  const displayedProjects = useMemo(
    () => sortProjects(filteredProjects, sortOption),
    [filteredProjects, sortOption]
  );

  const isFiltering =
    (searchQuery.trim().length > 0 || statusFilter !== "all") &&
    rawProjects.length > 0;

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  const handleDelete = () => {
    if (deleteTarget) {
      del.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  if (!authenticated) return null;

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Projects</h1>
        <div className="flex flex-wrap items-center gap-4">
          {progressData && (
            <>
              <StreakBadge streakDays={progressData.current_streak_days} />
              <LevelProgress
                level={progressData.level}
                totalXp={progressData.total_xp}
                xpToNextLevel={progressData.xp_to_next_level}
              />
            </>
          )}
          <Link
            href="/create"
            aria-label="Create new piano project"
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 transition-colors"
          >
            + New project
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-zinc-900 border border-zinc-800" />
          ))}
        </div>
      )}

      {isError && (
        <p className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          Could not load projects. Is the API running?
        </p>
      )}

      {!isLoading && !isError && rawProjects.length === 0 && (
        <ProjectEmptyState isFiltering={false} />
      )}

      {!isLoading && !isError && rawProjects.length > 0 && (
        <>
          <ProjectSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            statusCounts={statusCounts}
            sortOption={sortOption}
            onSortOptionChange={setSortOption}
          />

          {displayedProjects.length === 0 ? (
            <ProjectEmptyState
              isFiltering={isFiltering}
              onClearFilters={handleClearFilters}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={setDeleteTarget}
                  onExport={setExportModalProject}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Project?"
      >
        <p>
          Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This cannot be undone.
        </p>
        <DialogActions>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unified Export Center Modal */}
      {exportModalProject && (
        <ExportCenterModal
          project={exportModalProject}
          isOpen={true}
          onClose={() => setExportModalProject(null)}
        />
      )}
    </main>
  );
}
