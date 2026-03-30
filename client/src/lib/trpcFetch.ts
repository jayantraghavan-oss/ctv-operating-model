/**
 * Lightweight tRPC batch-protocol fetch helpers.
 * Used by pages that need to call tRPC procedures without the full React Query client.
 * Mirrors the pattern used in persistRun.ts and LiveDataStatus.tsx.
 */

/**
 * Call a tRPC query (GET) with optional input.
 */
export async function trpcQuery<T = any>(
  path: string,
  input?: Record<string, any>
): Promise<T> {
  const inputParam = input
    ? `&input=${encodeURIComponent(JSON.stringify({ "0": { json: input } }))}`
    : `&input=${encodeURIComponent(JSON.stringify({ "0": { json: null } }))}`;
  const res = await fetch(`/api/trpc/${path}?batch=1${inputParam}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`tRPC query ${path} failed: ${res.status}`);
  const body = await res.json();
  return body?.[0]?.result?.data?.json ?? body?.[0]?.result?.data ?? null;
}

/**
 * Call a tRPC mutation (POST) with input.
 */
export async function trpcMutation<T = any>(
  path: string,
  input?: Record<string, any>
): Promise<T> {
  const res = await fetch(`/api/trpc/${path}?batch=1`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "0": { json: input ?? null } }),
  });
  if (!res.ok) throw new Error(`tRPC mutation ${path} failed: ${res.status}`);
  const body = await res.json();
  return body?.[0]?.result?.data?.json ?? body?.[0]?.result?.data ?? null;
}
