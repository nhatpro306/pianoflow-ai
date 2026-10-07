"use client";

import SongsPage, { type SongMode, type DemoMode } from "../songs/page";

export type { SongMode, DemoMode };

/**
 * Backward-compatible /demo route.
 * Renders the canonical Song Studio component while preserving all existing routes,
 * test selectors, and deep-link invariants.
 */
export default function DemoPage() {
  return <SongsPage />;
}
