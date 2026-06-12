import Link from "next/link";

import { LIMITS } from "@pianoflow/shared-types";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
        MIDI in → tutorial video, sheet music & beginner version out
      </span>
      <h1 className="text-5xl font-bold tracking-tight">
        🎹 PianoFlow <span className="text-cyan-400">AI</span>
      </h1>
      <p className="max-w-xl text-lg text-zinc-400">
        Upload a piano MIDI and get a Synthesia-style falling-note tutorial
        video with real piano sound, printable sheet music, and an honest
        rule-based easy version — melody kept, clutter removed.
      </p>
      <Link
        href="/upload"
        className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-400"
      >
        Upload a MIDI
      </Link>
      <ul className="grid max-w-xl grid-cols-1 gap-2 text-left text-sm text-zinc-400 sm:grid-cols-3">
        <li className="rounded-lg border border-zinc-800 p-3">
          🎬 <span className="text-zinc-200">Tutorial video</span> — falling
          notes, your colors & speed, synced piano audio
        </li>
        <li className="rounded-lg border border-zinc-800 p-3">
          🎼 <span className="text-zinc-200">Sheet music</span> — PDF +
          MusicXML, approximate rhythm honestly labeled
        </li>
        <li className="rounded-lg border border-zinc-800 p-3">
          🎯 <span className="text-zinc-200">Beginner mode</span> — easy &
          very-easy MIDI, melody never dropped
        </li>
      </ul>
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
