/**
 * Client library for the Modal audio→MIDI transcription endpoint.
 * All requests go through the Next.js route handler at /api/transcribe —
 * the Modal URL and any auth token stay server-side only.
 */
import type { NoteData } from "@pianoflow/shared-types";

const MODAL_SUBMIT_URL = process.env.NEXT_PUBLIC_MODAL_SUBMIT_URL;
const MODAL_RESULT_URL = process.env.NEXT_PUBLIC_MODAL_RESULT_URL;
const DEMO_TOKEN = process.env.NEXT_PUBLIC_DEMO_TOKEN;

// When the public Modal URLs are configured we call Modal directly (no Vercel
// body-size ceiling); otherwise we fall back to the /api/transcribe proxy.
const DIRECT = Boolean(MODAL_SUBMIT_URL && MODAL_RESULT_URL);

function tokenHeaders(): Record<string, string> {
  return DEMO_TOKEN ? { "X-Demo-Token": DEMO_TOKEN } : {};
}

export type TranscribeStatus = "idle" | "uploading" | "processing" | "done" | "error";

export interface TranscribeResult {
  notes: NoteData;
  midi_b64: string;
  confidence: Record<string, unknown>;
  report: Record<string, unknown>;
}

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 120; // 4 minutes

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function submitAudio(
  audioFile: File,
  options: Record<string, unknown> = {},
  onStatus?: (s: TranscribeStatus) => void,
): Promise<TranscribeResult> {
  // 1. Read file and encode to base64
  onStatus?.("uploading");
  const buffer = await audioFile.arrayBuffer();
  const audio_b64 = toBase64(buffer);

  // 2. Submit — directly to Modal when configured (avoids Vercel's ~4.5 MB
  //    body limit on the proxy), otherwise via the Next.js route handler.
  const submitRes = await fetch(DIRECT ? `${MODAL_SUBMIT_URL}/submit` : "/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...tokenHeaders() },
    body: JSON.stringify({ audio_b64, options }),
  });

  if (!submitRes.ok) {
    const body = await submitRes.json().catch(() => ({})) as Record<string, unknown>;
    onStatus?.("error");
    throw new Error(
      typeof body["error"] === "string" ? body["error"] : `Submit failed (${submitRes.status})`,
    );
  }

  const { call_id } = (await submitRes.json()) as { call_id: string };

  // 3. Poll for result
  onStatus?.("processing");
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const pollUrl = DIRECT
      ? `${MODAL_RESULT_URL}/result?call_id=${encodeURIComponent(call_id)}`
      : `/api/transcribe?call_id=${encodeURIComponent(call_id)}`;
    const pollRes = await fetch(pollUrl, { headers: tokenHeaders() });

    if (!pollRes.ok) {
      // transient network hiccup — keep polling
      continue;
    }

    const payload = (await pollRes.json()) as {
      status: string;
      result?: TranscribeResult;
      error?: string;
    };

    if (payload.status === "done") {
      onStatus?.("done");
      if (!payload.result) throw new Error("Modal returned done but no result");
      return payload.result;
    }

    if (payload.status === "error" || payload.status === "failed") {
      onStatus?.("error");
      throw new Error(payload.error ?? "Transcription failed on the server");
    }

    // status is still "pending" / "running" — keep polling
  }

  onStatus?.("error");
  throw new Error("Transcription timed out after 4 minutes");
}
