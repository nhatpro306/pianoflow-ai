import { forwardRef, type HTMLAttributes } from "react";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number; // 0 to 100
  indeterminate?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className = "",
      value = 0,
      indeterminate = false,
      showLabel = false,
      size = "md",
      ...props
    },
    ref
  ) => {
    const clampedValue = Math.min(100, Math.max(0, value));

    const heightStyles = {
      sm: "h-1.5",
      md: "h-2",
      lg: "h-3",
    };

    const track = (
      <div
        ref={!showLabel ? ref : undefined}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : Math.round(clampedValue)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full overflow-hidden rounded-full border border-white/5 bg-zinc-900 ${heightStyles[size]} ${!showLabel ? className : ""}`}
        {...(!showLabel ? props : {})}
      >
        {indeterminate ? (
          <div className="h-full w-full bg-gradient-to-r from-violet-600/30 via-cyan-400 to-violet-600/30 bg-[length:200%_100%] animate-shimmer" />
        ) : (
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${clampedValue}%` }}
          />
        )}
      </div>
    );

    if (!showLabel) {
      return track;
    }

    return (
      <div
        ref={ref}
        className={`flex w-full items-center gap-3 ${className}`}
        {...props}
      >
        <div className="flex-1">{track}</div>
        <span className="shrink-0 font-mono text-xs tabular-nums text-zinc-300">
          {Math.round(clampedValue)}%
        </span>
      </div>
    );
  }
);

Progress.displayName = "Progress";
