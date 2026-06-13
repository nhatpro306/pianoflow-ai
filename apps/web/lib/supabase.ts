import { createBrowserClient } from "@supabase/ssr";

// Values pasted into hosting dashboards sometimes carry a leading BOM (U+FEFF)
// or stray whitespace. That silently corrupts the Supabase URL/key (e.g.
// a BOM-prefixed "https://..." is not a valid URL) and makes client creation
// fail with a confusing "URL and API key are required" error. Strip it first.
function clean(value: string | undefined): string {
  return (value ?? "").replace(/^\uFEFF/, "").trim();
}

export function createClient() {
  return createBrowserClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
