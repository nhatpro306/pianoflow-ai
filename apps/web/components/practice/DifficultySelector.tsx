"use client";

import React from "react";
import type { SimplificationDifficulty, SimplificationStats } from "@/lib/midi/simplifyEngine";

export interface DifficultySelectorProps {
  value: SimplificationDifficulty;
  onChange: (diff: SimplificationDifficulty) => void;
  stats?: Partial<SimplificationStats> | {
    originalCount?: number;
    simplifiedCount?: number;
    reductionPercent?: number;
  };
  compact?: boolean;
  className?: string;
}

const OPTIONS: Array<{
  id: SimplificationDifficulty;
  label: string;
  dotColor?: string;
  dotEmoji?: string;
}> = [
  { id: "original", label: "Original" },
  { id: "easy", label: "Easy", dotEmoji: "🟢" },
  { id: "very_easy", label: "Very Easy", dotEmoji: "🟡" },
];

export function DifficultySelector({
  value,
  onChange,
  stats,
  compact = false,
  className = "",
}: DifficultySelectorProps) {
  const reductionPercent =
    "reductionPercent" in (stats ?? {})
      ? (stats as SimplificationStats).reductionPercent
      : undefined;

  return (
    <div
      role="group"
      aria-label="Arrangement difficulty"
      data-testid="difficulty-selector"
      className={`inline-flex items-center p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-inner gap-1 select-none backdrop-blur-sm ${className}`}
    >
      {OPTIONS.map((opt) => {
        const isActive = value === opt.id;

        let activeClasses = "";
        let inactiveClasses = "";

        if (opt.id === "original") {
          activeClasses =
            "bg-zinc-800 text-zinc-100 font-medium shadow-sm border border-zinc-700";
          inactiveClasses = "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40";
        } else if (opt.id === "easy") {
          activeClasses =
            "bg-emerald-950/80 text-emerald-300 font-semibold shadow-sm border border-emerald-700/60 ring-1 ring-emerald-500/30";
          inactiveClasses =
            "text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-950/30";
        } else {
          activeClasses =
            "bg-amber-950/80 text-amber-300 font-semibold shadow-sm border border-amber-700/60 ring-1 ring-amber-500/30";
          inactiveClasses =
            "text-amber-400/80 hover:text-amber-300 hover:bg-amber-950/30";
        }

        return (
          <button
            key={opt.id}
            type="button"
            data-testid={`difficulty-option-${opt.id}`}
            aria-pressed={isActive}
            onClick={() => onChange(opt.id)}
            className={`flex items-center gap-1.5 ${
              compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
            } rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-zinc-500 ${
              isActive ? activeClasses : inactiveClasses
            }`}
          >
            <span>{opt.label}</span>
            {opt.dotEmoji && <span className="text-[10px]">{opt.dotEmoji}</span>}

            {/* Reduction percentage badge chip for active simplified tier */}
            {isActive &&
              opt.id !== "original" &&
              reductionPercent !== undefined &&
              reductionPercent > 0 && (
                <span
                  data-testid="difficulty-badge-reduction"
                  className={`ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    opt.id === "easy"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  -{reductionPercent}%
                </span>
              )}
          </button>
        );
      })}
    </div>
  );
}
