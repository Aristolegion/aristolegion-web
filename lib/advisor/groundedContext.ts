import type { EvidenceSet, GroundedContext, GroundedSource } from "@/lib/advisor/types";

// ES-012 Implementation Specification §M — grounded context construction.
// Only Evidence in EvidenceSet.relevantSubset is ever used, and only once
// outcome === "sufficient". distance and relationshipContext are never
// included — both are observational-only throughout this contract, and
// exposing them to generation risks reintroducing exactly the "closer
// must mean more relevant" assumption Gate A exists to replace.

export const GROUNDED_CONTEXT_TOKEN_CEILING = 32_000; // CTO-ratified — a ceiling, not a target.

// YELLOW-3 fix, audited: chars/4 is a common *average* for English prose,
// not a proven upper bound — some real text tokenizes at a worse ratio.
// A smaller divisor produces a LARGER token estimate for the same text,
// which is the conservative direction: it causes this implementation to
// truncate sooner than a real tokenizer might strictly require, trading
// some unused headroom for a much stronger guarantee against ever
// exceeding the real 32,000-token ceiling. This is still a heuristic,
// not exact tokenizer-level enforcement — no tokenizer dependency is
// added, per the "no new dependency" constraint — and it is described as
// such, not claimed as precise.
const CONSERVATIVE_CHARS_PER_TOKEN = 3;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CONSERVATIVE_CHARS_PER_TOKEN);
}

// Reserved off the top of the 32,000-token ceiling for everything in the
// request that is NOT source content: the fixed system prompt, the
// user's question (up to the ratified 2,000-character maximum, §B —
// roughly 667 tokens at this same conservative ratio), the JSON-schema
// response-format overhead, and headroom for the model's own output.
// 2,000 tokens comfortably covers all of that with margin. This is an
// implementation parameter, not a ratified policy value — the ratified
// figure is the 32,000 ceiling itself; how much of it this
// implementation reserves for overhead versus source content is ours to
// choose, and is documented here rather than left implicit.
const RESERVED_OVERHEAD_TOKENS = 2_000;

// The minimum token budget a source must be guaranteed in order to be
// worth including at all — below this, truncated content stops being
// useful for grounding. This floor is now enforced WITHOUT ever letting
// the aggregate exceed the ceiling: if more relevant sources exist than
// the available budget can give this minimum to, the worst-ranked
// (highest rank number, least relevant) excess sources are dropped from
// the context entirely — never silently truncated into uselessness, and
// never allowed to push the total over budget via a floor that ignores
// source count. At the corpus's current size (~30 total nodes), this
// drop path does not trigger — 30 sources at 200 tokens each is 6,000
// tokens, well within budget — but the guarantee holds regardless of how
// large the relevant subset ever becomes.
const MIN_TOKENS_PER_SOURCE = 200;

// Truncates at the last complete sentence boundary at or before the
// character budget implied by `maxTokens` — never mid-sentence. This is
// a practical, algorithmic approximation of the ratified requirement to
// never change a qualification or reverse meaning; it cannot fully
// guarantee that outcome (no purely mechanical rule can), but keeping
// whole sentences intact is the concrete mechanism this implementation
// uses toward it.
function truncateAtSentenceBoundary(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CONSERVATIVE_CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;

  const truncated = text.slice(0, maxChars);
  const lastBoundary = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf(".\n"),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? ")
  );

  if (lastBoundary > 0) {
    return truncated.slice(0, lastBoundary + 1);
  }

  // No sentence boundary found within budget (a single very long
  // sentence) — fall back to a paragraph boundary, then finally to the
  // raw character cut as a last resort rather than returning nothing.
  const paragraphBoundary = truncated.lastIndexOf("\n\n");
  if (paragraphBoundary > 0) return truncated.slice(0, paragraphBoundary);
  return truncated;
}

/**
 * Builds the GroundedContext passed to generation. Enforces the ratified
 * 32,000-token ceiling — after reserving overhead for the rest of the
 * request — across the complete curated evidence context. Guaranteed,
 * by construction, never to exceed `sourceBudget` regardless of how many
 * relevant sources exist: excess sources beyond what the minimum-per-
 * source floor can afford are dropped, worst-ranked (least relevant)
 * first, never truncated into uselessness and never allowed to push the
 * total over budget. identity, slug, and nodeType are never touched by
 * truncation — only `content` is ever shortened.
 */
