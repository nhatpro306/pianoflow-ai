"use client";

import React from "react";
import Link from "next/link";

export interface ProjectEmptyStateProps {
  isFiltering: boolean;
  onClearFilters?: () => void;
  searchQuery?: string;
  statusFilter?: string;
}

export function ProjectEmptyState({
  isFiltering,
  onClearFilters,
  searchQuery = "",
  statusFilter = "all",
}: ProjectEmptyStateProps) {
  if (isFiltering) {
    return (
      <div
        data-testid="zero-match-empty-state"
        className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 py-16 px-4 text-center"
      >
        <span className="text-4xl">🔍</span>
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">
            No projects match your filter
          </h3>
          <p className="mt-1 text-xs text-zinc-400 max-w-sm">
            {searchQuery
              ? `No projects found matching "${searchQuery}"${
                  statusFilter !== "all" ? ` with status "${statusFilter}"` : ""
                }.`
              : `No projects found with status "${statusFilter}".`}
          </p>
        </div>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            data-testid="clear-filters-btn"
            className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-cyan-400 border border-zinc-700 hover:bg-zinc-700 hover:text-cyan-300 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="empty-library-state"
      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 py-20 px-4 text-center"
    >
      <span className="text-4xl">🎼</span>
      <div>
        <h3 className="text-lg font-semibold text-zinc-100">No projects yet.</h3>
        <p className="mt-1 text-xs text-zinc-400 max-w-sm">
          Upload a MIDI file, record your acoustic piano, or import a YouTube video to get started.
        </p>
      </div>
      <Link
        href="/create"
        aria-label="Create new piano project"
        data-testid="create-project-empty-cta"
        className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 transition-colors"
      >
        + Create New Project ✨
      </Link>
    </div>
  );
}
