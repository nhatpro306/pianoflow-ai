"use client";

import { useEffect, useState, useMemo } from "react";
import type {
  LiveMicroTimingFeedback,
  MicroTimingSessionStats,
} from "@/lib/practice/microTiming";

export interface MicroTimingGaugeProps {
  feedback: LiveMicroTimingFeedback | null;
  visible?: boolean;
  className?: string;
  stats?: MicroTimingSessionStats | null;
}

/**
 * Live Micro-Timing Strike Gauge (Milestone N.1).
 *
 * Displays a calibrated horizontal graduated meter representing -75ms (Early) to +75ms (Late).
 * Features:
 * - Center zone (|offset| <= 35ms) styled with Emerald glow (#10b981) and target bullseye reticle.
 * - Left zone (-75ms to -35ms) styled with Amber (#f59e0b, Rushing).
 * - Right zone (+35ms to +75ms) styled with Sky Blue (#0284c7, Dragging).
 * - Dynamic needle translating horizontally based on normalizedOffset * 50% with smooth transition.
 * - Active strike badge displaying floating text with fading bounce animation.
 * - Dark-stage obsidian style: bg-[#09090b]/90 backdrop-blur-md border border-white/10 rounded-full.
 */
export function MicroTimingGauge({
  feedback,
  visible = true,
  className = "",
  stats = null,
}: MicroTimingGaugeProps) {
  const [isStrikeVisible, setIsStrikeVisible] = useState(false);

  useEffect(() => {
    if (feedback) {
      setIsStrikeVisible(true);
      const timer = setTimeout(() => {
        setIsStrikeVisible(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const needleLeftPercent = useMemo(() => {
    if (!feedback) return 50;
    const offset = feedback.normalizedOffset * 50;
    return Math.max(0, Math.min(100, 50 + offset));
  }, [feedback]);

  const activeColor = useMemo(() => {
    if (!feedback) return "#71717a";
    return feedback.color;
  }, [feedback]);

  const badgeText = useMemo(() => {
    if (!feedback) return "";
    if (feedback.rating === "pocket") {
      return "POCKET";
    }
    return feedback.label;
  }, [feedback]);

  if (!visible) return null;

  return (
    <div
      data-testid="micro-timing-gauge"
      className={`relative flex flex-col items-center select-none ${className}`}
    >
      {/* Active Strike Badge with Fading Bounce Animation */}
      {isStrikeVisible && feedback && (
        <div
          key={`${feedback.timestamp}-${feedback.notePitch}-${feedback.deltaMs}`}
          className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none animate-in fade-in zoom-in-75 slide-in-from-bottom-2 duration-200 z-40"
          data-testid="timing-strike-badge"
        >
          <div
            className="px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase shadow-xl border backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap"
            style={{
              backgroundColor: `${feedback.color}25`,
              borderColor: `${feedback.color}90`,
              color: feedback.color,
              boxShadow: `0 0 16px ${feedback.color}60`,
            }}
          >
            <span>{badgeText}</span>
            {feedback.rating !== "miss" && (
              <span className="text-[10px] font-mono opacity-80">
                ({feedback.deltaMs > 0 ? "+" : ""}
                {Math.round(feedback.deltaMs)}ms)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Obsidian Capsule Container */}
      <div className="bg-[#09090b]/90 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 shadow-xl flex items-center gap-3">
        {/* Left Rushing Indicator */}
        <div className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5 whitespace-nowrap tracking-wide">
          <span>◄</span>
          <span className="hidden sm:inline">Rushing</span>
        </div>

        {/* Calibrated Graduated Meter Body */}
        <div className="flex flex-col items-center">
          {/* Top Calibration Markers */}
          <div className="flex justify-between w-48 sm:w-60 md:w-72 text-[9px] font-mono text-zinc-500 mb-0.5 px-0.5">
            <span title="-75ms Early Limit">-75ms</span>
            <span title="-35ms Pocket Threshold">-35ms</span>
            <span className="text-emerald-400 font-bold" title="0ms Dead Center Pocket">
              0ms
            </span>
            <span title="+35ms Pocket Threshold">+35ms</span>
            <span title="+75ms Late Limit">+75ms</span>
          </div>

          {/* Meter Track */}
          <div className="relative w-48 sm:w-60 md:w-72 h-3 rounded-full bg-zinc-950/80 border border-white/10 overflow-visible flex items-center">
            {/* Left Zone: -75ms to -35ms (0% to 26.67%) - Amber Rushing */}
            <div
              className="absolute left-0 top-0 bottom-0 rounded-l-full bg-amber-500/20 border-r border-amber-500/30"
              style={{ width: "26.67%" }}
              title="Rushing Zone (-75ms to -35ms)"
            />

            {/* Center Zone: -35ms to +35ms (26.67% to 73.33%) - Emerald Pocket */}
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
              style={{ left: "26.67%", width: "46.66%" }}
              title="Pocket Zone (-35ms to +35ms)"
            />

            {/* Right Zone: +35ms to +75ms (73.33% to 100%) - Sky Blue Dragging */}
            <div
              className="absolute top-0 bottom-0 rounded-r-full bg-sky-500/20 border-l border-sky-500/30"
              style={{ left: "73.33%", width: "26.67%" }}
              title="Dragging Zone (+35ms to +75ms)"
            />

            {/* Target Bullseye Ring at 0ms (Center) */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-emerald-400/80 bg-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.7)] flex items-center justify-center pointer-events-none z-10"
              title="Pocket Bullseye Target (0ms)"
            >
              <div className="w-1 h-1 rounded-full bg-emerald-300" />
            </div>

            {/* Sub-threshold notch dividers */}
            <div
              className="absolute left-[26.67%] top-0 bottom-0 w-[1px] bg-amber-500/40 pointer-events-none z-10"
              title="-35ms boundary"
            />
            <div
              className="absolute left-[73.33%] top-0 bottom-0 w-[1px] bg-sky-500/40 pointer-events-none z-10"
              title="+35ms boundary"
            />

            {/* Dynamic Needle / Pointer Translating Horizontally */}
            <div
              className="absolute top-1/2 z-20 pointer-events-none transition-all duration-300 ease-out flex flex-col items-center"
              style={{
                left: `${needleLeftPercent}%`,
                transform: "translateX(-50%) translateY(-50%)",
              }}
              data-testid="timing-pointer"
            >
              {/* Diamond tip */}
              <div
                className="w-2.5 h-2.5 rotate-45 border border-white shadow-md transition-colors duration-200"
                style={{
                  backgroundColor: activeColor,
                  boxShadow: `0 0 8px ${activeColor}, 0 0 16px ${activeColor}80`,
                }}
              />
              {/* Vertical shaft */}
              <div
                className="w-1 h-4 rounded-full transition-colors duration-200"
                style={{
                  backgroundColor: activeColor,
                  boxShadow: `0 0 6px ${activeColor}`,
                }}
              />
            </div>
          </div>

          {/* Bottom Indicators */}
          <div className="flex justify-between w-48 sm:w-60 md:w-72 text-[9px] font-bold text-zinc-400 mt-0.5 px-0.5">
            <span className="text-amber-400/80 font-mono">◄ Rush</span>
            <span className="text-emerald-400 font-bold tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              POCKET
            </span>
            <span className="text-sky-400/80 font-mono">Drag ►</span>
          </div>
        </div>

        {/* Right Dragging Indicator */}
        <div className="text-[10px] font-bold text-sky-400 flex items-center gap-0.5 whitespace-nowrap tracking-wide">
          <span className="hidden sm:inline">Dragging</span>
          <span>►</span>
        </div>

        {/* Optional Mini Session Stats Pill */}
        {stats && stats.totalCount > 0 && (
          <div
            className="hidden md:flex items-center gap-2 pl-3 border-l border-white/10 text-[10px] font-mono text-zinc-400 whitespace-nowrap"
            data-testid="timing-stats-pill"
          >
            <span className="text-emerald-400 font-semibold" title="Pocket Hit Rate">
              {stats.pocketRate}%
            </span>
            <span className="text-zinc-600">•</span>
            <span
              className={
                stats.meanBiasMs < -10
                  ? "text-amber-400"
                  : stats.meanBiasMs > 10
                    ? "text-sky-400"
                    : "text-zinc-300"
              }
              title="Average Timing Bias"
            >
              {stats.meanBiasMs > 0 ? `+${stats.meanBiasMs}` : stats.meanBiasMs}ms
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400" title="Timing Jitter Standard Deviation">
              ±{stats.jitterMs}ms
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default MicroTimingGauge;
