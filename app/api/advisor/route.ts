import { retrieve } from "@/lib/retrieval/index";
import { evaluateSufficiency } from "@/lib/advisor/sufficiency";
import { buildGroundedContext, buildAuthoritativeSources } from "@/lib/advisor/groundedContext";
import { generateAnswer } from "@/lib/advisor/generationProvider";
import { checkAndRecordRequest } from "@/lib/advisor/rateLimit";

// ES-012 Implementation Specification §P — CTO-ratified route, method,
// request/response contracts, and status semantics. §A's pipeline order:
// validation -> rate limit -> retrieve() -> eligibility/sufficiency ->
// grounded context -> generation.

const MAX_QUESTION_LENGTH = 2_000; // CTO-ratified.

interface AdvisorPayload {
  question?: unknown;
}

// RED-1 fix, audited: the platform this repository documents as its
// deployment target is Vercel (README.md's "Deploy on Vercel" section;
// .env.example's own CRON_SECRET comment references Vercel Cron
// directly) — no other reverse proxy or CDN is documented anywhere in
// this repository. Per the standard `X-Forwarded-For` convention (each
// hop APPENDS the address it observed the connection coming from to the
// end of the existing list before forwarding), the LAST entry is always
// added by the proxy closest to the running application — for a request
// reaching this Route Handler directly from Vercel's edge, that is
// Vercel's own observation of the connecting IP, which a client cannot
// override merely by sending a crafted header value at the front of the
// list. The FIRST entry, by contrast, is whatever the client (or any
// intermediate hop) chose to send, and is exactly the value the prior
// implementation used — the actual bypass this fix closes. Sanctum's
// login route has the identical first-value bug; it is deliberately left
// unchanged here, per instruction to prefer an Advisor-local fix over
// touching Sanctum.
//
// This is not a mathematically absolute guarantee: if this application
// were ever deployed behind an additional, undocumented reverse proxy in
// front of Vercel that is itself attacker-influenceable, the "last"
// entry could stop being trustworthy. Nothing in this repository
// documents or implies such a topology; if that assumption changes, this
// function needs re-review.
function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) return "unknown";
  const parts = forwardedFor.split(",");
  const last = parts[parts.length - 1]?.trim();
  return last && last.length > 0 ? last : "unknown";
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  // §B — request validation, first.
  let payload: AdvisorPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const { question } = payload;

  if (typeof question !== "string") {
    return Response.json({ success: false, error: "A question is required." }, { status: 400 });
  }

  const trimmedQuestion = question.trim();
  if (trimmedQuestion.length === 0) {
    return Response.json({ success: false, error: "A question is required." }, { status: 400 });
  }
  if (trimmedQuestion.length > MAX_QUESTION_LENGTH) {
    return Response.json(
      { success: false, error: `Question must be ${MAX_QUESTION_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  // §Q — rate limiting, before retrieve() is ever called.
  const clientKey = getClientKey(request);
  const rateLimitCheck = checkAndRecordRequest(clientKey);
  if (!rateLimitCheck.allowed) {
    return Response.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimitCheck.retryAfterSeconds) } }
    );
  }

  // §C — retrieval boundary. matchCount: 10 is explicit, per the CTO-ratified decision.
  const retrievalOutcome = await retrieve(trimmedQuestion, { matchCount: 10 });

  if (!retrievalOutcome.ok) {
    // RFC-007 state 1, Retrieval Failure. Never presented as insufficient
    // evidence — there is no evidence to judge at all.
    console.error("[advisor] retrieval failure", { stage: retrievalOutcome.stage });
    return Response.json(
      { success: false, error: "We could not process your question right now. Please try again." },
      { status: 502 }
    );
  }

  // §D-§L — eligibility, Gate A, Gate B, Coverage/Coherence, the 80%
  // evaluation. Pre-filter left at its default (disabled) — see
  // lib/advisor/prefilter.ts.
  let evaluation;
  try {
    evaluation = await evaluateSufficiency(trimmedQuestion, retrievalOutcome.data.candidates);
  } catch (error) {
    // A thrown error here (e.g. OPENAI_API_KEY missing) is an
    // infrastructure fault during evidence processing — never silently
    // presented as an honest "insufficient evidence" (§S).
    console.error("[advisor] evidence-processing infrastructure fault", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return Response.json(
      { success: false, error: "We could not process your question right now. Please try again." },
      { status: 500 }
    );
  }

  const { evidenceSet, telemetry } = evaluation;

  // Structural telemetry only — never raw question text, full source
  // content, or the generated answer (§R).
  console.log("[advisor] evidence evaluation complete", {
    latencyMs: Date.now() - startedAt,
    candidateCount: retrievalOutcome.data.candidates.length,
    duplicatesRemoved: telemetry.duplicatesRemoved,
    eligibleCount: telemetry.eligibleCount,
    ineligibleCount: telemetry.ineligibleCount,
    prefilterSkippedCount: telemetry.prefilterSkippedCount,
    relevanceMechanismFailureCount: telemetry.relevanceMechanismFailureCount,
    relevantSubsetCount: telemetry.relevantSubsetCount,
    facetCount: telemetry.facetCount,
    gateA: evidenceSet.sufficiency?.gateA ?? (telemetry.relevantSubsetCount > 0 ? "pass" : "fail"),
    gateB: evidenceSet.sufficiency?.gateB ?? null,
    applicableTotal: evidenceSet.sufficiency?.applicableTotal ?? null,
    requiredPasses: evidenceSet.sufficiency?.requiredPasses ?? null,
    actualPasses: evidenceSet.sufficiency?.actualPasses ?? null,
    outcome: evidenceSet.outcome,
  });

  if (evidenceSet.outcome === "internal_fault") {
    console.error("[advisor] internal fault in evidence-processing pipeline", {
      facetIdentificationStatus: evidenceSet.facetIdentificationStatus,
    });
    return Response.json(
      { success: false, error: "We could not process your question right now. Please try again." },
      { status: 500 }
    );
  }

  if (evidenceSet.outcome !== "sufficient") {
    // insufficient_no_relevant_evidence / insufficient_conflict /
    // insufficient_coverage_or_coherence all collapse to the same public
    // contract (§P) — these remain internal diagnostics only, already
    // captured in the structural log above.
    return Response.json({ success: true, outcome: "insufficient_evidence" });
  }

  // §M — grounded context construction. Only relevantSubset, only now
  // that outcome is confirmed "sufficient".
  const groundedContext = buildGroundedContext(trimmedQuestion, evidenceSet);

  // §N — generation. Exactly one attempt, no retry.
  const generationResult = await generateAnswer(groundedContext);

  if (!generationResult.ok) {
    console.error("[advisor] generation failure", { status: generationResult.status });
    return Response.json(
      { success: false, error: "We could not generate an answer right now. Please try again." },
      { status: 502 }
    );
  }

  console.log("[advisor] generation complete", {
    latencyMs: Date.now() - startedAt,
    usage: generationResult.usage ?? null,
  });

  // §N/§O — source identity is never delegated to the model. Every cited
  // slug is cross-checked against EvidenceSet.relevantSubset. RED-2 fix:
  // if nothing the model cited can be confirmed (empty, malformed, or
  // entirely unauthorized), this is treated as an invalid grounded
  // response — the same 502 path as a provider error — rather than
  // silently presenting the full relevant-subset as if it all supported
  // the answer.
  const authoritativeSources = buildAuthoritativeSources(evidenceSet, generationResult.citedSlugs);

  if (!authoritativeSources.ok) {
    console.error("[advisor] generation produced no confirmable source citations", {
      reason: authoritativeSources.reason,
    });
    return Response.json(
      { success: false, error: "We could not generate a properly grounded answer right now. Please try again." },
      { status: 502 }
    );
  }

  return Response.json({
    success: true,
    outcome: "sufficient",
    answer: generationResult.answer,
    sources: authoritativeSources.sources,
  });
}
