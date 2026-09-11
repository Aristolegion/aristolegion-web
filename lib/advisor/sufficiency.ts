import type { RetrievalCandidate } from "@/lib/retrieval/types";
import { evaluateEligibility } from "@/lib/advisor/eligibility";
import { judgeRelevance, type RelevanceOptions } from "@/lib/advisor/relevance";
import { identifyFacets } from "@/lib/advisor/facets";
import { evaluateCoverage } from "@/lib/advisor/coverage";
import { evaluateConflictAndCoherence } from "@/lib/advisor/conflictAndCoherence";
import type { EvidenceSet, SufficiencyResult } from "@/lib/advisor/types";

// ES-012 Implementation Specification §K — this section implements the
// ratified formula precisely; it does not revisit whether ceiling
// rounding or the decomposition-based approach is correct — both are
// already ratified.
//
// N = (facets with a determinate coverage result) + (source pairs, zero
// if fewer than two relevant sources). Required passes = ceil(0.80 * N).
// N = 0 is never a valid sufficiency evaluation — it is always routed to
// the internal-fault outcome, never treated as vacuous success.

export type SufficiencyOptions = RelevanceOptions;

export interface SufficiencyTelemetry {
  duplicatesRemoved: number;
  eligibleCount: number;
  ineligibleCount: number;
  prefilterSkippedCount: number;
  relevanceMechanismFailureCount: number;
  relevantSubsetCount: number;
  facetCount: number;
}

export interface EvidenceEvaluation {
  evidenceSet: EvidenceSet;
  telemetry: SufficiencyTelemetry;
}

function requiredPasses(n: number): number {
  return Math.ceil(0.8 * n);
}

/**
 * The full eligibility -> Gate A -> Gate B -> Coverage/Coherence -> 80%
 * pipeline, over already-retrieved candidates. Does not call retrieve()
 * itself — that is the caller's job (app/api/advisor/route.ts), since
 * retrieval failure is a distinct, upstream outcome this function never
 * needs to know about.
 */
