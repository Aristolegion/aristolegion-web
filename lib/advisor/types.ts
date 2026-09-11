import type { NodeType } from "@/lib/embeddings/canonicalize";
import type { RelationshipContextEntry, Source } from "@/lib/retrieval/types";

// ES-012: Advisor. Conceptual contracts from
// docs/architecture/ES-012-evidence-sufficiency.md (the ratified policy)
// and docs/architecture/ES-012-implementation-specification.md (§L),
// translated directly into TypeScript. Shapes only — no logic here.
//
// Deliberately kept in four visually separate groups, per §L: raw
// retrieval signals, eligibility status, semantic judgments, and
// sufficiency decisions must never be blended into one undifferentiated
// object. `distance` and `relationshipContext` are carried on `Evidence`
// for observability only — neither is ever read by eligibility,
// sufficiency, or grounded-context construction as a gate or threshold.

// ---------------------------------------------------------------------------
// Eligibility (Tier 1) — deterministic, per candidate.
// ---------------------------------------------------------------------------

export interface EligibilityResult {
  /** E1. Never "unknown" or "not_applicable" — ES-011 always resolves this to one of two values. */
  attributionIntegrity: "pass" | "fail";
  /** E2. "not_applicable" for node types with no status column (concept, topic, principle). */
  publicationState: "pass" | "fail" | "not_applicable";
  /** E3. "unknown" only for an expansion-query call failure, distinct from confirmed-absent content. */
  canonicalContentAvailability: "pass" | "fail" | "unknown";
  overall: "eligible" | "ineligible";
}

// ---------------------------------------------------------------------------
// Semantic judgments — all categorical, never a score or probability.
// ---------------------------------------------------------------------------

/** Gate A, per candidate. */
export type RelevanceJudgment = "relevant" | "not_relevant" | "unknown";

/** The combined Gate B / Source Coherence per-pair judgment (§I). */
export type PairClassification = "contradictory" | "coherent" | "incoherent_not_contradictory" | "unknown";

export interface Facet {
  id: string;
  description: string;
}

export type FacetCheckResult = "pass" | "fail" | "unknown";

export interface CoverageCheck {
  facetId: string;
  facetDescription: string;
  result: FacetCheckResult;
}

export interface ConflictCheck {
  /** Stable, order-independent key for the pair, e.g. "essay:abc|framework:def" with the two sides sorted. */
  pairKey: string;
  classification: PairClassification;
  /** True when `classification` is a fail-closed assumption (mechanism could not determine), not a confirmed judgment. */
  mechanismUncertain: boolean;
}

export type CoherenceResult = "pass" | "fail";

export interface CoherenceCheck {
  pairKey: string;
  result: CoherenceResult;
}

// ---------------------------------------------------------------------------
// Evidence — one per deduplicated retrieval candidate.
// ---------------------------------------------------------------------------

export interface Evidence {
  // Raw retrieval signals (from ES-011, unmodified; observational only).
  nodeType: NodeType;
  nodeId: string;
  rank: number;
  distance: number;
  relationshipContext: RelationshipContextEntry[];
  source: Source | null;

  // Canonical content (from expansion, outside ES-011's boundary).
  /** Present only when canonicalContentAvailability resolved "pass". */
  canonicalContent: string | null;
  /** Raw status column value, where the node type has one (essay/publication/framework/manifesto); null otherwise. */
  publicationStatus: string | null;

  eligibility: EligibilityResult;

  /** Present only for candidates that reached Gate A (i.e., were eligible). */
  relevance: RelevanceJudgment | null;

  finalStatus: "eligible_and_relevant" | "eligible_not_relevant" | "ineligible";
}

// ---------------------------------------------------------------------------
// Sufficiency (Tier 2) — evaluated once, over the whole evidence set.
// ---------------------------------------------------------------------------

export interface SufficiencyResult {
  gateA: "pass" | "fail";
  gateB: "pass" | "fail";
  coverageChecks: CoverageCheck[];
  coherenceChecks: CoherenceCheck[];
  /** N — total applicable atomic sub-checks (unknowns excluded). */
  applicableTotal: number;
  /** ceil(0.80 * N). */
  requiredPasses: number;
  actualPasses: number;
  outcome: "sufficient" | "insufficient";
  /** Structural diagnostic only — which check(s) failed. Never raw question or source content. */
  rationale: string;
}

export type EvidenceSetOutcome =
  | "sufficient"
  | "insufficient_no_relevant_evidence"
  | "insufficient_conflict"
  | "insufficient_coverage_or_coherence"
  | "internal_fault";

export interface EvidenceSet {
  allCandidates: Evidence[];
  relevantSubset: Evidence[];
  facetIdentificationStatus: "ok" | "failed";
  /** Meaningful only when facetIdentificationStatus is "ok". */
  facets: Facet[];
  /** Null whenever Gate A or Gate B stopped the pipeline before the percentage tier ran. */
  sufficiency: SufficiencyResult | null;
  outcome: EvidenceSetOutcome;
}

// ---------------------------------------------------------------------------
// Grounded context and generation — strictly downstream of a sufficient
// EvidenceSet. Generation never receives anything above this line.
// ---------------------------------------------------------------------------

export interface GroundedSource {
  nodeType: NodeType;
  /** title, or text for `principle` — mirrors ES-011's own discriminated Source union. */
  identity: string;
  slug: string;
  content: string;
}

export interface GroundedContext {
  question: string;
  sources: GroundedSource[];
}

/**
 * `citedSlugs` is the model's own, UNTRUSTED claim about which sources it
 * used. It is never authoritative on its own — see groundedContext.ts's
 * cross-check against EvidenceSet.relevantSubset before anything derived
 * from it reaches a public response.
 */
export type GenerationResult =
  | {
      ok: true;
      answer: string;
      citedSlugs: string[];
      usage?: { promptTokens?: number; completionTokens?: number };
    }
  | { ok: false; status: number; message: string };
