import React from "react";

interface LevelProgressProps {
  level: number;
  totalXp: number;
  xpToNextLevel: number;
  className?: string;
}

export function LevelProgress({
  level,
  totalXp,
  xpToNextLevel,
  className = "",
}: LevelProgressProps) {
  const currentLevelXp = Math.max(0, totalXp);
  const nextLevelThreshold = totalXp + xpToNextLevel;
  const percentage = Math.min(
    100,
    Math.max(10, Math.round((currentLevelXp / Math.max(1, nextLevelThreshold)) * 100))
  );

  return (
    <div
      data-testid="linear-level-progress"
      className={`inline-flex items-center gap-2.5 rounded-xl border border-white/5 bg-[#121215]/80 px-3 py-1.5 backdrop-blur-md shadow-sm ${className}`}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600/30 to-cyan-500/30 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/30 shadow-sm">
        Lv.{level}
      </div>
      <div className="flex flex-col gap-1 min-w-[100px]">
        <div className="flex justify-between items-center text-[11px] font-mono font-medium text-zinc-400 leading-none">
          <span className="text-zinc-200 font-semibold">{totalXp} XP</span>
          <span className="text-zinc-500">{xpToNextLevel} to next</span>
        </div>
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-zinc-900 border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

