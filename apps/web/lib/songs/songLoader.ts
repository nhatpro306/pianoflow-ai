/**
 * PianoFlow AI — Optimized Asynchronous Full Song NoteData Loader
 * Provides zero-truncation full length song loading with client-side memory caching.
 */

import type { NoteData } from "@pianoflow/shared-types";
import type { RepertoireSong } from "./types";

export const FULL_SONG_IDS = new Set<string>([
  "fur-elise",
  "moonlight-sonata",
  "moonlight-sonata-3rd",
  "canon-in-d",
  "clair-de-lune",
  "gymnopedie-1",
  "gymnopedie-no-1",
  "bach-prelude-c-major",
  "prelude-in-c",
  "mozart-rondo-alla-turca",
  "rondo-alla-turca",
  "chopin-nocturne-op9-no2",
  "chopin-waltz-in-a-minor",
  "chopin-waltz-a-minor",
  "river-flows-in-you",
  "kiss-the-rain",
  "interstellar",
  "interstellar-main-theme",
  "one-summers-day",
  "merry-go-round-of-life",
  "sparkle",
  "sparkle-your-name",
  "the-entertainer",
  "the-entertainer-joplin",
  "autumn-leaves",
  "fly-me-to-the-moon",
  "fly-me-to-the-moon-jazz",
  "love-story",
  "love-story-taylor-swift",
  "the-scientist",
  "the-scientist-coldplay",
  "spring-day-bts",
  "ode-to-joy",
  "bach-minuet-in-g",
]);

// Client-side in-memory cache to prevent re-fetching and ensure 60 FPS visualizer smoothness
const songMemoryCache = new Map<string, NoteData>();

export function isSongFullLength(songOrId: string | RepertoireSong): boolean {
  if (!songOrId) return false;
  if (typeof songOrId === "object") {
    if (songOrId.isFullLength) return true;
    return FULL_SONG_IDS.has(songOrId.id);
  }
  return FULL_SONG_IDS.has(songOrId);
}

export function normalizeSongDataId(songId: string): string {
  const aliases: Record<string, string> = {
    "gymnopedie-no-1": "gymnopedie-1",
    "prelude-in-c": "bach-prelude-c-major",
    "rondo-alla-turca": "mozart-rondo-alla-turca",
    "chopin-waltz-a-minor": "chopin-waltz-in-a-minor",
    "interstellar-main-theme": "interstellar",
    "sparkle-your-name": "sparkle",
    "the-entertainer-joplin": "the-entertainer",
    "fly-me-to-the-moon-jazz": "fly-me-to-the-moon",
    "love-story-taylor-swift": "love-story",
    "the-scientist-coldplay": "the-scientist",
  };
  return aliases[songId] ?? songId;
}

/**
 * Asynchronously loads the complete NoteData JSON from /songs/data/[id].json
 * Caches in memory for instant subsequent lookups.
 */
export async function fetchFullSongJson(songId: string): Promise<NoteData | null> {
  const normalizedId = normalizeSongDataId(songId);
  if (songMemoryCache.has(normalizedId)) {
    return songMemoryCache.get(normalizedId)!;
  }

  // 1. Browser environment: Fetch from /songs/data/
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/songs/data/${normalizedId}.json`);
      if (res.ok) {
        const data = (await res.json()) as NoteData;
        songMemoryCache.set(normalizedId, data);
        songMemoryCache.set(songId, data);
        return data;
      }
    } catch {
      // Fallback to song noteData
    }
  } else {
    // 2. Node.js environment (SSR, Playwright, Vitest)
    try {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const candidatePaths = [
        path.resolve(process.cwd(), `apps/web/public/songs/data/${normalizedId}.json`),
        path.resolve(process.cwd(), `public/songs/data/${normalizedId}.json`),
      ];
      const foundPath = candidatePaths.find((p) => fs.existsSync(p));
      if (foundPath) {
        const raw = fs.readFileSync(foundPath, "utf-8");
        const data = JSON.parse(raw) as NoteData;
        songMemoryCache.set(normalizedId, data);
        songMemoryCache.set(songId, data);
        return data;
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

/**
 * Loads the NoteData for a repertoire song, upgrading to the full-length version if available.
 */
export async function loadSongNoteData(song: RepertoireSong): Promise<NoteData> {
  const fullData = await fetchFullSongJson(song.id);
  if (fullData) {
    return fullData;
  }
  return song.noteData;
}

/**
 * Synchronous cache lookup for instant access
 */
export function getCachedSongNoteData(songId: string): NoteData | undefined {
  const normalizedId = normalizeSongDataId(songId);
  return songMemoryCache.get(normalizedId) ?? songMemoryCache.get(songId);
}

/**
 * Preloads song data into memory in the background
 */
export function preloadSongData(songId: string): void {
  void fetchFullSongJson(songId);
}
