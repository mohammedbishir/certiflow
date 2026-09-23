/**
 * Browser calls go through Next.js `/backend` rewrite (same origin),
 * so phones only need port 3000 — no direct access to API :3001.
 * Server-side code talks to the API directly.
 */
export function getApiBase() {
  if (typeof window !== "undefined") {
    return "/backend";
  }
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://127.0.0.1:3001"
  );
}
