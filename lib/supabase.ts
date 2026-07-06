const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type SupabaseInsertResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

type SupabaseInsertReturningResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

type SupabaseSelectResult<T> =
  | { ok: true; data: T[] }
  | { ok: false; status: number; message: string };

type SupabaseUpdateResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

type SupabaseUpdateReturningResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

type SupabaseStorageResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

type SupabaseSignedUrlResult =
  | { ok: true; url: string }
  | { ok: false; status: number; message: string };

/**
 * Server-only Supabase helpers, using plain fetch against Supabase's
 * PostgREST API — avoids pulling in the @supabase/supabase-js SDK.
 *
 * Uses the service role key, which bypasses Row Level Security, so this
 * module must only ever be imported from Route Handlers, Server Components,
 * or other server-only code — never from a "use client" component. Because
 * SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix, Next.js never
 * inlines it into client bundles, but callers must also take care never to
 * echo it back in a response body.
 */
function requireConfig(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return { url: SUPABASE_URL, key: SUPABASE_SERVICE_ROLE_KEY };
}

export async function supabaseInsert(
  table: string,
  row: Record<string, unknown>
): Promise<SupabaseInsertResult> {
  const { url, key } = requireConfig();

  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
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

export async function supabaseSelect<T = Record<string, unknown>>(
  table: string,
  options: { order?: string; filter?: Record<string, string> } = {}
): Promise<SupabaseSelectResult<T>> {
  const { url, key } = requireConfig();

  const params = new URLSearchParams({ select: "*" });
  if (options.order) {
    params.set("order", options.order);
  }
  if (options.filter) {
    for (const [column, condition] of Object.entries(options.filter)) {
      params.set(column, condition);
    }
  }

  const response = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return { ok: false, status: response.status, message };
  }

  const data = (await response.json()) as T[];
  return { ok: true, data };
}

export async function supabaseUpdate(
  table: string,
  match: Record<string, string>,
  patch: Record<string, unknown>
): Promise<SupabaseUpdateResult> {
  const { url, key } = requireConfig();

  const params = new URLSearchParams();
  for (const [column, value] of Object.entries(match)) {
    params.set(column, `eq.${value}`);
  }

  const response = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return { ok: false, status: response.status, message };
  }

  return { ok: true };
}

export async function supabaseInsertReturning<T = Record<string, unknown>>(
  table: string,
  row: Record<string, unknown>
): Promise<SupabaseInsertReturningResult<T>> {
  const { url, key } = requireConfig();

  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return { ok: false, status: response.status, message };
  }

  const data = (await response.json()) as T[];
  return { ok: true, data: data[0] };
}

export async function supabaseUpdateReturning<T = Record<string, unknown>>(
  table: string,
  match: Record<string, string>,
  patch: Record<string, unknown>
): Promise<SupabaseUpdateReturningResult<T>> {
  const { url, key } = requireConfig();

  const params = new URLSearchParams();
  for (const [column, value] of Object.entries(match)) {
    params.set(column, `eq.${value}`);
  }

  const response = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return { ok: false, status: response.status, message };
  }

  const data = (await response.json()) as T[];
  return { ok: true, data: data[0] };
}

/**
 * Storage helpers for the private "publications" bucket. Every read goes
 * through a short-lived signed URL rather than a public bucket URL, so a
 * draft PDF is never reachable even if its storage path leaked — the only
 * way to obtain a signed URL is server-side, gated by the Sanctum session
 * check in the API routes that call these functions.
 */
export async function supabaseUploadFile(
  bucket: string,
  path: string,
  file: File,
  contentType: string
): Promise<SupabaseStorageResult> {
  const { url, key } = requireConfig();

  const arrayBuffer = await file.arrayBuffer();

  const response = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: arrayBuffer,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return { ok: false, status: response.status, message };
  }

  return { ok: true };
}

export async function supabaseCreateSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number
): Promise<SupabaseSignedUrlResult> {
  const { url, key } = requireConfig();

  const response = await fetch(`${url}/storage/v1/object/sign/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return { ok: false, status: response.status, message };
  }

  const data = (await response.json()) as { signedURL: string };
  return { ok: true, url: `${url}/storage/v1${data.signedURL}` };
}

export async function supabaseMoveFile(
  bucket: string,
  fromPath: string,
  toPath: string
): Promise<SupabaseStorageResult> {
  const { url, key } = requireConfig();

  const response = await fetch(`${url}/storage/v1/object/move`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ bucketId: bucket, sourceKey: fromPath, destinationKey: toPath }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return { ok: false, status: response.status, message };
  }

  return { ok: true };
}
