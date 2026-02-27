// utils/safeUri.ts
export function safeHttpUri(uri: unknown): string | null {
  if (typeof uri !== "string") return null;

  const s = uri.trim();
  if (!s) return null;

  // Allow only http(s) remote urls (Supabase signed URLs are https)
  if (s.startsWith("https://") || s.startsWith("http://")) return s;

  return null;
}