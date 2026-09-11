// ES-012: shared semantic-judgment call, used only by lib/advisor/relevance.ts,
// facets.ts, coverage.ts, and conflictAndCoherence.ts — CTO-ratified model
// OpenAI `gpt-5.6-luna` (docs/architecture/ES-012-implementation-specification.md
// §F). One shared module for the request/parse/error-handling boilerplate
// those four callers would otherwise each duplicate — the exact prompt text
// and JSON schema for each judgment task live in their own module, not here.
//
// Matches lib/embeddings/provider.ts's established convention: raw fetch,
// no SDK, a discriminated {ok, ...} result. No tool capability (web search,
// file search, browsing, MCP, code execution) is ever included in the
// request — Luna's own documentation lists these as available only when a
// caller explicitly enables them, so omitting them from `tools` entirely is
// sufficient to satisfy that ratified restriction; there is nothing to
// "turn off" beyond not asking for it.

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LUNA_MODEL = "gpt-5.6-luna";

export type JudgmentResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

export interface JudgmentRequest {
  systemPrompt: string;
  userPrompt: string;
  /** A short, unique name for this call shape — required by OpenAI's json_schema response format. */
  schemaName: string;
  /** A JSON Schema object describing the exact structured output expected. */
  jsonSchema: Record<string, unknown>;
}

/**
 * Calls gpt-5.6-luna with Structured Outputs and returns the parsed,
 * schema-conforming result — or a typed failure. The caller must still
 * treat `data` as untrusted with respect to anything beyond its shape
 * (e.g. a well-formed but semantically wrong judgment); this function only
 * guarantees the response matched the requested JSON Schema.
 */
export async function callJudgmentModel<T>(request: JudgmentRequest): Promise<JudgmentResult<T>> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: LUNA_MODEL,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: request.schemaName,
            schema: request.jsonSchema,
            strict: true,
          },
        },
      }),
      cache: "no-store",
    });
  } catch (error) {
    // Network-level failure (e.g. timeout, DNS) — never silently treated
    // as a semantic judgment. Callers map this to their own "unknown"
    // per-item result, which in turn contributes to §S's internal-fault
    // tracking rather than an honest "not relevant"/"no facets" outcome.
    const message = error instanceof Error ? error.message : "Unknown network error.";
    return { ok: false, status: 0, message };
  }

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return { ok: false, status: response.status, message };
  }

  let body: {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  try {
    body = await response.json();
  } catch {
    return { ok: false, status: response.status, message: "Response body was not valid JSON." };
  }

  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    return { ok: false, status: response.status, message: "Response contained no message content." };
  }

  try {
    const data = JSON.parse(content) as T;
    return { ok: true, data };
  } catch {
    // Structured Outputs is expected to guarantee schema-conforming JSON,
    // but the response is still untrusted output — malformed JSON here is
    // a mechanism failure, not a judgment, and must be handled as such by
    // every caller (fail-closed, never silently treated as a semantic
    // answer).
    return { ok: false, status: response.status, message: "Response content was not valid JSON." };
  }
}
