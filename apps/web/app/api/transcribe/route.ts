/**
 * Next.js App Router route handler for Modal audio→MIDI transcription.
 * Keeps MODAL_SUBMIT_URL / MODAL_RESULT_URL server-side only.
 *
 * POST /api/transcribe  — forward audio to Modal, return { call_id }
 * GET  /api/transcribe?call_id=...  — poll Modal for result, return as-is
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const submitUrl = process.env.MODAL_SUBMIT_URL;
  if (!submitUrl) {
    return NextResponse.json({ error: "Modal not configured" }, { status: 503 });
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

  try {
    const modalRes = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.DEMO_TOKEN ? { "X-Demo-Token": process.env.DEMO_TOKEN } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = (await modalRes.json()) as { call_id?: string };

    if (!modalRes.ok) {
      return NextResponse.json(
        { error: `Modal submit failed (${modalRes.status})` },
        { status: 502 },
      );
    }

    return NextResponse.json({ call_id: data.call_id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const resultUrl = process.env.MODAL_RESULT_URL;
  if (!resultUrl) {
    return NextResponse.json({ error: "Modal not configured" }, { status: 503 });
  }

  const callId = req.nextUrl.searchParams.get("call_id");
  if (!callId) {
    return NextResponse.json({ error: "Missing call_id" }, { status: 400 });
  }

  try {
    const modalRes = await fetch(`${resultUrl}?call_id=${encodeURIComponent(callId)}`, {
      headers: process.env.DEMO_TOKEN ? { "X-Demo-Token": process.env.DEMO_TOKEN } : {},
    });
    const data = (await modalRes.json()) as unknown;

    // Pass through whatever Modal returns (status, result, error fields)
    return NextResponse.json(data, { status: modalRes.ok ? 200 : 502 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
