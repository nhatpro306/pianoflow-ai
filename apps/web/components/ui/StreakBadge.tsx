import { Flame } from "lucide-react";

interface StreakBadgeProps {
  streakDays: number;
}

export function StreakBadge({ streakDays }: StreakBadgeProps) {
  if (streakDays <= 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-sm font-medium text-orange-500 border border-orange-500/20">
      <Flame className="h-4 w-4 fill-orange-500" />
      <span>{streakDays} {streakDays === 1 ? 'Day' : 'Days'}</span>
    </div>
  );
}
