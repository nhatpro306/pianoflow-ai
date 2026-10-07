/**
 * apps/web/app/api/upload-proxy/route.ts
 * Resilient Next.js Server-Side Upload Proxy.
 * Streams audio uploads directly from client to cloud storage presigned URLs,
 * bypassing browser CORS restrictions, ad-blockers, and corporate firewall barriers.
 */

import { NextRequest, NextResponse } from "next/server";

// Allowed storage destination host regexes (SSRF Protection)
const ALLOWED_STORAGE_HOSTS = [
  /^([a-z0-9.-]+\.)?s3\.amazonaws\.com$/i,
  /^([a-z0-9.-]+\.)?s3[.-][a-z0-9-]+\.amazonaws\.com$/i,
  /^([a-z0-9.-]+\.)?r2\.cloudflarestorage\.com$/i,
  /^([a-z0-9.-]+\.)?supabase\.co$/i,
];

function isAllowedHost(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") {
      return true;
    }
    return ALLOWED_STORAGE_HOSTS.some((regex) => regex.test(host));
  } catch {
    return false;
  }
}

async function handleUploadProxy(req: NextRequest): Promise<NextResponse> {
  const targetUrl =
    req.nextUrl.searchParams.get("upload_url") ||
    req.nextUrl.searchParams.get("url") ||
    req.headers.get("x-upload-url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing upload target url parameter." }, { status: 400 });
  }

  if (!isAllowedHost(targetUrl)) {
    return NextResponse.json(
      { error: "Forbidden: upload destination host is not whitelisted." },
      { status: 403 }
    );
  }

  const contentType = req.headers.get("content-type") || "application/octet-stream";
  const contentLength = req.headers.get("content-length");

  try {
    const headers: Record<string, string> = {
      "Content-Type": contentType,
    };
    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    // Node fetch sends the ReadableStream directly to upstream storage
    const upstreamRes = await fetch(targetUrl, {
      method: "PUT",
      headers,
      body: req.body,
      // @ts-expect-error duplex required for streaming request body in Node.js fetch
      duplex: "half",
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text().catch(() => "");
      return NextResponse.json(
        { error: `Upstream storage rejected upload (${upstreamRes.status}): ${errText.slice(0, 300)}` },
        { status: upstreamRes.status }
      );
    }

    const resHeaders = new Headers();
    const etag = upstreamRes.headers.get("etag");
    if (etag) {
      resHeaders.set("ETag", etag);
    }

    return new NextResponse(null, { status: 200, headers: resHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Proxy upload failed";
    return NextResponse.json({ error: `Proxy transport failed: ${msg}` }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  return handleUploadProxy(req);
}

export async function POST(req: NextRequest) {
  return handleUploadProxy(req);
}
