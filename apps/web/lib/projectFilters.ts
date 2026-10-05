import type { Project } from "@/lib/api";
import type {
  ProjectStatusFilter,
  ProjectSortOption,
  StatusCounts,
} from "@/types/projectDashboard";

export function isProjectReady(status: string): boolean {
  return status === "ready" || status === "completed" || status === "parsed";
}

export function isProjectProcessing(status: string): boolean {
  return (
    status === "processing" ||
    status === "parsing" ||
    status === "queued" ||
    status === "pending" ||
    status === "created" ||
    status === "uploading" ||
    status === "transcribing"
  );
}

export function isProjectFailed(status: string): boolean {
  return status === "failed" || status === "error";
}

export function computeStatusCounts(projects: Project[]): StatusCounts {
  const counts: StatusCounts = {
    all: projects.length,
    ready: 0,
    processing: 0,
    failed: 0,
  };

  for (const p of projects) {
    if (isProjectReady(p.status)) {
      counts.ready++;
    } else if (isProjectProcessing(p.status)) {
      counts.processing++;
    } else if (isProjectFailed(p.status)) {
      counts.failed++;
    }
  }

  return counts;
}

export function filterProjects(
  projects: Project[],
  searchQuery: string,
  statusFilter: ProjectStatusFilter
): Project[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return projects.filter((project) => {
    // 1. Status Filter check
    if (statusFilter === "ready" && !isProjectReady(project.status)) return false;
    if (statusFilter === "processing" && !isProjectProcessing(project.status)) return false;
    if (statusFilter === "failed" && !isProjectFailed(project.status)) return false;

    // 2. Search Query check
    if (queryTokens.length > 0) {
      const projectName = (project.name || "").toLowerCase();
      const allTokensMatch = queryTokens.every((token) => projectName.includes(token));
      if (!allTokensMatch) return false;
    }

    return true;
  });
}

export function sortProjects(
  projects: Project[],
  sortOption: ProjectSortOption
): Project[] {
  const copy = [...projects];

  switch (sortOption) {
    case "newest":
      return copy.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    case "oldest":
      return copy.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    case "title_asc":
      return copy.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
    case "duration_desc":
      return copy.sort(
        (a, b) =>
          (b.analysis_summary?.duration_sec ?? -1) -
          (a.analysis_summary?.duration_sec ?? -1)
      );
    case "notes_desc":
      return copy.sort(
        (a, b) =>
          (b.analysis_summary?.note_count ?? -1) -
          (a.analysis_summary?.note_count ?? -1)
      );
    default:
      return copy;
  }
}
