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
  children: ReactNode;
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  ({ open, onClose, title, children, className = "", ...props }, ref) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      if (!open) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        } else if (e.key === "Tab") {
          if (!dialogRef.current) return;
          const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm transition-opacity motion-reduce:transition-none"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Dialog Content */}
        <div
          ref={(node) => {
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
            dialogRef.current = node;
          }}
          role="dialog"
          aria-modal="true"
          className={`relative z-50 w-full max-w-md scale-100 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-6 opacity-100 shadow-xl transition-all duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-reduce:transition-none ${className}`}
          {...props}
        >
          {title && (
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">{title}</h2>
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
        className={`mt-6 flex justify-end gap-3 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
DialogActions.displayName = "DialogActions";
