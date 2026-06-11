import Link from "next/link";

import { LIMITS } from "@pianoflow/shared-types";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
        MVP in progress — MIDI in, tutorial out
      </span>
      <h1 className="text-5xl font-bold tracking-tight">
        🎹 PianoFlow <span className="text-cyan-400">AI</span>
      </h1>
      <p className="max-w-xl text-lg text-zinc-400">
        Turn any piano MIDI into a tutorial video, sheet music, and a
        beginner-friendly version.
      </p>
      <Link
        href="/upload"
        className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-400"
      >
        Upload a MIDI
      </Link>
      <div className="flex gap-3 text-sm text-zinc-500">
        <span>
          Right hand <span style={{ color: "var(--hand-right)" }}>■</span>
        </span>
        <span>
          Left hand <span style={{ color: "var(--hand-left)" }}>■</span>
        </span>
        <span>· max {LIMITS.MAX_SONG_SECONDS / 60} min songs</span>
      </div>
    </main>
  );
}
