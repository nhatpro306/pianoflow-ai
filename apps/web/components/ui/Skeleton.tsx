import { HTMLAttributes, forwardRef } from "react";

export const Skeleton = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`animate-pulse rounded-md bg-zinc-800 ${className}`}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";