export async function evaluateSufficiency(
  question: string,
  candidates: RetrievalCandidate[],
  options: SufficiencyOptions = {}
): Promise<EvidenceEvaluation> {
  // Eligibility and relevance depend on the candidate list; facet
  // identification depends only on the question text — run them
  // concurrently, per §A's latency-optimization note, rather than
  // sequentially.
  const [{ evidence: eligibleEvidence, duplicatesRemoved, sourceExpansionTotalFailure }, facetOutcome] =
    await Promise.all([evaluateEligibility(candidates), identifyFacets(question)]);

  const { evidence, prefilterSkippedCount, mechanismFailureCount } = await judgeRelevance(
    question,
    eligibleEvidence,
    options
  );

  const eligibleCount = evidence.filter((e) => e.eligibility.overall === "eligible").length;
  const ineligibleCount = evidence.length - eligibleCount;
  const relevantSubset = evidence.filter((e) => e.finalStatus === "eligible_and_relevant");

  const telemetryBase: SufficiencyTelemetry = {
    duplicatesRemoved,
    eligibleCount,
    ineligibleCount,
    prefilterSkippedCount,
    relevanceMechanismFailureCount: mechanismFailureCount,
    relevantSubsetCount: relevantSubset.length,
    facetCount: facetOutcome.facets.length,
  };

  // Gate A. A total source-expansion infrastructure failure (every
  // attempted lookup query failed outright) that leaves the relevant
  // subset empty is an internal fault, not an honest "no relevant
  // evidence" — we were never able to establish content availability for
  // the candidate set at all, which is a different claim from "the
  // content does not exist." If some candidates (e.g. principles, which
  // need no expansion) still produced a usable relevant subset despite
  // the failure, that is not misrepresented as evidence absence either
  // way — the request proceeds normally on what was actually
  // establishable. Only an empty subset caused by a total failure is
  // escalated here; a genuinely empty subset with no expansion failure
  // is unchanged, still an honest insufficiency.
  if (relevantSubset.length === 0 && sourceExpansionTotalFailure) {
    console.error("[advisor] source-expansion total infrastructure failure produced an empty relevant subset");
    return {
      evidenceSet: {
        allCandidates: evidence,
        relevantSubset: [],
        facetIdentificationStatus: facetOutcome.status,
        facets: facetOutcome.facets,
        sufficiency: null,
        outcome: "internal_fault",
      },
      telemetry: telemetryBase,
    };
  }

  if (relevantSubset.length === 0) {
    return {
      evidenceSet: {
        allCandidates: evidence,
        relevantSubset: [],
        facetIdentificationStatus: facetOutcome.status,
        facets: facetOutcome.facets,
        sufficiency: null,
        outcome: "insufficient_no_relevant_evidence",
      },
      telemetry: telemetryBase,
    };
  }

  // Gate B — evaluated on the relevant subset only.
  const { gateB, coherenceChecks } = await evaluateConflictAndCoherence(question, relevantSubset);

  if (gateB === "fail") {
    return {
      evidenceSet: {
        allCandidates: evidence,
        relevantSubset,
        facetIdentificationStatus: facetOutcome.status,
        facets: facetOutcome.facets,
        sufficiency: null,
        outcome: "insufficient_conflict",
      },
      telemetry: telemetryBase,
    };
  }

  // A total facet-identification failure is a system fault, never
  // "coverage trivially satisfied" — see §G/§K's explicit treatment.
  if (facetOutcome.status === "failed") {
    return {
      evidenceSet: {
        allCandidates: evidence,
        relevantSubset,
        facetIdentificationStatus: "failed",
        facets: [],
        sufficiency: null,
        outcome: "internal_fault",
      },
      telemetry: telemetryBase,
    };
  }

  const coverageChecks = await evaluateCoverage(facetOutcome.facets, relevantSubset);
  const applicableCoverage = coverageChecks.filter((check) => check.result !== "unknown");
  // coherenceChecks never carries "unknown" by construction — a pair that
  // could not be classified is fail-closed to "contradictory" at Gate B
  // and never reaches this point (see conflictAndCoherence.ts).
  const applicableTotal = applicableCoverage.length + coherenceChecks.length;

  // N = 0: never a valid sufficiency evaluation, regardless of cause
  // (total facet-identification failure is handled above; this branch
  // covers the case where facets were identified but every single
  // facet's coverage judgment came back "unknown" and there were no
  // source pairs to fall back on). Routed to internal_fault, not to
  // vacuous "sufficient".
  if (applicableTotal === 0) {
    return {
      evidenceSet: {
        allCandidates: evidence,
        relevantSubset,
        facetIdentificationStatus: facetOutcome.status,
        facets: facetOutcome.facets,
        sufficiency: null,
        outcome: "internal_fault",
      },
      telemetry: telemetryBase,
    };
  }

  const required = requiredPasses(applicableTotal);
  const actualPasses =
    applicableCoverage.filter((c) => c.result === "pass").length +
    coherenceChecks.filter((c) => c.result === "pass").length;

  const sufficiencyOutcome: "sufficient" | "insufficient" = actualPasses >= required ? "sufficient" : "insufficient";

  const sufficiency: SufficiencyResult = {
    gateA: "pass",
    gateB: "pass",
    coverageChecks,
    coherenceChecks,
    applicableTotal,
    requiredPasses: required,
    actualPasses,
    outcome: sufficiencyOutcome,
    rationale:
      sufficiencyOutcome === "sufficient"
        ? `${actualPasses}/${applicableTotal} applicable sub-checks passed (required ${required}).`
        : `Only ${actualPasses}/${applicableTotal} applicable sub-checks passed (required ${required}).`,
  };

  return {
    evidenceSet: {
      allCandidates: evidence,
      relevantSubset,
      facetIdentificationStatus: facetOutcome.status,
      facets: facetOutcome.facets,
      sufficiency,
      outcome: sufficiencyOutcome === "sufficient" ? "sufficient" : "insufficient_coverage_or_coherence",
    },
    telemetry: telemetryBase,
  };
}
