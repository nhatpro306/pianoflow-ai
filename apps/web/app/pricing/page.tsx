"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { api } from "@/lib/api";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setError(null);
      const { url } = await api.createCheckoutSession("price_pro_10");
      if (url) {
        window.location.href = url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initiate checkout");
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-zinc-400">
          Choose the plan that&apos;s right for you.
        </p>
      </div>

      {error && (
        <div className="mb-8 rounded-lg bg-red-950/50 p-4 text-center text-red-400 border border-red-900/50">
          {error}
        </div>
      )}

      <div className="grid gap-8 sm:grid-cols-2 lg:gap-12 max-w-4xl mx-auto">
        {/* Free Tier */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-sm flex flex-col">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-zinc-100">Free</h2>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold text-zinc-100">
              $0
              <span className="ml-1 text-xl font-medium text-zinc-500">/mo</span>
            </div>
            <p className="mt-4 text-sm text-zinc-400">Perfect for getting started with PianoFlow AI.</p>
          </div>
          <ul className="mb-8 flex-1 space-y-4 text-sm text-zinc-300">
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-cyan-400 flex-shrink-0" />
              <span>3 Projects per month</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-cyan-400 flex-shrink-0" />
              <span>Basic MIDI parsing</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-cyan-400 flex-shrink-0" />
              <span>Standard rendering speed</span>
            </li>
          </ul>
          <button
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-700 transition-colors"
            disabled
          >
            Current Plan
          </button>
        </div>

        {/* Pro Tier */}
        <div className="rounded-2xl border border-cyan-500/50 bg-zinc-900 p-8 shadow-sm ring-1 ring-cyan-500/20 flex flex-col relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-cyan-400">Pro</h2>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold text-zinc-100">
              $10
              <span className="ml-1 text-xl font-medium text-zinc-500">/mo</span>
            </div>
            <p className="mt-4 text-sm text-zinc-400">For serious musicians and creators.</p>
          </div>
          <ul className="mb-8 flex-1 space-y-4 text-sm text-zinc-300">
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-cyan-400 flex-shrink-0" />
              <span>Unlimited Projects</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-cyan-400 flex-shrink-0" />
              <span>Advanced AI Audio → MIDI</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-cyan-400 flex-shrink-0" />
              <span>Priority rendering queue</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-cyan-400 flex-shrink-0" />
              <span>High-quality video export</span>
            </li>
          </ul>
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full rounded-lg bg-cyan-500 py-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Redirecting..." : "Upgrade to Pro"}
          </button>
        </div>
      </div>
    </main>
  );
}
