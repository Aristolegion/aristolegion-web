const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Frozen in the ES-010 Final Specification Freeze: OpenAI Embeddings
// API, text-embedding-3-small, 1536 dimensions (the model's native
// default — not truncated). Changing any of these three values is an
// ES-010 specification change, not a code change.
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

type EmbedResult =
  | { ok: true; embedding: number[] }
  | { ok: false; status: number; message: string };

/**
 * Server-only OpenAI Embeddings call, using plain fetch — matches
 * lib/supabase.ts's established pattern (no SDK) and its result shape.
 * Must only ever be called from server-only code (the reconciliation
 * Route Handler); OPENAI_API_KEY has no NEXT_PUBLIC_ prefix so Next.js
 * never inlines it into client bundles.
 */
export async function generateEmbedding(text: string): Promise<EmbedResult> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return { ok: false, status: response.status, message };
  }

  const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
  return { ok: true, embedding: data.data[0].embedding };
}
