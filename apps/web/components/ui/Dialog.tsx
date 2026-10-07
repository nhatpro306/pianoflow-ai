"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type HTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

export interface DialogProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  title?: string;
  showCloseButton?: boolean;
  children: ReactNode;
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  (
    {
      open,
      onClose,
      title,
      showCloseButton = true,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      if (!open) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        } else if (e.key === "Tab") {
          if (!dialogRef.current) return;
          const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement?.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement?.focus();
              e.preventDefault();
            }
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, onClose]);

    // Restore focus on close, focus first focusable on open
    const prevFocusRef = useRef<HTMLElement | null>(null);
    useEffect(() => {
      if (open) {
        prevFocusRef.current = document.activeElement as HTMLElement | null;
        if (dialogRef.current) {
          const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length > 0) {
            focusableElements[0]?.focus();
          }
        }
      } else if (prevFocusRef.current) {
        prevFocusRef.current.focus();
        prevFocusRef.current = null;
      }
    }, [open]);

    if (!open || !mounted) return null;

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Obsidian modal backdrop blur */}
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity motion-reduce:transition-none"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Elevated card shell */}
        <div
          ref={(node) => {
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
            dialogRef.current = node;
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "dialog-title" : undefined}
          className={`relative z-50 w-full max-w-lg scale-100 overflow-hidden rounded-2xl border border-white/10 bg-[#121215] p-6 text-zinc-100 shadow-2xl transition-all duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-reduce:transition-none ${className}`}
          {...props}
        >
          {title ? (
            <div className="mb-4 flex items-center justify-between gap-4 border-b border-white/5 pb-3">
              <h2 id="dialog-title" className="text-lg font-semibold tracking-tight text-zinc-100">
                {title}
              </h2>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
                  aria-label="Close dialog"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            showCloseButton && (
              <div className="absolute top-4 right-4 z-10">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
                  aria-label="Close dialog"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          )}
          <div className="text-sm text-zinc-300">{children}</div>
        </div>
      </div>,
      document.body
    );
  }
);
Dialog.displayName = "Dialog";

export interface DialogActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const DialogActions = forwardRef<HTMLDivElement, DialogActionsProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`mt-6 flex justify-end gap-3 border-t border-white/5 pt-4 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
DialogActions.displayName = "DialogActions";

export const DialogFooter = DialogActions;
