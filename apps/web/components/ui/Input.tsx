import { forwardRef, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", hasError = false, ...props }, ref) => {
    const errorStyles = hasError
      ? "border-rose-500/60 focus:border-rose-500 focus-visible:ring-rose-500/50"
      : "border-white/10 focus:border-violet-500/70 focus-visible:ring-violet-500/50";

    return (
      <input
        ref={ref}
        className={`w-full rounded-lg border bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-all duration-150 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${errorStyles} ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
