import { HTMLAttributes, forwardRef } from "react";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-xl border border-zinc-800 bg-zinc-900/50 ${className}`}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";
