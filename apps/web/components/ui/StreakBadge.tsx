import { Flame } from "lucide-react";
import { Badge } from "./Badge";

interface StreakBadgeProps {
  streakDays: number;
  className?: string;
}

export function StreakBadge({ streakDays, className = "" }: StreakBadgeProps) {
  if (streakDays <= 0) return null;

  return (
    <Badge
      variant="streak"
      size="md"
      data-testid="header-streak-badge"
      className={`inline-flex items-center gap-1.5 shadow-sm shadow-amber-500/10 font-semibold ${className}`}
    >
      <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-400 animate-pulse" />
      <span>🔥 {streakDays}d Streak ({streakDays} {streakDays === 1 ? "Day" : "Days"})</span>
    </Badge>
  );
}

