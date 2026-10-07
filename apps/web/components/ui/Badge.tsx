import { forwardRef, type HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "hand-rh"
    | "hand-lh"
    | "accent"
    | "streak";
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className = "",
      variant = "default",
      size = "sm",
      dot = false,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      default: "bg-zinc-800/60 text-zinc-300 border-white/5",
      success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      "hand-rh": "bg-violet-500/10 text-violet-300 border-violet-500/30",
      "hand-lh": "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
      accent:
        "bg-gradient-to-r from-violet-500/10 to-cyan-500/10 text-cyan-300 border-cyan-500/30",
      streak: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    };

    const dotColors = {
      default: "bg-zinc-400",
      success: "bg-emerald-400",
      warning: "bg-amber-400",
      danger: "bg-rose-400",
      "hand-rh": "bg-violet-400",
      "hand-lh": "bg-cyan-400",
      accent: "bg-cyan-400",
      streak: "bg-amber-400",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-xs font-medium",
      md: "px-2.5 py-1 text-xs font-semibold",
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full border transition-colors select-none ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {dot && (
          <span
            className={`mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full motion-safe:animate-pulse ${dotColors[variant]}`}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
