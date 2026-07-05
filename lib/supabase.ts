const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type SupabaseInsertResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

/**
 * Server-only Supabase insert helper, using plain fetch against Supabase's
 * PostgREST API — avoids pulling in the @supabase/supabase-js SDK for a
 * single insert-only need.
 *
 * Uses the service role key, which bypasses Row Level Security, so this
 * module must only ever be imported from Route Handlers or other
 * server-only code — never from a "use client" component. Because
 * SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix, Next.js never
 * inlines it into client bundles, but callers must also take care never to
 * echo it back in a response body.
 */
export async function supabaseInsert(
  table: string,
  row: Record<string, unknown>
): Promise<SupabaseInsertResult> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return { ok: false, status: response.status, message };
  }

  return { ok: true };
}
