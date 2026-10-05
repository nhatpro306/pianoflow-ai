"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  X, 
  Sparkles, 
  Music, 
  CreditCard 
} from "lucide-react";

export interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ isOpen, onClose }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    // Prevent background scrolling while drawer is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navLinks = [
    { href: "/create", label: "Create / Transcribe", icon: Sparkles },
    { href: "/projects", label: "My Projects", icon: Music },
    { href: "/pricing", label: "Pro Membership", icon: CreditCard },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Menu"
      className="fixed inset-0 z-50 flex justify-end md:hidden"
    >
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        aria-hidden="true"
      />

      {/* Slide-over sheet panel */}
      <div
        ref={drawerRef}
        className="relative z-10 flex h-full w-4/5 max-w-sm flex-col bg-zinc-950 border-l border-zinc-800 p-6 shadow-2xl transition-transform duration-300 ease-out animate-in slide-in-from-right"
      >
        {/* Header with Title & Close button */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">🎹</span>
            <span className="text-lg font-bold text-zinc-100">
              PianoFlow <span className="text-cyan-400">AI</span>
            </span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav aria-label="Mobile primary navigation" className="mt-6 flex flex-col gap-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-cyan-400" : "text-zinc-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer info & system version */}
        <div className="mt-auto border-t border-zinc-900 pt-4">
          <p className="text-xs text-zinc-500">PianoFlow AI Mobile PWA & Web MIDI</p>
          <p className="text-[11px] text-zinc-600">Phase C Mobile Edition • 2026</p>
        </div>
      </div>
    </div>
  );
}
