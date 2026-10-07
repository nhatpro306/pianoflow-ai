"use client";

import { useState } from "react";
import { Check, HelpCircle, ChevronDown, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "Do I need a physical MIDI keyboard to use PianoFlow AI?",
    answer:
      "No! You can practice using your standard computer keyboard, an acoustic piano detected live through your microphone, or the interactive touchscreen virtual keyboard on tablets and phones.",
  },
  {
    question: "How accurate is the AI Audio-to-MIDI transcription engine?",
    answer:
      "We pair Demucs v4 stem isolation with Transkun high-resolution neural transcription, delivering an industry-leading 88.4% F1 note accuracy on acoustic piano recordings and YouTube videos.",
  },
  {
    question: "Can I export and print sheet music for performances or students?",
    answer:
      "Yes. All sheet music is rendered using high-precision vector engraving, allowing razor-sharp 300+ DPI printing on any home printer or PDF export for tablet readers like forScore.",
  },
  {
    question: "Can I cancel or switch my billing plan at any time?",
    answer:
      "Yes, you can cancel or switch between monthly and annual plans at any time from your account settings. You will retain full Pro benefits until the end of your prepaid period.",
  },
  {
    question: "Are exported videos free for commercial YouTube or social use?",
    answer:
      "Yes! Pro and Studio members receive 100% royalty-free, watermark-free commercial rights to all generated Synthesia-style tutorial videos and audio stems.",
  },
];

interface ComparisonRow {
  category?: string;
  name: string;
  free: string;
  pro: string;
  studio: string;
}

