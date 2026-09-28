import { HTMLAttributes, forwardRef } from "react";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number; // 0 to 100
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className = "", value = 0, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`h-2 w-full overflow-hidden rounded-full bg-zinc-800 ${className}`}
        {...props}
      >
        <div
          className="h-full bg-cyan-400 transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";
