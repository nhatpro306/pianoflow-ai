import { HTMLAttributes, forwardRef } from "react";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number; // 0 to 100
  indeterminate?: boolean;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className = "", value = 0, indeterminate, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`h-2 w-full overflow-hidden rounded-full bg-zinc-800 ${className}`}
        {...props}
      >
        {indeterminate ? (
          <div className="h-full w-full bg-gradient-to-r from-cyan-400/20 via-cyan-400/60 to-cyan-400/20 bg-[length:200%_100%] motion-safe:animate-pulse" />
        ) : (
          <div
            className="h-full bg-cyan-400 transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        )}
      </div>
    );
  }
);
Progress.displayName = "Progress";
