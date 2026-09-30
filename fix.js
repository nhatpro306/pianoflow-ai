const fs = require('fs');

let text = fs.readFileSync('apps/web/lib/transcribeClient.ts', 'utf8');

const newFunc = `export async function submitAudio(
  audioFile: File,
  options: Record<string, unknown> = {},
  onStatus?: (s: TranscribeStatus) => void,
  onProgress?: (percent: number) => void,
): Promise<TranscribeResult> {
  onStatus?.("uploading");
  const init = await api.initAudioUpload(audioFile.name, audioFile.size, audioFile.type || "audio/webm");
  if (!init.download_url) {
    throw new Error("Backend did not provide a download URL for Modal");
  }
  await api.putToSignedUrl(init, audioFile, (pct) => {
    onProgress?.(Math.floor(pct * 0.5));
  });
  onStatus?.("processing");
  const submitRes = await fetch("/api/transcribe?action=submit_url", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...tokenHeaders() },
    body: JSON.stringify({ url: init.download_url, rights_attested: true, options }),
  });
  if (!submitRes.ok) {
    const body = await submitRes.json().catch(() => ({})) as Record<string, unknown>;
    onStatus?.("error");
    throw new Error(typeof body["error"] === "string" ? body["error"] : \`Submit failed (\${submitRes.status})\`);
  }
  const { call_id } = (await submitRes.json()) as { call_id: string };
  return pollResult(call_id, onStatus, (pct) => {
    onProgress?.(50 + Math.floor(pct * 0.5));
  });
}`;

const pattern = /export async function submitAudio\(.*?return pollResult\(.*?\n\}/s;
text = text.replace(pattern, newFunc);

if (!text.includes('import { api }')) {
  text = 'import { api } from "./api";\n' + text;
}

// ALSO remove DIRECT usage for submitUrl and pollResult!
text = text.replace(/const DIRECT = Boolean.*?;/s, 'const DIRECT = false;');

fs.writeFileSync('apps/web/lib/transcribeClient.ts', text);
