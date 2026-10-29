/**
 * PianoFlow AI — Optimized Asynchronous Full Song NoteData Loader
 * Provides zero-truncation full length song loading with client-side memory caching.
 */

import type { NoteData } from "@pianoflow/shared-types";
import type { RepertoireSong } from "./types";
import { decodeCompactSong, type CompactSongData } from "./compactSongDecoder";

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
  // Expanded Repertoire Landmarks
  "debussy-arabesque-1",
  "premiere-arabesque",
  "gurenge",
  "blue-bird",
  "blue-bird-naruto",
  "hikaru-nara",
  "nandemonaiya",
  "katawaredoki",
  "unravel",
  "tokyo-ghoul-unravel-acoustic-solo",
  "he-is-a-pirate",
  "hes-a-pirate",
  "hes-a-pirate-zimmer",
  "pirates-of-the-caribbean",
  "megalovania",
  "megalovania-undertale",
  "zelda-lullaby",
  "zeldas-lullaby",
  "zelda-lullaby-kondo",
  "super-mario-theme",
  "super-mario-bros-theme",
  "hedwigs-theme",
  "golden-hour",
  "golden-hour-jvke",
  "someone-like-you",
  "someone-like-you-adele",
  "shape-of-you",
  "shallow",
  "shallow-lady-gaga",
  "bohemian-rhapsody",
  "queen-bohemian-rhapsody-operatic",
  "all-of-me",
  "all-of-me-john-legend",
  "all-of-me-jazz",
  "dynamite-bts",
  "butter-bts",
  "love-scenario-ikon",
  "love-scenario",
  "stay-with-me-chanyeol",
  "stay-with-me",
]);

// Client-side in-memory cache to prevent re-fetching and ensure 60 FPS visualizer smoothness
const songMemoryCache = new Map<string, NoteData>();

export function isSongFullLength(songOrId: string | RepertoireSong): boolean {
  if (!songOrId) return false;
  if (typeof songOrId === "object") {
    if (songOrId.isFullLength !== undefined) return Boolean(songOrId.isFullLength);
    return true;
  }
  return true;
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
    // Expanded Landmark Aliases
    "premiere-arabesque": "debussy-arabesque-1",
    "blue-bird-naruto": "blue-bird",
    "tokyo-ghoul-unravel-acoustic-solo": "unravel",
    "hes-a-pirate": "he-is-a-pirate",
    "hes-a-pirate-zimmer": "he-is-a-pirate",
    "pirates-of-the-caribbean": "he-is-a-pirate",
    "megalovania-undertale": "megalovania",
    "zeldas-lullaby": "zelda-lullaby",
    "zelda-lullaby-kondo": "zelda-lullaby",
    "super-mario-bros-theme": "super-mario-theme",
    "golden-hour-jvke": "golden-hour",
    "someone-like-you-adele": "someone-like-you",
    "shallow-lady-gaga": "shallow",
    "queen-bohemian-rhapsody-operatic": "bohemian-rhapsody",
    "all-of-me-john-legend": "all-of-me",
    "all-of-me-jazz": "all-of-me",
    "love-scenario": "love-scenario-ikon",
    "stay-with-me": "stay-with-me-chanyeol",
  };
  return aliases[songId] ?? songId;
}

/**
 * Asynchronously loads the complete NoteData JSON from /songs/data/[id].json (or compact fallback).
 * Caches in memory for instant subsequent lookups.
 */
export async function fetchFullSongJson(songId: string): Promise<NoteData | null> {
  const normalizedId = normalizeSongDataId(songId);
  if (songMemoryCache.has(normalizedId)) {
    return songMemoryCache.get(normalizedId)!;
  }

  // 1. Browser environment: Fetch /songs/data/[id].json directly to eliminate 404 network errors
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
      // Fallback
    }

    // Optional fallback to compact format if available
    try {
      const compactRes = await fetch(`/songs/data/${normalizedId}.compact.json`);
      if (compactRes.ok) {
        const compact = (await compactRes.json()) as CompactSongData;
        const data = decodeCompactSong(compact);
        songMemoryCache.set(normalizedId, data);
        songMemoryCache.set(songId, data);
        return data;
      }
    } catch {
      // Ignore fallback failure
    }
  } else {
    // 2. Node.js environment (SSR, Playwright, Vitest)
    try {
      const fs = await import("node:fs");
      const path = await import("node:path");

      // Check standard JSON first
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

      // Check compact format fallback
      const compactCandidates = [
        path.resolve(process.cwd(), `apps/web/public/songs/data/${normalizedId}.compact.json`),
        path.resolve(process.cwd(), `public/songs/data/${normalizedId}.compact.json`),
      ];
      const foundCompactPath = compactCandidates.find((p) => fs.existsSync(p));
      if (foundCompactPath) {
        const raw = fs.readFileSync(foundCompactPath, "utf-8");
        const compact = JSON.parse(raw) as CompactSongData;
        const data = decodeCompactSong(compact);
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

export const loadSongNotes = fetchFullSongJson;

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
