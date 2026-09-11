import type { NodeType } from "@/lib/embeddings/canonicalize";
import type { RetrievalCandidate } from "@/lib/retrieval/types";
import { deduplicateCandidates } from "@/lib/advisor/dedup";
import { expandCanonicalSources, hasEligibilityContent, type ExpansionEntry } from "@/lib/advisor/sourceExpansion";
import type { Evidence } from "@/lib/advisor/types";

// ES-012 Implementation Specification §D — three criteria, evaluated in
// order because each is progressively more expensive to check: E1 uses
// data ES-011 already returns; E2/E3 require the expansion step in §E.

// Per-type published value, verified directly against each table's own
// check constraint (supabase/migrations 0003, 0006, 0007). Publication
// policy is CTO-ratified: public Advisor v1 uses published content only
// (docs/architecture/ES-012-evidence-sufficiency.md §N).
const PUBLISHED_VALUE_BY_TYPE: Partial<Record<NodeType, string>> = {
  essay: "published",
  publication: "published",
  framework: "Published", // capitalized — distinct from the other three types' lowercase convention
  manifesto: "published",
  // concept, topic, principle intentionally absent: no status column exists for these types.
};

function candidateKey(nodeType: string, nodeId: string): string {
  return `${nodeType}:${nodeId}`;
}

// E1 — deterministic, on retrieval data alone.
function checkAttributionIntegrity(candidate: RetrievalCandidate): "pass" | "fail" {
  return candidate.sourceStatus === "ok" && candidate.source !== null ? "pass" : "fail";
}

// E2 — deterministic, on expansion output. "not_applicable" for node
// types with no status column; this is a pass for eligibility purposes,
// per the ratified specification.
function checkPublicationState(
  nodeType: NodeType,
  entry: ExpansionEntry | undefined
): "pass" | "fail" | "not_applicable" {
  const publishedValue = PUBLISHED_VALUE_BY_TYPE[nodeType];
  if (publishedValue === undefined) return "not_applicable";
  if (!entry || entry.lookupFailed) return "fail"; // fail-closed, consistent with the conservative default throughout
  if (entry.publicationStatus === null) return "fail";
  return entry.publicationStatus === publishedValue ? "pass" : "fail";
}

// E3 — for six node types, from expansion output; for `principle`,
// directly from ES-011's own Source object, since a principle's `text`
// is already present there and needs no expansion query at all.
function checkCanonicalContentAvailability(
  candidate: RetrievalCandidate,
  entry: ExpansionEntry | undefined
): "pass" | "fail" | "unknown" {
  if (candidate.nodeType === "principle") {
    const text = candidate.source?.nodeType === "principle" ? candidate.source.text : null;
    return text && text.trim().length > 0 ? "pass" : "fail";
  }
  if (!entry) return "fail";
  if (entry.lookupFailed) return "unknown"; // infrastructure failure, distinct from confirmed-absent content — see §S
  return hasEligibilityContent(entry.eligibilityContentField) ? "pass" : "fail";
}

/**
 * Deduplicates, then evaluates E1 on every candidate, then expands only
 * E1-survivors (§D/§A's cost-efficient ordering), then evaluates E2/E3 and
 * assembles the final Evidence[] array. Relevance (Gate A) is not run
 * here — see lib/advisor/relevance.ts — so every returned Evidence has
 * `relevance: null` and a `finalStatus` of either "ineligible" or
 * "eligible_not_relevant" (the latter reset to "eligible_and_relevant"
 * once Gate A actually runs).
 */
export async function evaluateEligibility(candidates: RetrievalCandidate[]): Promise<{
  evidence: Evidence[];
  duplicatesRemoved: number;
  /** True iff every source-expansion query that was attempted failed outright — see sourceExpansion.ts. Distinct from any individual candidate's content being confirmed absent. */
  sourceExpansionTotalFailure: boolean;
}> {
  const { deduplicated, duplicatesRemoved } = deduplicateCandidates(candidates);

  const e1Passed = deduplicated.filter((candidate) => checkAttributionIntegrity(candidate) === "pass");
  const { entries: expansion, totalInfrastructureFailure } = await expandCanonicalSources(e1Passed);

  const evidence: Evidence[] = deduplicated.map((candidate) => {
    const attributionIntegrity = checkAttributionIntegrity(candidate);
    const key = candidateKey(candidate.nodeType, candidate.nodeId);
    const entry = expansion.get(key);

    const publicationState =
      attributionIntegrity === "pass" ? checkPublicationState(candidate.nodeType, entry) : "fail";
    const canonicalContentAvailability =
      attributionIntegrity === "pass" ? checkCanonicalContentAvailability(candidate, entry) : "fail";

    const overall: "eligible" | "ineligible" =
      attributionIntegrity === "pass" &&
      (publicationState === "pass" || publicationState === "not_applicable") &&
      canonicalContentAvailability === "pass"
        ? "eligible"
        : "ineligible";

    return {
      nodeType: candidate.nodeType,
      nodeId: candidate.nodeId,
      rank: candidate.rank,
      distance: candidate.similarity.distance,
      relationshipContext: candidate.relationshipContext,
      source: candidate.source,
      canonicalContent: overall === "eligible" ? entry?.canonicalContent ?? null : null,
      publicationStatus: entry?.publicationStatus ?? null,
      eligibility: { attributionIntegrity, publicationState, canonicalContentAvailability, overall },
      relevance: null,
      finalStatus: overall === "eligible" ? "eligible_not_relevant" : "ineligible",
    };
  });

  return { evidence, duplicatesRemoved, sourceExpansionTotalFailure: totalInfrastructureFailure };
}
