"use client";

import React from "react";
import type {
  ProjectStatusFilter,
  ProjectSortOption,
  StatusCounts,
} from "@/types/projectDashboard";
import { Badge } from "@/components/ui/Badge";

export interface ProjectSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: ProjectStatusFilter;
  onStatusFilterChange: (status: ProjectStatusFilter) => void;
  statusCounts: StatusCounts;
  sortOption: ProjectSortOption;
  onSortOptionChange: (sort: ProjectSortOption) => void;
}

const STATUS_TABS: Array<{ id: ProjectStatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "ready", label: "Ready" },
  { id: "processing", label: "Processing" },
  { id: "failed", label: "Failed" },
];

export function ProjectSearchBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  sortOption,
  onSortOptionChange,
}: ProjectSearchBarProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input with search icon and clear button */}
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onSearchChange("");
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Search projects by title..."
            aria-label="Search projects by title"
            data-testid="project-search-input"
            className="w-full rounded-xl border border-white/10 bg-[#121215]/80 py-2.5 pl-10 pr-9 text-sm text-zinc-100 placeholder-zinc-500 backdrop-blur-xl transition-all focus:border-cyan-500/50 focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              data-testid="project-search-clear-button"
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sorting selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="project-sort-select" className="text-xs text-zinc-400 whitespace-nowrap hidden sm:inline font-medium">
            Sort by:
          </label>
          <select
            id="project-sort-select"
            aria-label="Sort projects"
            data-testid="project-sort-select"
            value={sortOption}
            onChange={(e) => onSortOptionChange(e.target.value as ProjectSortOption)}
            className="rounded-xl border border-white/10 bg-[#121215]/80 px-3.5 py-2.5 text-xs text-zinc-200 backdrop-blur-xl transition-all focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 shadow-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title_asc">Title (A-Z)</option>
            <option value="duration_desc">Duration (Longest)</option>
            <option value="notes_desc">Note Count (Most Notes)</option>
          </select>
        </div>
      </div>

      {/* Status filter tabs */}
      <div
        role="tablist"
        aria-label="Filter projects by status"
        className="flex items-center gap-2 overflow-x-auto pb-1"
      >
        {STATUS_TABS.map((tab) => {
          const count = statusCounts[tab.id];
          const isActive = statusFilter === tab.id;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              data-testid={`status-tab-${tab.id}`}
              onClick={() => onStatusFilterChange(tab.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold backdrop-blur-xl transition-all select-none ${
                isActive
                  ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-md shadow-cyan-950/40"
                  : "border-white/5 bg-[#121215]/60 text-zinc-400 hover:border-white/15 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <span>{tab.label}</span>
              <Badge
                variant={isActive ? "accent" : "default"}
                size="sm"
                data-testid={`status-count-${tab.id}`}
                className="px-1.5 py-0 text-[11px] font-mono tabular-nums"
              >
                ({count})
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}

