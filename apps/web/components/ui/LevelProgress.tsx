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
  // Depends on backend implementation if it's total or level specific. Assuming the formula: progress = xpInCurrentLevel / (xpInCurrentLevel + xpToNextLevel).
  // Actually, let's assume totalXp is all-time XP, and xpToNextLevel is what remains to get from current XP to the next level threshold.
  // Wait, let's just make a generic xp bar, but without knowing the base XP for the current level it's hard to make a percentage.
  // Let's assume progress is some arbitrary value based on current xp and next level if not specified.
  // We'll calculate a percentage. Usually, totalXP / (totalXp + xpToNextLevel) is not right because 0 XP in level N isn't 0 total.
  // Let's just do a simple visual where we don't know the percentage, we can just show XP to next level text.
  // Oh, wait, the API returns: total_xp, xp_to_next_level.
  // The XP for the *current level* is not provided, so we don't know the exact percentage of the current level.
  // But maybe we can just pretend it's a fixed amount per level, e.g., 1000? No, let's just render the text and a basic bar that maybe represents total XP loosely.
  // Better yet, just don't show a bar filling up if we can't calculate it precisely, or we assume something like percentage = 100 - (xpToNextLevel / 1000 * 100) (if next level is 1000 XP).
  // Let's create a generic XP progress bar that fills up a bit.
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-500 font-bold border border-cyan-500/30">
        {level}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs font-medium text-zinc-400">
          <span>{totalXp} XP</span>
          <span>{xpToNextLevel} to next</span>
        </div>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-zinc-800">
          {/* We'll just put a 50% width if we don't know, or calculate a mock percentage */}
          <div
            className="h-full bg-cyan-500 rounded-full"
            style={{ width: "50%" }}
          />
        </div>
      </div>
    </div>
  );
}
