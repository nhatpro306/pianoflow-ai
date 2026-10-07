/**
 * apps/web/lib/mime.ts
 * Deterministic audio and MIDI MIME type normalization.
 * Prevents OS-dependent empty strings (e.g. Windows .mp3 registry missing)
 * and non-standard browser MIME values.
 */

const EXTENSION_TO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  flac: "audio/flac",
  webm: "audio/webm",
  mid: "audio/midi",
  midi: "audio/midi",
};

/**
 * Returns the canonical RFC MIME type for an audio or MIDI filename/browser MIME.
 * Prioritizes file extension over browser-reported MIME type.
 */
export function getAudioMimeType(filename: string, browserMimeType?: string): string {
  const parts = filename.split(".");
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase().trim() ?? "" : "";
  if (ext && EXTENSION_TO_MIME[ext]) {
    return EXTENSION_TO_MIME[ext];
  }

  if (browserMimeType) {
    const lower = browserMimeType.trim().toLowerCase();
    if (lower === "audio/mp3") return "audio/mpeg";
    if (lower === "audio/x-m4a") return "audio/mp4";
    if (lower.startsWith("audio/")) return lower;
  }

  // Fallback default for unknown audio files
  return "audio/mpeg";
}

/**
 * Convenience wrapper accepting a File-like or Blob-like object with name and optional type.
 */
export function getNormalizedAudioMimeType(file: { name: string; type?: string }): string {
  return getAudioMimeType(file.name, file.type);
}
