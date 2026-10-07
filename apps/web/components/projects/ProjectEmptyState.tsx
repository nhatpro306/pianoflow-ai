"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
      <Card
        data-testid="zero-match-empty-state"
        className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-[#121215]/60 backdrop-blur-xl py-16 px-4 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 text-2xl border border-cyan-500/20 shadow-lg shadow-cyan-950/20">
          🔍
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">
            No projects match your filter
          </h3>
          <p className="mt-1 text-xs text-zinc-400 max-w-sm leading-relaxed">
            {searchQuery
              ? `No projects found matching "${searchQuery}"${
                  statusFilter !== "all" ? ` with status "${statusFilter}"` : ""
                }.`
              : `No projects found with status "${statusFilter}".`}
          </p>
        </div>
        {onClearFilters && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onClearFilters}
            data-testid="clear-filters-btn"
            className="border-white/10 hover:border-cyan-500/30 text-cyan-300"
          >
            Clear Filters
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card
      data-testid="empty-library-state"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-[#121215]/60 backdrop-blur-xl py-20 px-4 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 text-3xl border border-white/10 shadow-xl shadow-violet-950/20">
        🎼
      </div>
      <div>
        <h3 className="text-xl font-bold text-zinc-100">No projects yet.</h3>
        <p className="mt-1.5 text-xs text-zinc-400 max-w-md leading-relaxed">
          Upload a MIDI file, record your acoustic piano, or import a YouTube video to get started.
        </p>
      </div>
      <Link
        href="/create"
        aria-label="Create new piano project"
        data-testid="create-project-empty-cta"
        className="inline-flex mt-2"
      >
        <Button variant="gradient" size="md" className="shadow-lg shadow-violet-500/20">
          Create First Project ✨
        </Button>
      </Link>
    </Card>
  );
}

