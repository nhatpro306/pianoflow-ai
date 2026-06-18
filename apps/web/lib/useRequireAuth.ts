"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth";

// NEXT_PUBLIC_* vars are inlined into both the server and client bundles, so
// this evaluates identically on both. Do NOT gate on `typeof window` — that
// makes the server think auth is disabled (rendering the page) while the client
// thinks it's enabled (rendering null), causing a hydration mismatch that leaves
// a duplicate, orphaned copy of the page in the DOM.
const isAuthEnabled =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthEnabled && !loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  return { user, loading, authenticated: !isAuthEnabled || (!loading && !!user) };
}