const COMPARISON_MATRIX: ComparisonRow[] = [
  {
    name: "MIDI File Upload Size",
    free: "5 MB",
    pro: "25 MB",
    studio: "100 MB",
  },
  {
    name: "AI Audio & Video Transcription",
    free: "3 min preview",
    pro: "60 min / month",
    studio: "300 min / month",
  },
  {
    name: "Video Export Resolution",
    free: "720p 30 FPS (watermark)",
    pro: "1080p 60 FPS (watermark-free)",
    studio: "4K 60 FPS (master-grade)",
  },
  {
    name: "Interactive Web MIDI Practice",
    free: "✓ Standard",
    pro: "✓ Wait Mode + Auto-Ramp",
    studio: "✓ Custom Drills & Loops",
  },
  {
    name: "Acoustic Microphone Pitch Detection",
    free: "✓ Included",
    pro: "✓ Included",
    studio: "✓ High-Sensitivity Polyphonic",
  },
  {
    name: "AI Timing Diagnostics & Heatmaps",
    free: "Basic Score",
    pro: "✓ Measure-by-measure (±10ms)",
    studio: "✓ Classroom Performance Matrix",
  },
  {
    name: "Printable Vector Sheet Music",
    free: "1 PDF / day",
    pro: "✓ Unlimited PDF & MusicXML",
    studio: "✓ Commercial Licensing",
  },
  {
    name: "Cloud Project Retention",
    free: "7 Days",
    pro: "90 Days",
    studio: "Unlimited Forever",
  },
  {
    name: "GPU Rendering Queue",
    free: "Standard Queue",
    pro: "⚡ A10G VIP Priority",
    studio: "🚀 Dedicated GPU Node",
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setError(null);
      const priceId = billingCycle === "annual" ? "price_pro_annual" : "price_pro_10";
      const { url } = await api.createCheckoutSession(priceId);
      if (url) {
        window.location.href = url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initiate checkout");
      setLoading(false);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const isAnnual = billingCycle === "annual";

  return (
    <main className="relative min-h-screen bg-[#050507] text-zinc-100 py-16 px-6 sm:px-8">
      {/* Ambient Lighting */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(124,58,237,0.12),rgba(255,255,255,0))]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl">
        {/* Page Header */}
        <div className="mb-12 text-center">
          <Badge variant="accent" dot className="mb-4">
            Simple, Transparent Memberships
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-100">
            Invest in Your Musical Fluency
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 max-w-xl mx-auto">
            Choose the plan that suits your practice goals. Upgrade, downgrade, or cancel anytime.
          </p>

          {/* Monthly / Annual Billing Toggle */}
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-[#121215]/90 p-1.5 shadow-inner backdrop-blur-xl">
              <button
                type="button"
                data-testid="billing-toggle-monthly"
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-full px-5 py-2 text-xs font-semibold transition-all select-none ${
                  !isAnnual
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                data-testid="billing-toggle-annual"
                onClick={() => setBillingCycle("annual")}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-all select-none ${
                  isAnnual
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>Annual Billing</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  Save 20% 🎉
                </span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 mx-auto max-w-md rounded-xl bg-rose-950/60 p-4 text-center text-sm text-rose-300 border border-rose-800/60">
            {error}
          </div>
        )}

        {/* 3 Tier Cards */}
        <div className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto items-stretch">
          {/* Free Tier Card */}
          <Card className="bg-[#121215] border-white/10 p-8 rounded-3xl flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-zinc-100">Free Tier</h3>
                <Badge variant="default">Basic</Badge>
              </div>
              <div className="mt-2 flex items-baseline">
                <span className="text-5xl font-extrabold text-zinc-100 font-mono" data-testid="price-free">
                  $0
                </span>
                <span className="ml-1 text-sm font-medium text-zinc-400">/mo</span>
              </div>
              <p className="mt-3 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Essential tools to explore interactive Web MIDI and test piano transcriptions.
              </p>

              <div className="my-6 border-t border-white/5" />

              <ul className="space-y-3.5 text-xs sm:text-sm text-zinc-300">
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>3 Repertoire Projects per month</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>720p 30 FPS tutorial video export</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>Standard Web MIDI &amp; virtual keys</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>1 Printable sheet music PDF / day</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>Community SoundFont acoustic audio</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4">
              <Button variant="secondary" disabled className="w-full">
                Current Plan
              </Button>
            </div>
          </Card>

          {/* Pro Tier Card (Highlighted) */}
          <div className="rounded-3xl border border-violet-500/50 bg-[#121215] p-8 relative shadow-2xl shadow-violet-950/40 ring-1 ring-violet-500/30 flex flex-col justify-between">
            {/* Radiant Top Accent Bar */}
            <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-3xl bg-gradient-to-r from-violet-500 via-cyan-400 to-violet-500" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">Pro Tier</h3>
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                </div>
                <Badge variant="accent" dot>
                  MOST POPULAR
                </Badge>
              </div>

              <div className="mt-2 flex items-baseline">
                <span className="text-5xl font-extrabold text-white font-mono" data-testid="price-pro">
                  {isAnnual ? "$9.99" : "$12"}
                </span>
                <span className="ml-1 text-sm font-medium text-zinc-400">
                  /mo {isAnnual ? "(billed $119.88/yr)" : ""}
                </span>
              </div>
              <p className="mt-3 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Full-featured studio suite for serious musicians, students, and content creators.
              </p>

              <div className="my-6 border-t border-white/10" />

              <ul className="space-y-3.5 text-xs sm:text-sm text-zinc-200">
                <li className="flex items-center gap-3 font-medium">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Unlimited Repertoire Projects</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>1080p 60 FPS watermark-free videos</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>60 AI transcription minutes / mo</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>AI Coaching &amp; ±10ms timing heatmaps</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Unlimited Vector Sheet PDF &amp; MusicXML</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>⚡ Priority A10G GPU rendering queue</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4">
              <Button
                variant="gradient"
                size="lg"
                onClick={handleCheckout}
                isLoading={loading}
                className="w-full shadow-lg shadow-violet-950/50"
              >
                {loading ? "Redirecting…" : "Upgrade to Pro"}
              </Button>
            </div>
          </div>

          {/* Studio Tier Card */}
          <Card className="bg-[#121215] border-white/10 p-8 rounded-3xl flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-zinc-100">Studio Tier</h3>
                <Badge variant="hand-lh">Institutional</Badge>
              </div>
              <div className="mt-2 flex items-baseline">
                <span className="text-5xl font-extrabold text-zinc-100 font-mono" data-testid="price-studio">
                  {isAnnual ? "$24" : "$29"}
                </span>
                <span className="ml-1 text-sm font-medium text-zinc-400">
                  /mo {isAnnual ? "(billed $288/yr)" : ""}
                </span>
              </div>
              <p className="mt-3 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                For piano teachers, music academies, and professional production studios.
              </p>

              <div className="my-6 border-t border-white/5" />

              <ul className="space-y-3.5 text-xs sm:text-sm text-zinc-300">
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>Everything in Pro Tier</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>4K 60 FPS master-grade tutorial exports</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>300 AI transcription minutes / mo</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>Multi-student progress &amp; assignments</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>Custom studio watermarks &amp; branding</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>🚀 Dedicated GPU cloud worker node</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleCheckout}
                className="w-full border-white/10 hover:border-cyan-500/40"
              >
                Start Studio Trial
              </Button>
            </div>
          </Card>
        </div>

        {/* Feature Comparison Matrix Table */}
        <section className="mt-28">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Detailed Feature Comparison Matrix
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Every detail engineered for professional musicians and pedagogical studios.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121215]/80 backdrop-blur-xl shadow-2xl">
            <table className="w-full text-left text-sm" data-testid="comparison-matrix-table">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="py-4 px-6 font-semibold text-zinc-200">Feature</th>
                  <th className="py-4 px-6 font-semibold text-zinc-200">Free</th>
                  <th className="py-4 px-6 font-semibold text-cyan-400">Pro (Popular)</th>
                  <th className="py-4 px-6 font-semibold text-zinc-200">Studio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-xs sm:text-sm">
                {COMPARISON_MATRIX.map((row) => (
                  <tr key={row.name} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-sans font-medium text-zinc-200">
                      {row.name}
                    </td>
                    <td className="py-4 px-6 text-zinc-400">{row.free}</td>
                    <td className="py-4 px-6 text-cyan-300 font-semibold">{row.pro}</td>
                    <td className="py-4 px-6 text-zinc-300">{row.studio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="mt-28 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 mb-3">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Everything you need to know about our web engine, subscriptions, and hardware support.
            </p>
          </div>

          <div className="space-y-4" data-testid="faq-accordion">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={faq.question}
                  className="rounded-2xl border border-white/5 bg-[#121215]/80 overflow-hidden transition-all duration-200 hover:border-white/15"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between p-5 text-left transition-colors"
                  >
                    <span className="text-sm sm:text-base font-semibold text-zinc-100">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 text-zinc-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-cyan-400" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm leading-relaxed text-zinc-400 border-t border-white/5 animate-in fade-in">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Reassurance Footer */}
        <div className="mt-24 text-center text-xs text-zinc-500 border-t border-white/5 pt-8">
          <p>
            Secure payments processed with 256-bit SSL encryption via Stripe.
          </p>
          <p className="mt-1 text-zinc-600">
            Need educational group discounts or custom volume API licensing? Contact sales@pianoflow.ai
          </p>
        </div>
      </div>
    </main>
  );
}