export function buildGroundedContext(
  question: string,
  evidenceSet: EvidenceSet,
  maxTokens: number = GROUNDED_CONTEXT_TOKEN_CEILING
): GroundedContext {
  const ordered = [...evidenceSet.relevantSubset].sort((a, b) => a.rank - b.rank);

  const allSources: GroundedSource[] = ordered.map((evidence) => {
    const identity = evidence.source
      ? evidence.source.nodeType === "principle"
        ? evidence.source.text
        : evidence.source.title
      : `${evidence.nodeType}:${evidence.nodeId}`;
    const slug = evidence.source?.slug ?? "";
    return { nodeType: evidence.nodeType, identity, slug, content: evidence.canonicalContent ?? "" };
  });

  const sourceBudget = Math.max(0, maxTokens - RESERVED_OVERHEAD_TOKENS);

  // How many sources the budget can afford at the minimum useful size —
  // this bounds inclusion BEFORE any truncation math runs, which is what
  // makes the aggregate guarantee hold regardless of source count. At
  // least one source is always included when any exist, even in the
  // degenerate case where the budget can't afford the full minimum for
  // even one — better to ground on one heavily truncated source than
  // none, and the aggregate is still bounded by sourceBudget either way.
  const maxIncludableSources = Math.max(0, Math.floor(sourceBudget / MIN_TOKENS_PER_SOURCE));
  const sourceCountToInclude =
    allSources.length === 0 ? 0 : Math.max(1, Math.min(allSources.length, maxIncludableSources));
  const includedSources = allSources.slice(0, sourceCountToInclude);

  const totalTokens = includedSources.reduce((sum, s) => sum + estimateTokens(s.content), 0);
  if (totalTokens <= sourceBudget) {
    return { question, sources: includedSources };
  }

  // Over budget even after any dropping above (the ordinary case at
  // today's corpus size): truncate each included source down to its
  // equal share. Recomputed AFTER dropping, so perSourceBudget is always
  // >= MIN_TOKENS_PER_SOURCE by construction — there is no floor here
  // that can push the total past sourceBudget, because the number of
  // sources sharing it was already bounded above.
  const perSourceBudget = Math.floor(sourceBudget / includedSources.length);
  const truncatedSources = includedSources.map((source) => {
    const tokens = estimateTokens(source.content);
    if (tokens <= perSourceBudget) return source;
    return { ...source, content: truncateAtSentenceBoundary(source.content, perSourceBudget) };
  });

  return { question, sources: truncatedSources };
}

/**
 * ES-012 Implementation Specification §N — the authoritative-source
 * invariant. `citedSlugs` is the generation model's own, untrusted claim
 * about which sources it used. Every entry is cross-checked against
 * EvidenceSet.relevantSubset; anything that doesn't match is discarded
 * silently, never fabricated into a source.
 *
 * RED-2 fix, audited: this used to fall back to the FULL relevantSubset
 * whenever citedSlugs was empty, malformed, or entirely unauthorized.
 * That never fabricated an identity (every entry shown was genuinely
 * authoritative), but it could visually overstate support — presenting
 * every relevant source as if it backed the answer when the model may
 * have drawn on none, or only one, of them. The fix: zero valid,
 * authorized citations is now treated as an invalid grounded response,
 * not a reason to expand the list. This reuses the existing generation-
 * failure outcome (§S) rather than inventing a new public outcome state
 * — the caller (app/api/advisor/route.ts) maps `ok: false` here onto the
 * same 502 path already used for a provider error.
 */
export type AuthoritativeSourcesResult =
  | { ok: true; sources: Array<{ nodeType: string; identity: string; slug: string }> }
  | { ok: false; reason: "no_valid_citations" };

export function buildAuthoritativeSources(
  evidenceSet: EvidenceSet,
  citedSlugs: string[]
): AuthoritativeSourcesResult {
  const authoritative = evidenceSet.relevantSubset.map((evidence) => {
    const identity = evidence.source
      ? evidence.source.nodeType === "principle"
        ? evidence.source.text
        : evidence.source.title
      : `${evidence.nodeType}:${evidence.nodeId}`;
    return { nodeType: evidence.nodeType as string, identity, slug: evidence.source?.slug ?? "" };
  });

  // Invalid/unauthorized entries are discarded, never used to expand the
  // set — this part of the invariant is unchanged.
  const validCitedSlugs = new Set(citedSlugs.filter((slug) => authoritative.some((a) => a.slug === slug)));

  if (validCitedSlugs.size === 0) {
    // Empty, entirely malformed within the array, or entirely
    // unauthorized citations all collapse to the same case: nothing the
    // model claimed to have used can be confirmed. Presenting sources
    // here — any sources — would misrepresent what actually grounded the
    // answer. Never fabricate; never fall back to implying full support.
    return { ok: false, reason: "no_valid_citations" };
  }

  return { ok: true, sources: authoritative.filter((a) => validCitedSlugs.has(a.slug)) };
}
