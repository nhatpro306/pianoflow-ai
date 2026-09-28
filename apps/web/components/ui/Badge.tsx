import { HTMLAttributes, forwardRef } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-zinc-800 text-zinc-300",
      success: "bg-emerald-500/10 text-emerald-400",
      warning: "bg-amber-500/10 text-amber-400",
      danger: "bg-red-500/10 text-red-400",
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
