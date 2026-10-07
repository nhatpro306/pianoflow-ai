"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  Home,
  PlayCircle,
  Sparkles,
  Music,
  CreditCard,
} from "lucide-react";
import { useUserProgress } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ isOpen, onClose }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { data: progressData } = useUserProgress();

  const streakDays =
    progressData?.current_streak_days && progressData.current_streak_days > 0
      ? progressData.current_streak_days
      : 1;

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

  const isRouteActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    if (href === "/songs") {
      return (
        pathname === "/songs" ||
        pathname.startsWith("/songs/") ||
        pathname === "/demo" ||
        pathname.startsWith("/demo/")
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/songs", label: "Song Library", icon: PlayCircle },
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
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        aria-hidden="true"
      />

      {/* Slide-over sheet panel */}
      <div
        ref={drawerRef}
        className="relative z-10 flex h-full w-4/5 max-w-sm flex-col bg-[#09090b] border-l border-white/10 p-6 shadow-2xl transition-transform duration-300 ease-out animate-in slide-in-from-right"
      >
        {/* Header with Title & Close button */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              🎹
            </span>
            <span className="text-lg font-bold text-zinc-100">
              PianoFlow <span className="text-cyan-400">AI</span>
            </span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:outline-none transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Streak Pill inside mobile drawer */}
        <div className="mt-4">
          <Link
            href="/projects"
            onClick={onClose}
            data-testid="mobile-streak-pill"
            className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-xs font-semibold text-amber-300 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)] transition-all"
          >
            <span className="flex items-center gap-1.5">
              <span>🔥</span>
              <span>{streakDays}d Practice Streak</span>
            </span>
            <span className="text-[11px] text-amber-400/80 font-normal">Active →</span>
          </Link>
        </div>

        {/* Navigation list */}
        <nav aria-label="Mobile primary navigation" className="mt-4 flex flex-col gap-1.5">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = isRouteActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                data-active={isActive ? "true" : "false"}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:outline-none ${
                  isActive
                    ? "text-white bg-white/10 font-semibold border border-white/10 shadow-inner"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-cyan-400" : "text-zinc-400"
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA Button */}
        <div className="mt-6">
          <Link href="/create" onClick={onClose} className="block w-full">
            <Button variant="gradient" size="md" className="w-full">
              {user ? "+ New Project" : "Start Free 🚀"}
            </Button>
          </Link>
        </div>

        {/* Footer info & system version */}
        <div className="mt-auto border-t border-white/5 pt-4">
          <p className="text-xs text-zinc-500">PianoFlow AI Mobile PWA &amp; Web MIDI</p>
          <p className="text-[11px] text-zinc-600">60 FPS WebGL Engine • Phase M Overhaul</p>
        </div>
      </div>
    </div>
  );
}
