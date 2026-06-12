"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth";

const isAuthEnabled =
  typeof window !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
