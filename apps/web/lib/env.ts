/**
 * Values pasted into hosting dashboards (Vercel, etc.) sometimes carry a
 * leading BOM (U+FEFF) or stray whitespace. That silently corrupts URLs and
 * keys — e.g. a BOM-prefixed "https://..." is not a valid absolute URL, so
 * `fetch` resolves it relative to the current origin and 404s, and Supabase
 * client creation fails with "URL and API key are required". Strip it.
 */
export function cleanEnv(value: string | undefined): string {
  return (value ?? "").replace(/^\uFEFF/, "").trim();
}
