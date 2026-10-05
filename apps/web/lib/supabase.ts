import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { cleanEnv } from "./env";

export function createClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    const mock = (window as unknown as { __MOCK_SUPABASE_CLIENT__?: SupabaseClient }).__MOCK_SUPABASE_CLIENT__;
    if (mock) return mock;
  }
  return createBrowserClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
