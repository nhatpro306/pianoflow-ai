"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

import { authEnabled, supabase } from "@/lib/supabase";

interface AuthState {
  /** False when auth is not configured (local dev) — app runs anonymously. */
  enabled: boolean;
  /** Undefined while the initial session is loading. */
  session: Session | null | undefined;
  email: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  enabled: false,
  session: null,
  email: null,
  signOut: async () => {},
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(
    authEnabled ? undefined : null,
  );

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        enabled: authEnabled,
        session,
        email: session?.user?.email ?? null,
        signOut: async () => {
          await supabase?.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
