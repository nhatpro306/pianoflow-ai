import Link from "next/link";

const FEATURES = [
  {
    icon: "🎬",
    title: "Tutorial Videos",
    description:
      "Synthesia-style falling-note videos with real piano audio. Customizable colors, speed, and resolution.",
  },
  {
    icon: "🎼",
    title: "Sheet Music",
    description:
      "Readable PDF sheet music and MusicXML export generated from your MIDI — ready for practice or editing.",
  },
  {
    icon: "🎯",
    title: "Beginner Mode",
    description:
      "Simplified arrangements that preserve the melody while reducing complexity. Easy and very-easy difficulties.",
  },
  {
    icon: "🎙️",
    title: "Audio to MIDI",
    description:
      "Upload an MP3 or WAV recording and get a draft MIDI transcription. Beta — honest about its limitations.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      {/* Hero */}
      <section className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          🎹 PianoFlow <span className="text-cyan-400">AI</span>
        </h1>
        <p className="max-w-xl text-lg text-zinc-400">
          Turn any piano MIDI into a tutorial video, sheet music, and a
          beginner-friendly version — in minutes, not hours.
        </p>
        <div className="flex gap-3">
          <Link
            href="/upload"
            className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-400"
          >
            Upload a MIDI
          </Link>
          <Link
            href="/projects"
            className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold transition hover:bg-zinc-800"
          >
            My Projects
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-6 pb-20 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
          >
            <div className="mb-3 text-3xl">{f.icon}</div>
            <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
            <p className="text-sm text-zinc-400">{f.description}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-800 py-16 text-center">
        <h2 className="mb-8 text-2xl font-bold">How it works</h2>
        <div className="mx-auto grid max-w-3xl gap-8 sm:grid-cols-3">
          {[
            { step: "1", label: "Upload", desc: "Drop a MIDI file or audio recording" },
            { step: "2", label: "Configure", desc: "Pick colors, speed, difficulty, and resolution" },
            { step: "3", label: "Export", desc: "Download video, sheet music, or simplified MIDI" },
          ].map((s) => (
            <div key={s.step} className="flex flex-col items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-lg font-bold text-cyan-400">
                {s.step}
              </span>
              <h4 className="font-semibold">{s.label}</h4>
              <p className="text-sm text-zinc-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
        PianoFlow AI — open-source portfolio project
      </footer>
    </main>
  );
}
