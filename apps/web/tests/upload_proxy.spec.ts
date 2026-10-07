import { test, expect } from "@playwright/test";
import http from "http";
import { getAudioMimeType, getNormalizedAudioMimeType } from "../lib/mime";

test.describe("PianoFlow AI — MP3 Audio Upload Network Fix & Proxy Specification", () => {
  // =========================================================================
  // Tier 1: MIME Type Normalization Tests
  // =========================================================================
  test.describe("Tier 1: Client-Side MIME Type Normalization", () => {
    test("normalizes .mp3 files with missing or empty browser type (Windows registry fix)", () => {
      expect(getAudioMimeType("chopin_nocturne.mp3")).toBe("audio/mpeg");
      expect(getAudioMimeType("chopin_nocturne.mp3", "")).toBe("audio/mpeg");
      expect(getNormalizedAudioMimeType({ name: "chopin_nocturne.mp3" })).toBe("audio/mpeg");
      expect(getNormalizedAudioMimeType({ name: "chopin_nocturne.mp3", type: "" })).toBe("audio/mpeg");
    });

    test("normalizes .mp3 files with non-standard audio/mp3 MIME", () => {
      expect(getAudioMimeType("track.mp3", "audio/mp3")).toBe("audio/mpeg");
      expect(getNormalizedAudioMimeType({ name: "track.mp3", type: "audio/mp3" })).toBe("audio/mpeg");
    });

    test("normalizes all supported audio and MIDI extensions", () => {
      expect(getAudioMimeType("recording.wav")).toBe("audio/wav");
      expect(getAudioMimeType("voice.m4a")).toBe("audio/mp4");
      expect(getAudioMimeType("song.aac")).toBe("audio/aac");
      expect(getAudioMimeType("audio.ogg")).toBe("audio/ogg");
      expect(getAudioMimeType("master.flac")).toBe("audio/flac");
      expect(getAudioMimeType("stream.webm")).toBe("audio/webm");
      expect(getAudioMimeType("sonata.mid")).toBe("audio/midi");
      expect(getAudioMimeType("sonata.midi")).toBe("audio/midi");
    });

    test("handles case-insensitivity in extensions", () => {
      expect(getAudioMimeType("PERFORMANCE.MP3")).toBe("audio/mpeg");
      expect(getAudioMimeType("RECORDING.WAV")).toBe("audio/wav");
      expect(getAudioMimeType("PIECE.MIDI")).toBe("audio/midi");
      expect(getAudioMimeType("Track.M4A")).toBe("audio/mp4");
    });

    test("sanitizes valid browser audio MIME when extension is missing or unrecognized", () => {
      expect(getAudioMimeType("audio_blob", "audio/x-m4a")).toBe("audio/mp4");
      expect(getAudioMimeType("audio_blob", "audio/mp3")).toBe("audio/mpeg");
      expect(getAudioMimeType("audio_blob", "audio/ogg")).toBe("audio/ogg");
    });

    test("defaults cleanly to audio/mpeg for unknown files", () => {
      expect(getAudioMimeType("mystery_file")).toBe("audio/mpeg");
      expect(getAudioMimeType("mystery_file", "application/octet-stream")).toBe("audio/mpeg");
    });
  });

  // =========================================================================
  // Tier 2: Next.js Server-Side Upload Proxy (/api/upload-proxy) Tests
  // =========================================================================
  test.describe("Tier 2: Next.js Upload Proxy & SSRF Protection", () => {
    test("rejects missing upload_url parameter with HTTP 400", async ({ request }) => {
      const res = await request.put("/api/upload-proxy");
      expect(res.status()).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Missing upload target url parameter");
    });

    test("enforces SSRF protection: blocks internal metadata and unauthorized hosts with HTTP 403", async ({
      request,
    }) => {
      const forbiddenTargets = [
        "http://169.254.169.254/latest/meta-data",
        "https://evil-attacker-site.com/intercept",
        "https://pianoflow.s3.amazonaws.com.evil-hacker.com/upload",
        "ftp://pianoflow-v3-sources.s3.amazonaws.com/test",
        "http://10.0.0.1/private-api",
      ];

      for (const target of forbiddenTargets) {
        const res = await request.put(
          `/api/upload-proxy?upload_url=${encodeURIComponent(target)}`,
          {
            data: "audio-payload",
          }
        );
        expect(res.status()).toBe(403);
        const data = await res.json();
        expect(data.error).toContain("Forbidden: upload destination host is not whitelisted");
      }
    });

    test("streams upload body and forwards Content-Type & ETag to whitelisted destination", async ({
      request,
    }) => {
      let capturedMethod = "";
      let capturedContentType = "";
      let capturedBody = "";

      const mockStorageServer = http.createServer((req, res) => {
        capturedMethod = req.method ?? "";
        capturedContentType = req.headers["content-type"] ?? "";
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          capturedBody = body;
          res.writeHead(200, {
            ETag: '"mock-s3-etag-998877"',
            "Content-Type": "application/xml",
          });
          res.end();
        });
      });

      await new Promise<void>((resolve) =>
        mockStorageServer.listen(0, "127.0.0.1", () => resolve())
      );
      const address = mockStorageServer.address() as { port: number };
      const destinationUrl = `http://127.0.0.1:${address.port}/users/test-user/uploads/audio/sample.mp3`;

      try {
        const payload = "binary-audio-mp3-simulation-data";
        const res = await request.put(
          `/api/upload-proxy?upload_url=${encodeURIComponent(destinationUrl)}`,
          {
            headers: {
              "Content-Type": "audio/mpeg",
            },
            data: payload,
          }
        );

        expect(res.status()).toBe(200);
        expect(res.headers()["etag"]).toBe('"mock-s3-etag-998877"');
        expect(capturedMethod).toBe("PUT");
        expect(capturedContentType).toBe("audio/mpeg");
        expect(capturedBody).toBe(payload);
      } finally {
        mockStorageServer.close();
      }
    });

    test("forwards upstream storage failure status (e.g. 403 Forbidden)", async ({
      request,
    }) => {
      const mockStorageServer = http.createServer((_req, res) => {
        res.writeHead(403, { "Content-Type": "application/xml" });
        res.end("<Error><Code>RequestTimeTooSkewed</Code><Message>Signature expired</Message></Error>");
      });

      await new Promise<void>((resolve) =>
        mockStorageServer.listen(0, "127.0.0.1", () => resolve())
      );
      const address = mockStorageServer.address() as { port: number };
      const destinationUrl = `http://127.0.0.1:${address.port}/expired.mp3`;

      try {
        const res = await request.put(
          `/api/upload-proxy?upload_url=${encodeURIComponent(destinationUrl)}`,
          {
            headers: { "Content-Type": "audio/mpeg" },
            data: "audio-data",
          }
        );

        expect(res.status()).toBe(403);
        const data = await res.json();
        expect(data.error).toContain("Upstream storage rejected upload (403)");
      } finally {
        mockStorageServer.close();
      }
    });
  });

  // =========================================================================
  // Tier 3: Client putToSignedUrl Proxy Fallback in Browser Context
  // =========================================================================
  test.describe("Tier 3: Browser putToSignedUrl Resilient Fallback", () => {
    test("automatically recovers via /api/upload-proxy when direct S3 upload suffers CORS/Network error (status 0)", async ({
      page,
    }) => {
      await page.goto("/create");

      // Verify that direct S3 fails and proxy succeeds
      let directAttemptCount = 0;
      let proxyAttemptCount = 0;

      await page.route("https://pianoflow-v3-sources.s3.amazonaws.com/**", (route) => {
        directAttemptCount++;
        // Abort the direct upload to simulate status 0 (CORS preflight or connection block)
        route.abort("failed");
      });

      await page.route("**/api/upload-proxy?upload_url=*", (route) => {
        proxyAttemptCount++;
        route.fulfill({
          status: 200,
          headers: { ETag: '"proxy-succeeded-etag"' },
          body: "",
        });
      });

      const outcome = await page.evaluate(async () => {
        const apiObj = (
          window as unknown as {
            __api: {
              putToSignedUrl: (
                init: unknown,
                file: unknown,
                onProgress?: (pct: number) => void,
              ) => Promise<void>;
            };
          }
        ).__api;
        if (!apiObj) {
          throw new Error("window.__api is not defined");
        }

        const progressUpdates: number[] = [];
        const dummyBlob = new Blob(["mp3-test-data"], { type: "audio/mpeg" });
        const init = {
          upload_id: "test-upload-uuid",
          upload_url: "https://pianoflow-v3-sources.s3.amazonaws.com/users/u1/uploads/audio/test.mp3",
          method: "PUT",
          headers: { "Content-Type": "audio/mpeg" },
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          max_bytes: 100000,
          download_url: "https://example.com/test.mp3",
        };

        await apiObj.putToSignedUrl(init, dummyBlob, (pct: number) => {
          progressUpdates.push(pct);
        });

        return {
          success: true,
          progressCount: progressUpdates.length,
        };
      });

      expect(outcome.success).toBe(true);
      expect(directAttemptCount).toBe(1);
      expect(proxyAttemptCount).toBe(1);
    });

    test("throws descriptive error when both direct S3 and proxy fallback fail", async ({
      page,
    }) => {
      await page.goto("/create");

      // Both direct and proxy fail
      await page.route("https://pianoflow-v3-sources.s3.amazonaws.com/**", (route) => {
        route.abort("failed");
      });

      await page.route("**/api/upload-proxy?upload_url=*", (route) => {
        route.fulfill({
          status: 502,
          body: JSON.stringify({ error: "Proxy transport failed" }),
        });
      });

      const outcome = await page.evaluate(async () => {
        const apiObj = (
          window as unknown as {
            __api: {
              putToSignedUrl: (
                init: unknown,
                file: unknown,
                onProgress?: (pct: number) => void,
              ) => Promise<void>;
            };
          }
        ).__api;
        const dummyBlob = new Blob(["mp3-test-data"], { type: "audio/mpeg" });
        const init = {
          upload_id: "test-upload-uuid",
          upload_url: "https://pianoflow-v3-sources.s3.amazonaws.com/users/u1/uploads/audio/test.mp3",
          method: "PUT",
          headers: { "Content-Type": "audio/mpeg" },
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          max_bytes: 100000,
          download_url: "https://example.com/test.mp3",
        };

        try {
          await apiObj.putToSignedUrl(init, dummyBlob);
          return { errorCaught: false, errorMsg: "" };
        } catch (err: unknown) {
          return {
            errorCaught: true,
            errorMsg: err instanceof Error ? err.message : String(err),
          };
        }
      });

      expect(outcome.errorCaught).toBe(true);
      expect(outcome.errorMsg).toContain(
        "Upload failed through both direct storage and server proxy. Please check your network connection."
      );
    });
  });
});
