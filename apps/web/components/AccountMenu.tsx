"use client";

import Link from "next/link";

import { useAuth } from "@/components/AuthProvider";

export function AccountMenu() {
  const { enabled, session, email, signOut } = useAuth();

  if (!enabled) return null; // local dev — anonymous fixed user
  if (session === undefined) return null; // initial session still loading

  if (!session) {
    return (
      <Link href="/login" className="text-sm text-cyan-400 hover:underline">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-zinc-400 sm:inline">{email}</span>
      <button onClick={() => signOut()} className="text-zinc-400 hover:text-zinc-100">
        Sign out
      </button>
    </div>
  );
}
