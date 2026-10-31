import { api } from "./api";
import { getAudioMimeType } from "./mime";
/**
 * Client library for the Modal audio→MIDI transcription endpoint.
 * All requests go through the Next.js route handler at /api/transcribe —
 * the Modal URL and any auth token stay server-side only.
 */
import type { NoteData } from "@pianoflow/shared-types";

export type TranscribeStatus = "idle" | "uploading" | "processing" | "done" | "error";

export interface TranscribeResult {
  notes: NoteData;
  midi_b64: string;
  confidence: Record<string, unknown>;
  report: Record<string, unknown>;
}

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 120; // 4 minutes

async function pollResult(
  callId: string,
  onStatus?: (s: TranscribeStatus) => void,
  onProgress?: (percent: number) => void,
): Promise<TranscribeResult> {
  onStatus?.("processing");
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const progress = Math.min(98, Math.round(50 * Math.log10(attempt + 1) / Math.log10(MAX_ATTEMPTS) * 2));
    onProgress?.(progress);
    
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const pollUrl = `/api/transcribe?call_id=${encodeURIComponent(callId)}`;
    const pollRes = await fetch(pollUrl);
    if (!pollRes.ok) continue;

    const payload = (await pollRes.json()) as {
      status: string;
      result?: TranscribeResult;
      error?: string;
    };

    if (payload.status === "done") {
      onStatus?.("done");
      onProgress?.(100);
      if (!payload.result) throw new Error("Modal returned done but no result");
      return payload.result;
    }
    if (payload.status === "error" || payload.status === "failed") {
      onStatus?.("error");
      throw new Error(payload.error ?? "Transcription failed on the server");
    }
  }
  onStatus?.("error");
  throw new Error("Transcription timed out after 4 minutes");
}

export async function submitAudio(
  audioFile: File,
  options: Record<string, unknown> = {},
  onStatus?: (s: TranscribeStatus) => void,
  onProgress?: (percent: number) => void,
): Promise<TranscribeResult> {
  onStatus?.("uploading");
  const init = await api.initTempAudioUpload(
    audioFile.name,
    audioFile.size,
    getAudioMimeType(audioFile.name, audioFile.type),
  );
  if (!init.download_url) {
    throw new Error("Backend did not provide a download URL for Modal");
  }
  await api.putToSignedUrl(init, audioFile, (pct) => {
    onProgress?.(Math.floor(pct * 0.5));
  });
  onStatus?.("processing");
  const submitRes = await fetch("/api/transcribe?action=submit_url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: init.download_url, rights_attested: true, options }),
  });
  if (!submitRes.ok) {
    const body = await submitRes.json().catch(() => ({})) as Record<string, unknown>;
    onStatus?.("error");
    throw new Error(typeof body["error"] === "string" ? body["error"] : `Submit failed (${submitRes.status})`);
  }
  const { call_id } = (await submitRes.json()) as { call_id: string };
  return pollResult(call_id, onStatus, (pct) => {
    onProgress?.(50 + Math.floor(pct * 0.5));
  });
}

export async function submitUrl(
  url: string,
  rightsAttested: boolean,
  options: Record<string, unknown> = {},
  onStatus?: (s: TranscribeStatus) => void,
  onProgress?: (percent: number) => void,
): Promise<TranscribeResult> {
  onStatus?.("uploading");
  const submitRes = await fetch("/api/transcribe?action=submit_url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, rights_attested: rightsAttested, options }),
  });
  if (!submitRes.ok) {
    const body = (await submitRes.json().catch(() => ({}))) as Record<string, unknown>;
    onStatus?.("error");
    const detail = typeof body["detail"] === "string" ? body["detail"] : undefined;
    const err = typeof body["error"] === "string" ? body["error"] : undefined;
    throw new Error(detail ?? err ?? `Submit failed (${submitRes.status})`);
  }
  const { call_id } = (await submitRes.json()) as { call_id: string };
  return pollResult(call_id, onStatus, onProgress);
}
