const fs = require('fs');

let text = fs.readFileSync('apps/web/lib/transcribeClient.ts', 'utf8');

const newFunc = `export async function submitUrl(
  url: string,
  rightsAttested: boolean,
  options: Record<string, unknown> = {},
  onStatus?: (s: TranscribeStatus) => void,
  onProgress?: (percent: number) => void,
): Promise<TranscribeResult> {
  onStatus?.("uploading");
  const submitRes = await fetch("/api/transcribe?action=submit_url", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...tokenHeaders() },
    body: JSON.stringify({ url, rights_attested: rightsAttested, options }),
  });
  if (!submitRes.ok) {
    const body = (await submitRes.json().catch(() => ({}))) as Record<string, unknown>;
    onStatus?.("error");
    const detail = typeof body["detail"] === "string" ? body["detail"] : undefined;
    const err = typeof body["error"] === "string" ? body["error"] : undefined;
    throw new Error(detail ?? err ?? \`Submit failed (\${submitRes.status})\`);
  }
  const { call_id } = (await submitRes.json()) as { call_id: string };
  return pollResult(call_id, onStatus, onProgress);
}`;

const pattern = /export async function submitUrl\(.*?return pollResult\(.*?\n\}/s;
text = text.replace(pattern, newFunc);

fs.writeFileSync('apps/web/lib/transcribeClient.ts', text);
