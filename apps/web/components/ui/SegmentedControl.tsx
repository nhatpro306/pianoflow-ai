"use client";

import { forwardRef, useRef, type KeyboardEvent, type ReactNode } from "react";

export interface SegmentedControlOption {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
  variant?: "default" | "gradient";
}

export const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(
  (
    {
      options,
      value,
      onChange,
      size = "md",
      className = "",
      ariaLabel = "Mode Selection",
      variant = "default",
    },
    ref
  ) => {
    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const enabledIndices = options
        .map((opt, i) => (!opt.disabled ? i : -1))
        .filter((i) => i !== -1);

      if (enabledIndices.length === 0) return;

      const currentEnabledPos = enabledIndices.indexOf(index);
      let targetIndex: number | null = null;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const nextPos = (currentEnabledPos + 1) % enabledIndices.length;
        targetIndex = enabledIndices[nextPos];
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prevPos =
          (currentEnabledPos - 1 + enabledIndices.length) % enabledIndices.length;
        targetIndex = enabledIndices[prevPos];
      } else if (e.key === "Home") {
        e.preventDefault();
        targetIndex = enabledIndices[0];
      } else if (e.key === "End") {
        e.preventDefault();
        targetIndex = enabledIndices[enabledIndices.length - 1];
      }

      if (targetIndex !== null && targetIndex !== undefined) {
        const targetOption = options[targetIndex];
        if (targetOption && !targetOption.disabled) {
          onChange(targetOption.id);
          buttonRefs.current[targetIndex]?.focus();
        }
      }
    };

    const sizeStyles = {
      sm: "px-2.5 py-1 text-xs gap-1.5",
      md: "px-3.5 py-1.5 text-sm gap-2",
    };

    return (
      <div
        ref={ref}
        role="tablist"
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-1 rounded-xl border border-white/10 bg-zinc-900/90 p-1 select-none backdrop-blur-md ${className}`}
      >
        {options.map((option, idx) => {
          const isSelected = option.id === value;
          const isDisabled = !!option.disabled;

          let stateStyles =
            "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-medium border border-transparent";
          if (isSelected) {
            stateStyles =
              variant === "gradient"
                ? "bg-gradient-to-r from-violet-600/90 to-cyan-600/90 text-white shadow-sm font-semibold border border-white/15"
                : "bg-zinc-800 text-white shadow-sm font-semibold border border-white/10";
          }
          if (isDisabled) {
            stateStyles = "opacity-40 cursor-not-allowed pointer-events-none";
          }

          return (
            <button
              key={option.id}
              ref={(el) => {
                buttonRefs.current[idx] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) onChange(option.id);
              }}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`relative inline-flex items-center justify-center rounded-lg transition-all duration-150 btn-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 ${sizeStyles[size]} ${stateStyles}`}
            >
              {option.icon && (
                <span className="shrink-0 inline-flex items-center">
                  {option.icon}
                </span>
              )}
              <span>{option.label}</span>
              {option.badge && (
                <span className="shrink-0 inline-flex items-center">
                  {option.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }
);

SegmentedControl.displayName = "SegmentedControl";
