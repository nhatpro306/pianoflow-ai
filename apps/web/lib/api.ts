/**
 * Typed API client for the FastAPI backend.
 * All requests go through apiFetch so error envelopes (API.md §0) become
 * ApiError instances with a stable machine-readable code.
 */
import type { NoteData, RenderSettings } from "@pianoflow/shared-types";

import { cleanEnv } from "./env";
import { createClient } from "./supabase";

const BASE_URL =
  typeof window !== "undefined"
    ? ""
    : cleanEnv(process.env.NEXT_PUBLIC_API_BASE_URL) || "http://localhost:8000";

const isAuthEnabled =
  typeof window !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!isAuthEnabled) return {};
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    // no session — proceed without auth
  }
  return {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders, ...init?.headers },
  });

  if (!response.ok) {
    let code = "INTERNAL_ERROR";
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      code = body?.error?.code ?? code;
      message = body?.error?.message ?? message;
    } catch {
      // non-JSON error body — keep defaults
    }
    throw new ApiError(response.status, code, message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// ── Types (mirror API.md responses) ─────────────────────────

export interface AnalysisSummary {
  bpm: number;
  duration_sec: number;
  time_signature: string;
  track_count: number;
  note_count: number;
  pitch_min: number | null;
  pitch_max: number | null;
  hand_split: string | null;
}

export interface Project {
  id: string;
  name: string;
  status: "created" | "uploading" | "parsing" | "transcribing" | "ready" | "failed" | "archived";
  analysis_summary: AnalysisSummary | null;
  active_jobs: JobBrief[];
  created_at: string;
}

export interface JobBrief {
  id: string;
  job_type: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  progress_message: string | null;
}

export interface Job extends JobBrief {
  project_id: string;
  attempt: number;
  error_type: string | null;
  error_message: string | null;
  settings_version: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface UploadInit {
  upload_id: string;
  upload_url: string;
  method: string;
  headers: Record<string, string>;
  expires_at: string;
  max_bytes: number;
  download_url?: string;
}

export interface OutputFile {
  id: string;
  kind: string;
  job_id: string;
  content_type: string;
  size_bytes: number;
  metadata: Record<string, unknown> | null;
  downloadable: boolean;
  streamable: boolean;
  file_expires_at: string | null;
  created_at: string;
}

export interface UserProgress {
  user_id: string;
  total_xp: number;
  level: number;
  xp_to_next_level: number;
  current_streak_days: number;
  highest_streak_days: number;
  last_practice_date: string | null;
}

export interface PracticeSessionPayload {
  project_id: string;
  score: number;
  accuracy_percent: number;
  duration_seconds?: number;
  difficulty?: string;
}

export interface PracticeSessionResponse {
  id?: string;
  project_id?: string;
  score: number;
  accuracy_percent: number;
  xp_gained: number;
  level_up: boolean;
  current_level: number;
  total_xp: number;
  current_streak: number;
}

// ── Calls ───────────────────────────────────────────────────

export const api = {
  createCheckoutSession: (priceId: string) =>
    apiFetch<{ url: string }>("/api/v1/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ price_id: priceId }),
    }),

  createProject: (name: string) =>
    apiFetch<Project>("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  listProjects: () => apiFetch<{ items: Project[] }>("/api/v1/projects"),

  getProject: (id: string) => apiFetch<Project>(`/api/v1/projects/${id}`),

  getJob: (id: string) => apiFetch<Job>(`/api/v1/jobs/${id}`),

  deleteProject: (id: string) =>
    apiFetch<void>(`/api/v1/projects/${id}`, { method: "DELETE" }),

  getNotes: (id: string, difficulty = "original") =>
    apiFetch<NoteData>(`/api/v1/projects/${id}/notes?difficulty=${difficulty}`),

  getSettings: (id: string) =>
    apiFetch<RenderSettings>(`/api/v1/projects/${id}/settings`),

  patchSettings: (id: string, patch: Partial<RenderSettings>) =>
    apiFetch<RenderSettings>(`/api/v1/projects/${id}/settings`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  getUserProgress: () => apiFetch<UserProgress>("/api/v1/user/progress"),

  createPracticeSession: (payload: PracticeSessionPayload) =>
    apiFetch<PracticeSessionResponse>("/api/v1/practice-sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  initTempAudioUpload: (filename: string, sizeBytes: number, contentType: string) =>
    apiFetch<UploadInit>(`/api/v1/uploads/audio`, {
      method: "POST",
      body: JSON.stringify({ filename, size_bytes: sizeBytes, content_type: contentType }),
    }),

  initUpload: (projectId: string, filename: string, sizeBytes: number) =>
    apiFetch<UploadInit>(`/api/v1/projects/${projectId}/upload-midi`, {
      method: "POST",
      body: JSON.stringify({ filename, size_bytes: sizeBytes }),
    }),

  confirmUpload: (projectId: string, uploadId: string) =>
    apiFetch<{ upload_id: string; status: string; project_status: string; parse_job: JobBrief }>(
      `/api/v1/projects/${projectId}/upload-midi/confirm`,
      { method: "POST", body: JSON.stringify({ upload_id: uploadId }) },
    ),

  enqueueSimplifyMidi: (projectId: string) =>
    apiFetch<Job>(`/api/v1/projects/${projectId}/jobs/simplify-midi`, { method: "POST" }),

  enqueueRenderSheet: (projectId: string) =>
    apiFetch<Job>(`/api/v1/projects/${projectId}/jobs/render-sheet`, { method: "POST" }),

  enqueueRenderVideo: (projectId: string) =>
    apiFetch<Job>(`/api/v1/projects/${projectId}/jobs/render-video`, { method: "POST" }),

  listOutputs: (projectId: string, kind?: string) =>
    apiFetch<{ items: OutputFile[]; next_cursor: string | null }>(
      `/api/v1/projects/${projectId}/outputs${kind ? `?kind=${encodeURIComponent(kind)}` : ""}`,
    ),

  createDownloadUrl: (outputId: string) =>
    apiFetch<{ download_url: string; expires_at: string }>(
      `/api/v1/outputs/${outputId}/download-url`,
      { method: "POST" },
    ),

  createStreamUrl: (outputId: string) =>
    apiFetch<{ stream_url: string; expires_at: string; expires_in_seconds: number }>(
      `/api/v1/outputs/${outputId}/stream-url`,
      { method: "POST" },
    ),

  // ── Audio → MIDI Beta ─────────────────────────────────────
  // Output is an editable draft MIDI — never promised as perfect.

  initAudioUpload: (
    projectId: string,
    filename: string,
    sizeBytes: number,
    rightsAttestation: boolean,
  ) =>
    apiFetch<UploadInit & { max_duration_seconds: number }>(
      `/api/v1/projects/${projectId}/upload-audio`,
      {
        method: "POST",
        body: JSON.stringify({
          filename,
          size_bytes: sizeBytes,
          rights_attestation: rightsAttestation,
        }),
      },
    ),

  confirmAudioUpload: (projectId: string, uploadId: string) =>
    apiFetch<{
      upload_id: string;
      status: string;
      project_status: string;
      transcribe_job: JobBrief;
    }>(`/api/v1/projects/${projectId}/upload-audio/confirm`, {
      method: "POST",
      body: JSON.stringify({ upload_id: uploadId }),
    }),

  getTranscription: (projectId: string) =>
    apiFetch<{
      status: "none" | "queued" | "processing" | "completed" | "failed";
      engine: string | null;
      draft_midi_output_id: string | null;
      confidence_summary: Record<string, number> | null;
      message: string;
    }>(`/api/v1/projects/${projectId}/transcription`),

  /** Raw PUT to the signed URL — not under BASE_URL, not JSON. */
  putToSignedUrl: async (init: UploadInit, file: Blob, onProgress?: (percent: number) => void) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(init.method, init.upload_url, true);
      if (init.headers) {
        for (const [key, value] of Object.entries(init.headers)) {
          xhr.setRequestHeader(key, value as string);
        }
      }
      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new ApiError(xhr.status, "UPLOAD_FAILED", "Upload to storage failed."));
      };
      xhr.onerror = () => reject(new ApiError(0, "UPLOAD_FAILED", "Network error during upload."));
      xhr.send(file);
    });
  },
};
