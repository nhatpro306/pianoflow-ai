"use client";

import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, Music, CreditCard, LogOut } from "lucide-react";

export function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (loading) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition-colors"
      >
        Sign in
      </Link>
    );
  }

  const initials = (user.email ?? "?")[0].toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="User account menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-xs font-bold text-white shadow-md ring-1 ring-white/20 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-white/10 bg-[#121215]/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="border-b border-white/5 px-3 py-2.5">
            <p className="text-[11px] font-medium text-zinc-400">Signed in as</p>
            <p className="truncate text-xs font-semibold text-zinc-100">{user.email}</p>
            <div className="mt-2 flex items-center justify-between">
              <Badge variant="accent" size="sm">
                Pro Member
              </Badge>
              <span className="text-[10px] text-zinc-400">Verified</span>
            </div>
          </div>

          <div className="py-1">
            <Link
              href="/projects"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Music className="h-3.5 w-3.5 text-cyan-400" />
              <span>My Projects</span>
            </Link>

            <Link
              href="/create"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <span>Ingestion Studio</span>
            </Link>

            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <CreditCard className="h-3.5 w-3.5 text-amber-400" />
              <span>Membership &amp; Billing</span>
            </Link>
          </div>

          <div className="border-t border-white/5 pt-1">
            <button
              type="button"
              onClick={async () => {
                await signOut();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
