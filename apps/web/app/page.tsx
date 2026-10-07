import Link from "next/link";
import {
  Sparkles,
  Music,
  ArrowRight,
  Activity,
  FileText,
  BarChart3,
  Wand2,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const FEATURES = [
  {
    icon: Activity,
    badgeVariant: "hand-lh" as const,
    badgeText: "Web MIDI & Mic",
    title: "Interactive Web MIDI Practice",
    description:
      "Connect any USB or Bluetooth digital piano, or use acoustic microphone pitch detection. Practice in real-time with Wait Mode, hands-separate isolation, and adaptive auto-ramp tempo.",
  },
  {
    icon: FileText,
    badgeVariant: "hand-rh" as const,
    badgeText: "Vector Staves",
    title: "Professional Vector Grand Staff Sheet Music",
    description:
      "Publication-grade vector sheet music automatically engraved from your MIDI or audio. Features synchronized playback cursors, custom zoom, and crisp 300+ DPI vector PDF printing.",
  },
  {
    icon: BarChart3,
    badgeVariant: "accent" as const,
    badgeText: "±10ms Precision",
    title: "AI Coaching & Rushing/Dragging Analytics",
    description:
      "Deep pedagogical insights and micro-timing drift telemetry down to ±10ms. Discover exactly where you rush or drag with color-coded measure heatmaps and targeted phrase drills.",
  },
  {
    icon: Wand2,
    badgeVariant: "warning" as const,
    badgeText: "Demucs + Transkun",
    title: "Audio-to-MIDI Transcription Engine",
    description:
      "Powered by Demucs v4 stem isolation and Transkun neural transcription. Upload MP3s or paste YouTube links to extract clean polyphonic piano arrangements in seconds.",
  },
];

const TELEMETRY_STATS = [
  {
    value: "88.4%",
    label: "Transcription F1 Score",
    detail: "Demucs + Transkun benchmark",
  },
  {
    value: "60 FPS",
    label: "Fluid WebGL Canvas",
    detail: "Sub-16ms RAF render loop",
  },
  {
    value: "<15ms",
    label: "Web MIDI Latency",
    detail: "Zero perceptible key lag",
  },
  {
    value: "100%",
    label: "Browser-Native Studio",
    detail: "Zero install, instant access",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Multi-Source Ingestion",
    desc: "Drop a MIDI file, upload WAV/MP3, or paste a YouTube / social video URL. The engine validates duration, tempo, and polyphony automatically.",
    badge: "MIDI • Audio • YouTube",
  },
  {
    step: "02",
    title: "AI Stem Isolation & Quantization",
    desc: "Neural models isolate clean acoustic piano stems, transcribe pitch onsets and velocity, and score difficulty into Original, Easy, or Very Easy.",
    badge: "Demucs • Transkun Neural AI",
  },
  {
    step: "03",
    title: "Practice & Master at 60 FPS",
    desc: "Play along in Wait Mode on your MIDI keyboard, print high-resolution sheet music, or export 1080p60 Synthesia-style tutorial videos.",
    badge: "Wait Mode • Vector PDF • 1080p60",
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-zinc-100">
      {/* Ambient Concert Stage Lighting */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(124,58,237,0.15),rgba(255,255,255,0))]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-cyan-500/5 blur-[140px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center text-center">
          <Badge variant="accent" dot className="mb-6 shadow-sm">
            Next-Gen Piano Learning &amp; Transcription
          </Badge>

          <h1 className="max-w-4xl text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] text-zinc-100">
            Master Any Song on Piano with{" "}
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-cyan-200 bg-clip-text text-transparent">
              AI-Powered 60 FPS Visuals
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-400">
            Transform any YouTube video, MP3 audio, or MIDI into interactive
            Synthesia-style tutorials, real-time practice sessions, and engraved sheet music.
          </p>

          {/* Primary Action Row */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/create">
              <Button variant="gradient" size="lg" className="shadow-xl">
                Start Practicing Free
              </Button>
            </Link>
            <Link href="/demo">
              <Button
                variant="secondary"
                size="lg"
                className="border-white/10 hover:border-cyan-500/40"
              >
                Explore Classical Demo ✨
              </Button>
            </Link>
          </div>

          {/* Interactive Falling Note Teaser Card */}
          <div className="mt-14 w-full max-w-4xl">
            <Link
              href="/demo"
              className="group block relative rounded-2xl border border-white/10 bg-[#121215]/85 p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/40 hover:shadow-cyan-950/40 text-left overflow-hidden"
            >
              {/* Card Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
                    <Music className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-zinc-100 group-hover:text-cyan-300 transition-colors">
                      Für Elise — Ludwig van Beethoven
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono">
                      A Minor • 132 BPM • 842 Notes • Original Score
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="success" dot>
                    60 FPS WebGL Engine
                  </Badge>
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
                    Try Demo <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>

              {/* Falling Note Visualization Stage Well */}
              <div className="mt-5 relative h-48 sm:h-56 w-full rounded-xl border border-white/5 bg-[#050507] p-4 overflow-hidden flex flex-col justify-end">
                {/* Background Grid Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_100%]" />

                {/* Animated Falling Note Stream */}
                <div className="absolute inset-x-0 top-0 bottom-12 overflow-hidden pointer-events-none">
                  {/* Note Bar 1 (RH Violet) */}
                  <div className="absolute top-2 left-[28%] h-16 w-3.5 rounded-full bg-gradient-to-b from-violet-500 to-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.5)] animate-pulse" />
                  {/* Note Bar 2 (LH Cyan) */}
                  <div className="absolute top-8 left-[18%] h-20 w-3.5 rounded-full bg-gradient-to-b from-cyan-500 to-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]" />
                  {/* Note Bar 3 (RH Violet) */}
                  <div className="absolute top-16 left-[54%] h-14 w-3.5 rounded-full bg-gradient-to-b from-violet-500 to-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.5)] animate-pulse" />
                  {/* Note Bar 4 (RH Violet) */}
                  <div className="absolute top-6 left-[62%] h-12 w-3.5 rounded-full bg-gradient-to-b from-violet-500 to-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                  {/* Note Bar 5 (LH Cyan) */}
                  <div className="absolute top-20 left-[38%] h-16 w-3.5 rounded-full bg-gradient-to-b from-cyan-500 to-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]" />
                  {/* Note Bar 6 (RH Violet) */}
                  <div className="absolute top-4 left-[75%] h-24 w-3.5 rounded-full bg-gradient-to-b from-violet-500 to-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                </div>

                {/* Hit Line */}
                <div className="relative z-10 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_16px_rgba(6,182,212,0.8)]" />

                {/* Stylized Mini Piano Keyboard Strike Well */}
                <div className="relative z-10 mt-1 h-9 w-full rounded-md bg-zinc-950 border border-white/10 flex items-center justify-between px-2 overflow-hidden">
                  <div className="flex gap-1">
                    <span className="h-7 w-2 rounded-sm bg-white/20" />
                    <span className="h-5 w-1.5 rounded-sm bg-zinc-900 border border-white/20" />
                    <span className="h-7 w-2 rounded-sm bg-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                    <span className="h-7 w-2 rounded-sm bg-white/20" />
                    <span className="h-5 w-1.5 rounded-sm bg-zinc-900 border border-white/20" />
                    <span className="h-7 w-2 rounded-sm bg-violet-400/80 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                    <span className="h-7 w-2 rounded-sm bg-white/20" />
                  </div>

                  {/* Animated Soundwave Telemetry */}
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
                    <div className="flex items-end gap-0.5 h-4">
                      <span className="w-1 h-2 bg-cyan-400 rounded-full animate-pulse" />
                      <span className="w-1 h-3.5 bg-violet-400 rounded-full" />
                      <span className="w-1 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                      <span className="w-1 h-4 bg-emerald-400 rounded-full" />
                    </div>
                    <span className="hidden sm:inline">Web Audio 48kHz Acoustic Grand</span>
                    <span className="text-emerald-400">● Live Sync</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Banner */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Zero account required — test Wait Mode, speed multiplier, &amp; vector sheet music immediately.
                </span>
                <span className="font-semibold text-cyan-400">
                  Open Interactive Studio →
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mt-28">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Engineered for Complete Musical Fluency
            </h2>
            <p className="mt-2 text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
              From raw audio recordings to concert-ready performance, every tool works in seamless synergy.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Card
                  key={f.title}
                  className="p-6 transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-950/20 group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 border border-white/10 group-hover:border-cyan-500/30 transition-colors">
                      <Icon className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <Badge variant={f.badgeVariant} dot>
                      {f.badgeText}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-cyan-300 transition-colors mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    {f.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Telemetry Stats Bar */}
        <section className="mt-24 rounded-2xl border border-white/5 bg-[#121215]/60 p-8 backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
            {TELEMETRY_STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  {stat.value}
                </span>
                <span className="mt-2 text-xs sm:text-sm font-semibold text-zinc-200">
                  {stat.label}
                </span>
                <span className="mt-0.5 text-[11px] text-zinc-500">
                  {stat.detail}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 3-Step Workflow Pipeline */}
        <section className="mt-28">
          <div className="text-center mb-14">
            <Badge variant="accent" dot className="mb-3">
              Streamlined Flow
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              From Sound to Mastery in 3 Steps
            </h2>
            <p className="mt-2 text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
              Our automated neural pipeline handles the complex audio engineering so you can focus entirely on playing.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {WORKFLOW_STEPS.map((step) => (
              <div
                key={step.step}
                className="relative rounded-2xl border border-white/5 bg-[#121215]/80 p-6 flex flex-col justify-between hover:border-white/15 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-2xl font-black text-cyan-400/50">
                      {step.step}
                    </span>
                    <Badge variant="default" size="sm">
                      {step.badge}
                    </Badge>
                  </div>
                  <h4 className="text-base font-semibold text-zinc-100 mb-2">
                    {step.title}
                  </h4>
                  <p className="text-xs sm:text-sm leading-relaxed text-zinc-400">
                    {step.desc}
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Automated Processing</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Concert Stage Illumination CTA */}
        <section className="mt-32 relative rounded-3xl border border-white/10 bg-[#121215]/90 p-8 sm:p-14 text-center overflow-hidden shadow-2xl">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_50%,rgba(124,58,237,0.2),rgba(6,182,212,0.05),transparent_70%)]"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
            <Sparkles className="h-8 w-8 text-cyan-400 mb-4 animate-pulse" />
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-100">
              Ready to Master Your Favorite Piece?
            </h2>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-zinc-400">
              Start practicing in under 30 seconds. Connect your keyboard or microphone and experience the future of piano learning.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/create">
                <Button variant="gradient" size="lg" className="shadow-xl">
                  Start Practicing Free
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="secondary" size="lg">
                  Explore Classical Demo ✨
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-24 border-t border-white/5 pt-8 text-center text-xs text-zinc-500">
          <p>
            PianoFlow AI — 60 FPS WebGL Piano Engine &amp; AI Neural Transcription Studio.
          </p>
          <p className="mt-1 text-zinc-600">
            Open-source architecture • Built with Next.js 15, React 19 &amp; Tailwind CSS v4.
          </p>
        </footer>
      </div>
    </main>
  );
}
