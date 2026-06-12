"use client";

import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { useState } from "react";

export function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
      >
        Sign in
      </Link>
    );
  }

  const initials = (user.email ?? "?")[0].toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-700 text-sm font-medium"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
          <div className="border-b border-zinc-700 px-4 py-2 text-xs text-zinc-400">
            {user.email}
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              setOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-800"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
