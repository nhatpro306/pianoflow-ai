/**
 * Next.js App Router route handler for Modal audio→MIDI transcription.
 * Keeps MODAL_SUBMIT_URL / MODAL_RESULT_URL / DEMO_TOKEN server-side only.
 *
 * POST /api/transcribe  — forward audio or URL to Modal, return { call_id }
 * GET  /api/transcribe?call_id=...  — poll Modal for result, return as-is
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAX_BODY_SIZE_BYTES = 25 * 1024 * 1024; // 25MB ceiling

function getAuthHeaders(): Record<string, string> {
  const token = process.env.DEMO_TOKEN;
  return token ? { "X-Demo-Token": token } : {};
}

export async function POST(req: NextRequest) {
  const submitUrl = process.env.MODAL_SUBMIT_URL;
  if (!submitUrl) {
    return NextResponse.json({ error: "Transcription service is not configured" }, { status: 503 });
  }

  // Validate Content-Length header if present
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE_BYTES) {
    return NextResponse.json({ error: "Payload too large (max 25MB)" }, { status: 413 });
  }

  const action = req.nextUrl.searchParams.get("action");
  const base = submitUrl.replace(/\/submit\/?$/, "");
  const finalUrl = action === "submit_url" ? `${base}/submit_url` : submitUrl;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate body structure
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  if (action === "submit_url") {
    const url = typeof payload.url === "string" ? payload.url.trim() : "";
    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
      return NextResponse.json({ error: "A valid http/https URL is required" }, { status: 400 });
    }
    if (!payload.rights_attested) {
      return NextResponse.json(
        { error: "rights attestation required: you must confirm you have the right to transcribe this content" },
        { status: 403 }
      );
    }
  } else {
    // Standard audio submission
    if (!payload.audio_b64 && !payload.url) {
      return NextResponse.json({ error: "Either audio_b64 or url is required in payload" }, { status: 400 });
    }
  }

  try {
    const modalRes = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });

    if (!modalRes.ok) {
      const errData = (await modalRes.json().catch(() => ({}))) as Record<string, unknown>;
      const detail =
        typeof errData["detail"] === "string"
          ? errData["detail"]
          : typeof errData["error"] === "string"
            ? errData["error"]
            : `Modal submit failed (${modalRes.status})`;
      return NextResponse.json({ error: detail }, { status: modalRes.status });
    }

    const data = (await modalRes.json()) as { call_id?: string };
    return NextResponse.json({ call_id: data.call_id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const resultUrl = process.env.MODAL_RESULT_URL;
  if (!resultUrl) {
    return NextResponse.json({ error: "Transcription service is not configured" }, { status: 503 });
  }

  const callId = req.nextUrl.searchParams.get("call_id")?.trim();
  if (!callId || callId.length > 256 || !/^[\w-]+$/.test(callId)) {
    return NextResponse.json({ error: "Missing or invalid call_id parameter" }, { status: 400 });
  }

  try {
    const modalRes = await fetch(`${resultUrl}?call_id=${encodeURIComponent(callId)}`, {
      headers: getAuthHeaders(),
    });
    const data = (await modalRes.json()) as unknown;

    // Pass through whatever Modal returns (status, result, error fields)
    return NextResponse.json(data, { status: modalRes.ok ? 200 : 502 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
