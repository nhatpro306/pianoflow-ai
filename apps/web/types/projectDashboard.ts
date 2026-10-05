export type ProjectStatusFilter = "all" | "ready" | "processing" | "failed";

export type ProjectSortOption =
  | "newest"
  | "oldest"
  | "title_asc"
  | "duration_desc"
  | "notes_desc";

export interface StatusCounts {
  all: number;
  ready: number;
  processing: number;
  failed: number;
}

export interface ProjectFilterState {
  searchQuery: string;
  statusFilter: ProjectStatusFilter;
  sortOption: ProjectSortOption;
}
