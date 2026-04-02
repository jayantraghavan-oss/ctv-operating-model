/**
 * Lightweight tRPC batch-protocol fetch helpers.
 * Used by pages that need to call tRPC procedures without the full React Query client.
 * Mirrors the pattern used in persistRun.ts and LiveDataStatus.tsx.
 *
 * IMPORTANT: The server uses superjson transformer. For queries with no input,
 * we must send `{ "0": {} }` (empty object) NOT `{ "0": { json: null } }`.
 * Sending `json: null` causes a 400 error when the procedure has `.input(z.object(...).optional())`.
 */

/**
 * Call a tRPC query (GET) with optional input.
 */
export async function trpcQuery<T = any>(
  path: string,
  input?: Record<string, any>
): Promise<T> {
  // When input is provided, wrap it in the superjson batch format.
  // When no input, send an empty batch object — NOT json:null.
  const inputParam = input
    ? `&input=${encodeURIComponent(JSON.stringify({ "0": { json: input } }))}`
    : `&input=${encodeURIComponent(JSON.stringify({ "0": {} }))}`;
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
    body: JSON.stringify({ "0": input ? { json: input } : {} }),
  });
  if (!res.ok) throw new Error(`tRPC mutation ${path} failed: ${res.status}`);
  const body = await res.json();
  return body?.[0]?.result?.data?.json ?? body?.[0]?.result?.data ?? null;
}
